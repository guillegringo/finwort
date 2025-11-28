"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

export function TradesTable({ trades }: { trades: Trade[] }) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    async function handleDelete(id: string) {
        if (!confirm("¿Estás seguro de eliminar este trade?")) return;
        
        setDeletingId(id);
        try {
            const { error } = await supabase.from("trades").delete().eq("id", id);
            if (error) throw error;
            toast.success("Trade eliminado");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setDeletingId(null);
        }
    }

    // Calculate totals
    const totalInvestedUsd = trades
        .filter(t => t.side === "BUY")
        .reduce((sum, t) => sum + t.amount_usd, 0);
    const totalSoldUsd = trades
        .filter(t => t.side === "SELL")
        .reduce((sum, t) => sum + t.amount_usd, 0);

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-card rounded-lg border">
                    <div className="text-sm text-muted-foreground">Total Compras</div>
                    <div className="text-xl font-bold text-green-600">{formatCurrency(totalInvestedUsd)}</div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                    <div className="text-sm text-muted-foreground">Total Ventas</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(totalSoldUsd)}</div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                    <div className="text-sm text-muted-foreground">Neto Invertido</div>
                    <div className="text-xl font-bold">{formatCurrency(totalInvestedUsd - totalSoldUsd)}</div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="h-11 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                                <th className="h-11 px-4 text-left align-middle font-medium text-muted-foreground">Ticker</th>
                                <th className="h-11 px-4 text-center align-middle font-medium text-muted-foreground">Tipo</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Cantidad</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Total ARS</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">FX</th>
                                <th className="h-11 px-4 text-right align-middle font-medium text-muted-foreground">Total USD</th>
                                <th className="h-11 px-4 text-center align-middle font-medium text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {trades.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        No hay trades registrados. ¡Agregá tu primer trade!
                                    </td>
                                </tr>
                            ) : (
                                trades.map((trade) => (
                                    <tr key={trade.id} className="border-b transition-colors hover:bg-muted/30">
                                        <td className="p-4 align-middle text-muted-foreground">
                                            {format(new Date(trade.trade_date), "d MMM yyyy", { locale: es })}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${trade.side === "BUY" ? "bg-green-500" : "bg-red-500"}`} />
                                                <span className="font-semibold">{trade.instrument_symbol}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-center">
                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                {trade.instrument_type}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right font-mono">
                                            <span className={trade.side === "BUY" ? "text-green-600" : "text-red-600"}>
                                                {trade.side === "BUY" ? "+" : "-"}{trade.quantity}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right font-mono">
                                            {formatCurrency(trade.amount_ars, "ARS")}
                                        </td>
                                        <td className="p-4 align-middle text-right text-xs text-muted-foreground">
                                            <div>{trade.fx_source}</div>
                                            <div className="font-mono">${trade.fx_rate.toFixed(0)}</div>
                                        </td>
                                        <td className="p-4 align-middle text-right font-mono font-semibold">
                                            {formatCurrency(trade.amount_usd)}
                                        </td>
                                        <td className="p-4 align-middle text-center">
                                            <button
                                                onClick={() => handleDelete(trade.id)}
                                                disabled={deletingId === trade.id}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
