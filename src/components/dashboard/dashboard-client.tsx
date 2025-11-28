"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { type Portfolio, type Position } from "@/lib/portfolio";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export function DashboardClient({ portfolio }: { portfolio: Portfolio }) {
    const [editingPrice, setEditingPrice] = useState<string | null>(null);
    const [newPrice, setNewPrice] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const handleEditPrice = (position: Position) => {
        setEditingPrice(position.instrument_symbol);
        setNewPrice(position.current_price_usd.toString());
    };

    const handleSavePrice = async (symbol: string) => {
        setIsSaving(true);
        try {
            const price = parseFloat(newPrice);
            if (isNaN(price)) throw new Error("Invalid price");

            const { error } = await supabase.from("prices").upsert({
                user_id: (await supabase.auth.getUser()).data.user?.id!,
                instrument_symbol: symbol,
                price: price,
                currency: "USD",
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;

            toast.success("Price updated");
            setEditingPrice(null);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex flex-col gap-4">
                <h3 className="font-semibold leading-none tracking-tight">Positions</h3>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Instrument</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Quantity</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Avg Cost (USD)</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Price (USD)</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Value (USD)</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">P/L (USD)</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {portfolio.positions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                        No active positions.
                                    </td>
                                </tr>
                            ) : (
                                portfolio.positions.map((position) => (
                                    <tr key={position.instrument_symbol} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">
                                            <div className="flex flex-col">
                                                <span>{position.instrument_symbol}</span>
                                                <span className="text-xs text-muted-foreground">{position.instrument_type}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-right">{position.quantity}</td>
                                        <td className="p-4 align-middle text-right">
                                            {formatCurrency(position.cost_basis_usd / position.quantity)}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            {editingPrice === position.instrument_symbol ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="number"
                                                        value={newPrice}
                                                        onChange={(e) => setNewPrice(e.target.value)}
                                                        className="w-24 h-8 rounded-md border border-input bg-background px-2 text-sm"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSavePrice(position.instrument_symbol)}
                                                        disabled={isSaving}
                                                        className="p-1 hover:bg-muted rounded-md"
                                                    >
                                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditPrice(position)}
                                                    className="hover:underline decoration-dashed underline-offset-4"
                                                >
                                                    {formatCurrency(position.current_price_usd)}
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium">{formatCurrency(position.current_value_usd)}</td>
                                        <td className={`p-4 align-middle text-right font-medium ${position.unrealized_pl_usd >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {formatCurrency(position.unrealized_pl_usd)}
                                            <div className="text-xs font-normal text-muted-foreground">
                                                {((position.unrealized_pl_usd / position.cost_basis_usd) * 100).toFixed(2)}%
                                            </div>
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
