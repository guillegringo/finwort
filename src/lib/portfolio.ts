import { Database } from "@/types/supabase";
import { CEDEAR_RATIOS } from "./prices";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

export interface Position {
    instrument_symbol: string;
    instrument_type: string;
    quantity: number;
    cost_basis_usd: number;        // Total USD spent to acquire
    avg_cost_per_unit_usd: number; // Average cost per unit in USD
    current_price_usd: number;     // Current price per unit in USD
    current_value_usd: number;     // Current total value in USD
    unrealized_pl_usd: number;     // Profit/Loss in USD
    unrealized_pl_percent: number; // Profit/Loss percentage
    allocation_percent: number;
    cedear_ratio?: number;         // For CEDEARs: how many = 1 US share
}

export interface Portfolio {
    positions: Position[];
    total_value_usd: number;
    total_cost_basis_usd: number;
    total_unrealized_pl_usd: number;
    total_unrealized_pl_percent: number;
}

export interface LivePrice {
    symbol: string;
    price: number;
    currency: string;
}

/**
 * Calculate portfolio from trades
 * 
 * @param trades - List of trades from database
 * @param livePrices - Map of symbol -> current price in USD
 * @param fxRate - Current ARS/USD rate (for ARS-denominated prices)
 */
export function calculatePortfolio(
    trades: Trade[], 
    livePrices: Map<string, number> = new Map(),
    fxRate: number = 1200
): Portfolio {
    const positionsMap = new Map<string, Position>();

    // 1. Aggregate trades by instrument
    for (const trade of trades) {
        const { instrument_symbol, instrument_type, side, quantity, amount_usd } = trade;
        const symbol = instrument_symbol.toUpperCase();

        if (!positionsMap.has(symbol)) {
            const cedearRatio = instrument_type === "CEDEAR" ? (CEDEAR_RATIOS[symbol] || 1) : undefined;
            
            positionsMap.set(symbol, {
                instrument_symbol: symbol,
                instrument_type,
                quantity: 0,
                cost_basis_usd: 0,
                avg_cost_per_unit_usd: 0,
                current_price_usd: 0,
                current_value_usd: 0,
                unrealized_pl_usd: 0,
                unrealized_pl_percent: 0,
                allocation_percent: 0,
                cedear_ratio: cedearRatio,
            });
        }

        const position = positionsMap.get(symbol)!;

        if (side === "BUY") {
            position.quantity += quantity;
            position.cost_basis_usd += amount_usd;
        } else {
            // SELL - reduce position
            // For simplicity, we use average cost method
            if (position.quantity > 0) {
                const avgCost = position.cost_basis_usd / position.quantity;
                position.quantity -= quantity;
                position.cost_basis_usd -= quantity * avgCost;
            }
        }
    }

    const positions: Position[] = [];
    let total_value_usd = 0;
    let total_cost_basis_usd = 0;

    // 2. Calculate current values using live prices
    for (const position of positionsMap.values()) {
        // Skip closed positions
        if (position.quantity <= 0.000001) continue;

        // Calculate average cost
        position.avg_cost_per_unit_usd = position.cost_basis_usd / position.quantity;

        // Get current price
        const livePrice = livePrices.get(position.instrument_symbol);
        
        if (livePrice) {
            if (position.cedear_ratio) {
                // For CEDEARs: price per CEDEAR = US stock price / ratio
                position.current_price_usd = livePrice / position.cedear_ratio;
            } else {
                position.current_price_usd = livePrice;
            }
        } else {
            // No live price - use cost basis as fallback (break-even)
            position.current_price_usd = position.avg_cost_per_unit_usd;
        }

        // Calculate current value and P/L
        position.current_value_usd = position.quantity * position.current_price_usd;
        position.unrealized_pl_usd = position.current_value_usd - position.cost_basis_usd;
        position.unrealized_pl_percent = position.cost_basis_usd > 0 
            ? (position.unrealized_pl_usd / position.cost_basis_usd) * 100 
            : 0;

        total_value_usd += position.current_value_usd;
        total_cost_basis_usd += position.cost_basis_usd;

        positions.push(position);
    }

    // 3. Calculate allocation percentages
    for (const position of positions) {
        position.allocation_percent = total_value_usd > 0 
            ? (position.current_value_usd / total_value_usd) * 100 
            : 0;
    }

    const total_unrealized_pl_usd = total_value_usd - total_cost_basis_usd;
    const total_unrealized_pl_percent = total_cost_basis_usd > 0 
        ? (total_unrealized_pl_usd / total_cost_basis_usd) * 100 
        : 0;

    return {
        positions: positions.sort((a, b) => b.current_value_usd - a.current_value_usd),
        total_value_usd,
        total_cost_basis_usd,
        total_unrealized_pl_usd,
        total_unrealized_pl_percent,
    };
}

/**
 * Get unique symbols from trades
 */
export function getUniqueSymbols(trades: Trade[]): string[] {
    const symbols = new Set<string>();
    for (const trade of trades) {
        symbols.add(trade.instrument_symbol.toUpperCase());
    }
    return Array.from(symbols);
}
