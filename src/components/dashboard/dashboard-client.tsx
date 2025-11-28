"use client";

import { formatCurrency } from "@/lib/utils";
import { type Portfolio, type Position } from "@/lib/portfolio";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LivePrice {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    name: string;
}

interface DashboardClientProps {
    portfolio: Portfolio;
    livePrices: LivePrice[];
    mepRate: number;
}

export function DashboardClient({ portfolio, livePrices, mepRate }: DashboardClientProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Create a map for quick lookup
    const priceMap = new Map(livePrices.map(p => [p.symbol, p]));

    return (
        <div className="space-y-6">
            {/* Live Prices Section */}
            {livePrices.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                        <h3 className="font-semibold">Cotizaciones en Tiempo Real</h3>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="text-xs text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {livePrices.map((price) => (
                            <div key={price.symbol} className="p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm">{price.symbol}</span>
                                    {price.changePercent >= 0 ? (
                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                    )}
                                </div>
                                <div className="text-lg font-bold">${price.price.toFixed(2)}</div>
                                <div className={`text-xs ${price.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Positions Table */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-semibold">Posiciones</h3>
                </div>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="bg-muted/20">
                            <tr>
                                <th className="h-11 px-4 text-left align-middle font-medium text-muted-foreground">Ticker</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Cantidad</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Costo Prom.</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Precio Actual</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Valor</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">P/L</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">%</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {portfolio.positions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        No tenés posiciones abiertas. ¡Agregá tu primer trade!
                                    </td>
                                </tr>
                            ) : (
                                portfolio.positions.map((position) => (
                                    <PositionRow 
                                        key={position.instrument_symbol} 
                                        position={position}
                                        livePrice={priceMap.get(position.instrument_symbol)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Allocation Chart (simple) */}
            {portfolio.positions.length > 0 && (
                <div className="rounded-xl border bg-card p-6">
                    <h3 className="font-semibold mb-4">Distribución del Portfolio</h3>
                    <div className="space-y-3">
                        {portfolio.positions.map((position) => (
                            <div key={position.instrument_symbol} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{position.instrument_symbol}</span>
                                    <span className="text-muted-foreground">
                                        {position.allocation_percent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${Math.min(position.allocation_percent, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PositionRow({ position, livePrice }: { position: Position; livePrice?: LivePrice }) {
    const isProfit = position.unrealized_pl_usd >= 0;
    
    return (
        <tr className="border-b transition-colors hover:bg-muted/30">
            <td className="p-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-semibold">{position.instrument_symbol}</span>
                    <span className="text-xs text-muted-foreground">
                        {position.instrument_type}
                        {position.cedear_ratio && ` (${position.cedear_ratio}:1)`}
                    </span>
                </div>
            </td>
            <td className="p-4 align-middle text-right font-mono">
                {position.quantity}
            </td>
            <td className="p-4 align-middle text-right font-mono">
                {formatCurrency(position.avg_cost_per_unit_usd)}
            </td>
            <td className="p-4 align-middle text-right">
                <div className="font-mono font-medium">
                    {formatCurrency(position.current_price_usd)}
                </div>
                {livePrice && (
                    <div className={`text-xs ${livePrice.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {livePrice.changePercent >= 0 ? '↑' : '↓'} {Math.abs(livePrice.changePercent).toFixed(2)}%
                    </div>
                )}
            </td>
            <td className="p-4 align-middle text-right font-mono font-semibold">
                {formatCurrency(position.current_value_usd)}
            </td>
            <td className={`p-4 align-middle text-right font-mono font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{formatCurrency(position.unrealized_pl_usd)}
            </td>
            <td className={`p-4 align-middle text-right font-mono ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{position.unrealized_pl_percent.toFixed(2)}%
            </td>
        </tr>
    );
}
