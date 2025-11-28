import { TradeForm } from "@/components/trades/trade-form";

export default function NewTradePage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">New Trade</h1>
                <p className="text-muted-foreground">
                    Record a new investment transaction.
                </p>
            </div>
            <TradeForm />
        </div>
    );
}
