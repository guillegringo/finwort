"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportRow = {
    id: string;
    instrument_symbol: string;
    instrument_type: string;
    side: "BUY" | "SELL";
    quantity: string;
    amount_ars: string;
    fx_source: string;
    fx_rate: string;
    trade_date: string;
};

export default function ImportPage() {
    const [rows, setRows] = useState<ImportRow[]>([
        {
            id: "1",
            instrument_symbol: "",
            instrument_type: "STOCK",
            side: "BUY",
            quantity: "",
            amount_ars: "",
            fx_source: "MEP",
            fx_rate: "",
            trade_date: new Date().toISOString().split("T")[0],
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const addRow = () => {
        setRows([
            ...rows,
            {
                id: Math.random().toString(36).substr(2, 9),
                instrument_symbol: "",
                instrument_type: "STOCK",
                side: "BUY",
                quantity: "",
                amount_ars: "",
                fx_source: "MEP",
                fx_rate: "",
                trade_date: new Date().toISOString().split("T")[0],
            },
        ]);
    };

    const removeRow = (id: string) => {
        if (rows.length > 1) {
            setRows(rows.filter((r) => r.id !== id));
        }
    };

    const updateRow = (id: string, field: keyof ImportRow, value: string) => {
        setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("Not authenticated");

            const trades = rows.map((row) => {
                const qty = parseFloat(row.quantity);
                const ars = parseFloat(row.amount_ars);
                const rate = parseFloat(row.fx_rate);

                if (!row.instrument_symbol || isNaN(qty) || isNaN(ars) || isNaN(rate)) {
                    throw new Error("Please fill in all fields correctly");
                }

                return {
                    user_id: user.id,
                    instrument_symbol: row.instrument_symbol.toUpperCase(),
                    instrument_type: row.instrument_type,
                    side: row.side,
                    quantity: qty,
                    amount_ars: ars,
                    fx_source: row.fx_source,
                    fx_rate: rate,
                    amount_usd: ars / rate,
                    trade_date: new Date(row.trade_date).toISOString(),
                };
            });

            const { error } = await supabase.from("trades").insert(trades);
            if (error) throw error;

            toast.success(`Successfully imported ${trades.length} trades`);
            router.push("/trades");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Import Investments</h1>
                <p className="text-muted-foreground">
                    Bulk add your past trades to rebuild your portfolio history.
                </p>
            </div>

            <div className="rounded-md border bg-card">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">Symbol</th>
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">Side</th>
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">Qty</th>
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">Amount (ARS)</th>
                                <th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground">FX Rate</th>
                                <th className="h-12 px-2 text-center align-middle font-medium text-muted-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {rows.map((row) => (
                                <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-2 align-middle">
                                        <input
                                            value={row.instrument_symbol}
                                            onChange={(e) => updateRow(row.id, "instrument_symbol", e.target.value)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                            placeholder="AAPL"
                                        />
                                    </td>
                                    <td className="p-2 align-middle">
                                        <select
                                            value={row.instrument_type}
                                            onChange={(e) => updateRow(row.id, "instrument_type", e.target.value)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                        >
                                            <option value="STOCK">Stock</option>
                                            <option value="CEDEAR">CEDEAR</option>
                                            <option value="BOND">Bond</option>
                                            <option value="CRYPTO">Crypto</option>
                                        </select>
                                    </td>
                                    <td className="p-2 align-middle">
                                        <select
                                            value={row.side}
                                            onChange={(e) => updateRow(row.id, "side", e.target.value as any)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                        >
                                            <option value="BUY">Buy</option>
                                            <option value="SELL">Sell</option>
                                        </select>
                                    </td>
                                    <td className="p-2 align-middle">
                                        <input
                                            type="date"
                                            value={row.trade_date}
                                            onChange={(e) => updateRow(row.id, "trade_date", e.target.value)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                        />
                                    </td>
                                    <td className="p-2 align-middle">
                                        <input
                                            type="number"
                                            value={row.quantity}
                                            onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-2 align-middle">
                                        <input
                                            type="number"
                                            value={row.amount_ars}
                                            onChange={(e) => updateRow(row.id, "amount_ars", e.target.value)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-2 align-middle">
                                        <input
                                            type="number"
                                            value={row.fx_rate}
                                            onChange={(e) => updateRow(row.id, "fx_rate", e.target.value)}
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                            placeholder="1000"
                                        />
                                    </td>
                                    <td className="p-2 align-middle text-center">
                                        <button
                                            onClick={() => removeRow(row.id)}
                                            className="text-destructive hover:bg-destructive/10 p-1 rounded-md"
                                            disabled={rows.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t bg-muted/50 flex justify-between">
                    <button
                        onClick={addRow}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Row
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn(
                            "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                        )}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Trades
                    </button>
                </div>
            </div>
        </div>
    );
}
