import { createClient } from "@/lib/supabase/server";
import { calculatePortfolio } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/utils";
import { getDolarRates } from "@/lib/dolarapi";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: trades } = await supabase.from("trades").select("*");
    const { data: prices } = await supabase.from("prices").select("*");
    const { data: profile } = await supabase.from("profiles").select("*").single();

    // Fetch current MEP rate for ARS conversion
    const rates = await getDolarRates();
    const mepRate = rates.find((r) => r.casa === "bolsa")?.venta || 1000; // Default fallback

    const portfolio = calculatePortfolio(
        trades || [],
        (prices as any[]) || [],
        mepRate
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Your investment performance in Hard Currency.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="text-sm font-medium text-muted-foreground">Total Value (USD)</div>
                    <div className="text-2xl font-bold">{formatCurrency(portfolio.total_value_usd)}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="text-sm font-medium text-muted-foreground">Cost Basis (USD)</div>
                    <div className="text-2xl font-bold">{formatCurrency(portfolio.total_cost_basis_usd)}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="text-sm font-medium text-muted-foreground">Unrealized P/L (USD)</div>
                    <div className={`text-2xl font-bold ${portfolio.total_unrealized_pl_usd >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(portfolio.total_unrealized_pl_usd)}
                    </div>
                </div>
            </div>

            <DashboardClient portfolio={portfolio} />
        </div>
    );
}
