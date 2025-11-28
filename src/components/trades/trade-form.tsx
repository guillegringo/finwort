"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { getDolarRates, type DolarRate } from "@/lib/dolarapi";
import { cn, formatCurrency } from "@/lib/utils";

const tradeSchema = z.object({
    instrument_symbol: z.string().min(1, "Symbol is required").toUpperCase(),
    instrument_type: z.enum(["STOCK", "CRYPTO", "BOND", "CEDEAR"]),
    side: z.enum(["BUY", "SELL"]),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    price: z.coerce.number().positive("Price must be positive"),
    currency: z.enum(["ARS", "USD"]),
    trade_date: z.string(),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

export function TradeForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [rates, setRates] = useState<DolarRate[]>([]);
    const [fetchingRates, setFetchingRates] = useState(false);
    const [defaultFxSource, setDefaultFxSource] = useState("MEP");
    const router = useRouter();
    const supabase = createClient();

    const form = useForm<TradeFormValues>({
        resolver: zodResolver(tradeSchema),
        defaultValues: {
            instrument_type: "STOCK",
            side: "BUY",
            currency: "ARS",
            trade_date: new Date().toISOString().split("T")[0],
        },
    });

    const { watch, handleSubmit } = form;
    const price = watch("price");
    const quantity = watch("quantity");
    const currency = watch("currency");

    // Fetch user's default FX source
    useEffect(() => {
        async function loadProfile() {
            const { data } = await supabase.from("profiles").select("default_fx_source").single();
            if (data?.default_fx_source) {
                setDefaultFxSource(data.default_fx_source);
            }
        }
        loadProfile();
        fetchRates();
    }, []);

    async function fetchRates() {
        setFetchingRates(true);
        try {
            const data = await getDolarRates();
            setRates(data);
        } catch (error) {
            toast.error("Failed to fetch rates");
        } finally {
            setFetchingRates(false);
        }
    }

    function getFxRate(): number {
        if (currency === "USD") return 1;

        // Find the rate based on default FX source
        const rate = rates.find(
            (r) => r.nombre === defaultFxSource || r.casa === defaultFxSource.toLowerCase()
        );
        return rate?.venta || 1000; // Fallback to 1000 if not found
    }

    // Calculate total in ARS and USD
    const totalPrice = (price || 0) * (quantity || 0);
    const fxRate = getFxRate();
    const totalArs = currency === "ARS" ? totalPrice : totalPrice * fxRate;
    const totalUsd = currency === "USD" ? totalPrice : totalPrice / fxRate;

    async function onSubmit(data: TradeFormValues) {
        setIsLoading(true);
        try {
            const currentFxRate = getFxRate();
            const amountArs = data.currency === "ARS"
                ? data.price * data.quantity
                : (data.price * data.quantity) * currentFxRate;
            const amountUsd = data.currency === "USD"
                ? data.price * data.quantity
                : (data.price * data.quantity) / currentFxRate;

            const { error } = await supabase.from("trades").insert({
                instrument_symbol: data.instrument_symbol,
                instrument_type: data.instrument_type,
                side: data.side,
                quantity: data.quantity,
                amount_ars: amountArs,
                fx_source: data.currency === "USD" ? "USD" : defaultFxSource,
                fx_rate: currentFxRate,
                amount_usd: amountUsd,
                trade_date: new Date(data.trade_date).toISOString(),
                user_id: (await supabase.auth.getUser()).data.user?.id!,
            });

            if (error) throw error;

            toast.success("Trade saved successfully");
            router.push("/trades");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto p-6 bg-card rounded-xl border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Ticker</label>
                    <input
                        {...form.register("instrument_symbol")}
                        placeholder="e.g. AAPL, BTC, AL30"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase"
                    />
                    {form.formState.errors.instrument_symbol && (
                        <p className="text-xs text-destructive">{form.formState.errors.instrument_symbol.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Instrumento</label>
                    <select
                        {...form.register("instrument_type")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="STOCK">Stock</option>
                        <option value="CEDEAR">CEDEAR</option>
                        <option value="BOND">Bono</option>
                        <option value="CRYPTO">Crypto</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Operación</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 border rounded-md p-2 flex-1 cursor-pointer hover:bg-muted/50">
                            <input type="radio" value="BUY" {...form.register("side")} />
                            <span className="font-medium text-green-600">Compra</span>
                        </label>
                        <label className="flex items-center gap-2 border rounded-md p-2 flex-1 cursor-pointer hover:bg-muted/50">
                            <input type="radio" value="SELL" {...form.register("side")} />
                            <span className="font-medium text-red-600">Venta</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha</label>
                    <input
                        type="date"
                        {...form.register("trade_date")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Cantidad</label>
                    <input
                        type="number"
                        step="any"
                        {...form.register("quantity")}
                        placeholder="0"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {form.formState.errors.quantity && (
                        <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Precio Unitario</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="any"
                            {...form.register("price")}
                            placeholder="0.00"
                            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <select
                            {...form.register("currency")}
                            className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    {form.formState.errors.price && (
                        <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
                    )}
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">FX Rate ({defaultFxSource}):</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{fxRate.toFixed(2)} ARS/USD</span>
                        <button
                            type="button"
                            onClick={fetchRates}
                            disabled={fetchingRates}
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                            <RefreshCw className={cn("h-3 w-3", fetchingRates && "animate-spin")} />
                        </button>
                    </div>
                </div>
                <div className="h-px bg-border"></div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total en ARS:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalArs, "ARS")}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total en USD:</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(totalUsd)}</span>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className={cn(
                    "w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    "bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
                )}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Trade
            </button>
        </form>
    );
}
