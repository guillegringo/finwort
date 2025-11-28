import { createClient } from "@/lib/supabase/server";
import { TradesTable } from "@/components/trades/trades-table";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TradesPage() {
    const supabase = await createClient();
    const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .order("trade_date", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Trades</h1>
                    <p className="text-muted-foreground">
                        History of all your investment transactions.
                    </p>
                </div>
                <Link
                    href="/trades/new"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Trade
                </Link>
            </div>
            <TradesTable trades={trades || []} />
        </div>
    );
}
