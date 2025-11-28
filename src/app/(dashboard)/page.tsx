import { createClient } from "@/lib/supabase/server";
import { calculatePortfolio, getUniqueSymbols } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/utils";
import { getDolarRates } from "@/lib/dolarapi";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getMultipleStockPrices } from "@/lib/prices";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target } from "lucide-react";

export const dynamic = "force-dynamic"; // Always fetch fresh data

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: trades } = await supabase.from("trades").select("*");

    // Get unique symbols from trades
    const symbols = getUniqueSymbols(trades || []);
    
    // Fetch live prices from Yahoo Finance
    const livePricesMap = await getMultipleStockPrices(symbols);
    
    // Convert to simple Map<string, number>
    const pricesMap = new Map<string, number>();
    livePricesMap.forEach((quote, symbol) => {
        pricesMap.set(symbol, quote.price);
    });

    // Fetch current MEP rate for display
    const rates = await getDolarRates();
    const mepRate = rates.find((r) => r.casa === "bolsa")?.venta || 1200;

    // Calculate portfolio with live prices
    const portfolio = calculatePortfolio(trades || [], pricesMap, mepRate);

    // Prepare live prices data for client
    const livePricesData = Array.from(livePricesMap.entries()).map(([symbol, quote]) => ({
        symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        name: quote.name,
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Tu rendimiento en dólares • MEP: ${mepRate.toFixed(0)}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-card p-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Valor Actual
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(portfolio.total_value_usd)}</div>
                </div>
                
                <div className="rounded-xl border bg-card p-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <PiggyBank className="h-4 w-4" />
                        Invertido
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(portfolio.total_cost_basis_usd)}</div>
                </div>
                
                <div className="rounded-xl border bg-card p-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        {portfolio.total_unrealized_pl_usd >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        Ganancia/Pérdida
                    </div>
                    <div className={`text-2xl font-bold ${portfolio.total_unrealized_pl_usd >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {portfolio.total_unrealized_pl_usd >= 0 ? "+" : ""}{formatCurrency(portfolio.total_unrealized_pl_usd)}
                    </div>
                </div>
                
                <div className="rounded-xl border bg-card p-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Rendimiento
                    </div>
                    <div className={`text-2xl font-bold ${portfolio.total_unrealized_pl_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {portfolio.total_unrealized_pl_percent >= 0 ? "+" : ""}{portfolio.total_unrealized_pl_percent.toFixed(2)}%
                    </div>
                </div>
            </div>

            <DashboardClient 
                portfolio={portfolio} 
                livePrices={livePricesData}
                mepRate={mepRate}
            />
        </div>
    );
}
