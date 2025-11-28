"use client";

import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Database } from "@/types/supabase";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

export function TradesTable({ trades }: { trades: Trade[] }) {
    return (
        <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Instrument</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Side</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Quantity</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Price (ARS)</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">FX Rate</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Total (USD)</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {trades.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-4 text-center text-muted-foreground">
                                    No trades found.
                                </td>
                            </tr>
                        ) : (
                            trades.map((trade) => (
                                <tr key={trade.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{format(new Date(trade.trade_date), "MMM d, yyyy")}</td>
                                    <td className="p-4 align-middle font-medium">{trade.instrument_symbol}</td>
                                    <td className="p-4 align-middle text-muted-foreground text-xs">{trade.instrument_type}</td>
                                    <td className="p-4 align-middle">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${trade.side === "BUY"
                                                    ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400"
                                                    : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400"
                                                }`}
                                        >
                                            {trade.side}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-right">{trade.quantity}</td>
                                    <td className="p-4 align-middle text-right">{formatCurrency(trade.amount_ars / trade.quantity, "ARS")}</td>
                                    <td className="p-4 align-middle text-right">{formatCurrency(trade.fx_rate, "ARS")}</td>
                                    <td className="p-4 align-middle text-right font-medium">{formatCurrency(trade.amount_usd)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
