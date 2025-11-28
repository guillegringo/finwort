import { Database } from "@/types/supabase";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Price = {
    instrument_symbol: string;
    price: number;
    currency: "USD" | "ARS";
    updated_at: string;
};

export interface Position {
    instrument_symbol: string;
    instrument_type: string;
    quantity: number;
    cost_basis_usd: number;
    current_price_usd: number;
    current_value_usd: number;
    unrealized_pl_usd: number;
    allocation_percent: number; // To be calculated
}

export interface Portfolio {
    positions: Position[];
    total_value_usd: number;
    total_cost_basis_usd: number;
    total_unrealized_pl_usd: number;
}

export function calculatePortfolio(trades: Trade[], prices: Price[], fxRate: number): Portfolio {
    const positionsMap = new Map<string, Position>();

    // 1. Aggregate trades
    for (const trade of trades) {
        const { instrument_symbol, instrument_type, side, quantity, amount_usd } = trade;

        if (!positionsMap.has(instrument_symbol)) {
            positionsMap.set(instrument_symbol, {
                instrument_symbol,
                instrument_type,
                quantity: 0,
                cost_basis_usd: 0,
                current_price_usd: 0,
                current_value_usd: 0,
                unrealized_pl_usd: 0,
                allocation_percent: 0,
            });
        }

        const position = positionsMap.get(instrument_symbol)!;

        if (side === "BUY") {
            position.quantity += quantity;
            position.cost_basis_usd += amount_usd;
        } else {
            position.quantity -= quantity;
            position.cost_basis_usd -= amount_usd;
        }
    }

    const positions: Position[] = [];
    let total_value_usd = 0;
    let total_cost_basis_usd = 0;

    // 2. Calculate valuations
    for (const position of positionsMap.values()) {
        if (position.quantity <= 0.000001) continue; // Skip closed positions (allowing for float errors)

        const priceData = prices.find((p) => p.instrument_symbol === position.instrument_symbol);

        if (priceData) {
            if (priceData.currency === "USD") {
                position.current_price_usd = priceData.price;
            } else {
                position.current_price_usd = priceData.price / fxRate;
            }
        } else {
            // Fallback if no price: assume price = cost / quantity (break even) or 0? 
            // Let's use 0 to prompt user to enter price.
            position.current_price_usd = 0;
        }

        position.current_value_usd = position.quantity * position.current_price_usd;
        position.unrealized_pl_usd = position.current_value_usd - position.cost_basis_usd;

        total_value_usd += position.current_value_usd;
        total_cost_basis_usd += position.cost_basis_usd;

        positions.push(position);
    }

    // 3. Calculate allocation
    for (const position of positions) {
        position.allocation_percent = total_value_usd > 0 ? (position.current_value_usd / total_value_usd) * 100 : 0;
    }

    return {
        positions: positions.sort((a, b) => b.current_value_usd - a.current_value_usd),
        total_value_usd,
        total_cost_basis_usd,
        total_unrealized_pl_usd: total_value_usd - total_cost_basis_usd,
    };
}
