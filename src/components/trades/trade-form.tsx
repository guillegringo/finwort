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
import { TickerSearch } from "./ticker-search";

const tradeSchema = z.object({
    instrument_symbol: z.string().min(1, "Ticker requerido"),
    instrument_type: z.enum(["CEDEAR", "STOCK", "CRYPTO", "BOND", "FCI"]),
    side: z.enum(["BUY", "SELL"]),
    quantity: z.coerce.number().positive("Cantidad debe ser positiva"),
    total_ars: z.coerce.number().positive("Monto debe ser positivo"),
    trade_date: z.string(),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

export function TradeForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [rates, setRates] = useState<DolarRate[]>([]);
    const [fetchingRates, setFetchingRates] = useState(false);
    const [selectedFxSource, setSelectedFxSource] = useState("bolsa"); // MEP by default
    const router = useRouter();
    const supabase = createClient();

    const form = useForm<TradeFormValues>({
        resolver: zodResolver(tradeSchema),
        defaultValues: {
            instrument_type: "CEDEAR",
            side: "BUY",
            trade_date: new Date().toISOString().split("T")[0],
        },
    });

    const { watch, handleSubmit } = form;
    const totalArs = watch("total_ars") || 0;
    const quantity = watch("quantity") || 0;

    useEffect(() => {
        fetchRates();
    }, []);

    async function fetchRates() {
        setFetchingRates(true);
        try {
            const data = await getDolarRates();
            setRates(data);
        } catch (error) {
            toast.error("Error al obtener cotizaciones");
        } finally {
            setFetchingRates(false);
        }
    }

    // Get current FX rate based on selected source
    function getFxRate(): number {
        const rate = rates.find((r) => r.casa === selectedFxSource);
        return rate?.venta || 1200; // Fallback
    }

    const fxRate = getFxRate();
    const totalUsd = totalArs / fxRate;
    const pricePerUnitArs = quantity > 0 ? totalArs / quantity : 0;
    const pricePerUnitUsd = quantity > 0 ? totalUsd / quantity : 0;

    async function onSubmit(data: TradeFormValues) {
        setIsLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError || !userData.user) {
                throw new Error("No estás autenticado. Por favor, inicia sesión nuevamente.");
            }

            const currentFxRate = getFxRate();
            const amountUsd = data.total_ars / currentFxRate;

            // Get the readable name for the FX source
            const fxSourceName = rates.find(r => r.casa === selectedFxSource)?.nombre || "MEP";

            const tradeData = {
                instrument_symbol: data.instrument_symbol.toUpperCase(),
                instrument_type: data.instrument_type,
                side: data.side,
                quantity: data.quantity,
                amount_ars: data.total_ars,
                fx_source: fxSourceName,
                fx_rate: currentFxRate,
                amount_usd: amountUsd,
                trade_date: new Date(data.trade_date).toISOString(),
                user_id: userData.user.id,
            };

            const { error } = await supabase.from("trades").insert(tradeData);

            if (error) throw error;

            toast.success("Trade guardado!");
            router.push("/trades");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl mx-auto">
            {/* Instrument Info */}
            <div className="p-6 bg-card rounded-xl border shadow-sm space-y-4">
                <h3 className="font-semibold text-lg">Instrumento</h3>
                
                {/* Step 1: Select Type */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">1. Tipo de Instrumento</label>
                    <div className="grid grid-cols-5 gap-2">
                        {[
                            { value: "CEDEAR", label: "CEDEAR", icon: "🇺🇸" },
                            { value: "STOCK", label: "Merval", icon: "🇦🇷" },
                            { value: "BOND", label: "Bono", icon: "📜" },
                            { value: "CRYPTO", label: "Crypto", icon: "₿" },
                            { value: "FCI", label: "FCI", icon: "📊" },
                        ].map((type) => (
                            <label
                                key={type.value}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 border rounded-lg p-3 cursor-pointer transition-all text-center",
                                    form.watch("instrument_type") === type.value
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <input
                                    type="radio"
                                    value={type.value}
                                    {...form.register("instrument_type")}
                                    className="sr-only"
                                />
                                <span className="text-lg">{type.icon}</span>
                                <span className="text-xs font-medium">{type.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Step 2: Search Ticker */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">2. Buscar Ticker</label>
                    <TickerSearch
                        value={form.watch("instrument_symbol") || ""}
                        onChange={(symbol) => {
                            form.setValue("instrument_symbol", symbol);
                        }}
                        instrumentType={form.watch("instrument_type") as any}
                    />
                    {form.formState.errors.instrument_symbol && (
                        <p className="text-xs text-destructive">{form.formState.errors.instrument_symbol.message}</p>
                    )}
                </div>

                {/* Operation type and date */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Operación</label>
                        <div className="flex gap-2">
                            <label className={cn(
                                "flex-1 flex items-center justify-center gap-2 border rounded-lg p-2.5 cursor-pointer transition-all",
                                form.watch("side") === "BUY" 
                                    ? "bg-green-500/10 border-green-500 text-green-600" 
                                    : "hover:bg-muted/50"
                            )}>
                                <input type="radio" value="BUY" {...form.register("side")} className="sr-only" />
                                <span className="font-semibold text-sm">COMPRA</span>
                            </label>
                            <label className={cn(
                                "flex-1 flex items-center justify-center gap-2 border rounded-lg p-2.5 cursor-pointer transition-all",
                                form.watch("side") === "SELL" 
                                    ? "bg-red-500/10 border-red-500 text-red-600" 
                                    : "hover:bg-muted/50"
                            )}>
                                <input type="radio" value="SELL" {...form.register("side")} className="sr-only" />
                                <span className="font-semibold text-sm">VENTA</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha</label>
                        <input
                            type="date"
                            {...form.register("trade_date")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </div>
            </div>

            {/* Trade Details */}
            <div className="p-6 bg-card rounded-xl border shadow-sm space-y-4">
                <h3 className="font-semibold text-lg">Detalles de la Operación</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cantidad</label>
                        <input
                            type="number"
                            step="any"
                            {...form.register("quantity")}
                            placeholder="0"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        {form.formState.errors.quantity && (
                            <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Total Pagado (ARS)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <input
                                type="number"
                                step="any"
                                {...form.register("total_ars")}
                                placeholder="0.00"
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        {form.formState.errors.total_ars && (
                            <p className="text-xs text-destructive">{form.formState.errors.total_ars.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* FX Conversion */}
            <div className="p-6 bg-card rounded-xl border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Conversión a USD</h3>
                    <button
                        type="button"
                        onClick={fetchRates}
                        disabled={fetchingRates}
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                        <RefreshCw className={cn("h-3 w-3", fetchingRates && "animate-spin")} />
                        Actualizar
                    </button>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Dólar</label>
                    <select
                        value={selectedFxSource}
                        onChange={(e) => setSelectedFxSource(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {rates.map((rate) => (
                            <option key={rate.casa} value={rate.casa}>
                                {rate.nombre} - ${rate.venta?.toFixed(2) || "N/A"}
                            </option>
                        ))}
                        {rates.length === 0 && <option value="bolsa">Dólar MEP</option>}
                    </select>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cotización:</span>
                        <span className="font-mono font-medium">${fxRate.toFixed(2)} ARS/USD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Precio por unidad:</span>
                        <span className="font-mono">
                            {formatCurrency(pricePerUnitArs, "ARS")} = {formatCurrency(pricePerUnitUsd)}
                        </span>
                    </div>
                    <div className="h-px bg-border"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total en USD:</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(totalUsd)}</span>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className={cn(
                    "w-full inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8",
                    "disabled:pointer-events-none disabled:opacity-50"
                )}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Trade
            </button>
        </form>
    );
}
