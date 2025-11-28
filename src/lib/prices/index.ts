/**
 * Fetch stock prices from Yahoo Finance (free, no API key needed)
 * 
 * For CEDEARs, use the US ticker (e.g., "AAPL" not "AAPL.BA")
 * The price will be in USD
 */

export interface StockQuote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    name: string;
}

/**
 * Get current price for a single stock
 */
export async function getStockPrice(symbol: string): Promise<StockQuote | null> {
    try {
        // Use local proxy to avoid CORS issues
        const url = `/api/yahoo/price?symbol=${encodeURIComponent(symbol)}`;

        const res = await fetch(url);

        if (!res.ok) {
            console.error(`Failed to fetch price for ${symbol}`);
            return null;
        }

        const data = await res.json();
        const result = data.chart?.result?.[0];
        
        if (!result) {
            return null;
        }

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        
        // Get the latest price
        const currentPrice = meta.regularMarketPrice || quote?.close?.[quote.close.length - 1];
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        return {
            symbol: meta.symbol,
            price: currentPrice,
            change,
            changePercent,
            currency: meta.currency || 'USD',
            name: meta.shortName || meta.symbol,
        };
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        return null;
    }
}

/**
 * Get prices for multiple stocks at once
 */
export async function getMultipleStockPrices(symbols: string[]): Promise<Map<string, StockQuote>> {
    const results = new Map<string, StockQuote>();
    
    // Fetch in parallel but with small batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(symbol => getStockPrice(symbol));
        const batchResults = await Promise.all(promises);
        
        batchResults.forEach((quote, index) => {
            if (quote) {
                results.set(batch[index].toUpperCase(), quote);
            }
        });
        
        // Small delay between batches
        if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return results;
}

/**
 * CEDEAR ratios - how many CEDEARs equal 1 US share
 * This is important for calculating the correct value
 * 
 * Example: If AAPL ratio is 10, then 10 CEDEARs = 1 AAPL share
 * So if you have 20 CEDEARs and AAPL is $150, your value is: (20/10) * $150 = $300
 */
export const CEDEAR_RATIOS: Record<string, number> = {
    // Tech
    'AAPL': 10,
    'MSFT': 5,
    'GOOGL': 18,
    'GOOG': 18,
    'AMZN': 72,
    'META': 5,
    'NVDA': 5,
    'TSLA': 15,
    'NFLX': 4,
    'AMD': 5,
    'INTC': 4,
    'PYPL': 4,
    'ADBE': 4,
    'CRM': 5,
    'UBER': 5,
    'SNAP': 6,
    'SPOT': 5,
    'SQ': 5,
    'SHOP': 10,
    'ZM': 4,
    
    // Finance
    'JPM': 3,
    'BAC': 5,
    'WFC': 4,
    'GS': 2,
    'V': 4,
    'MA': 3,
    'AXP': 2,
    'C': 4,
    
    // Consumer
    'KO': 4,
    'PEP': 4,
    'MCD': 3,
    'SBUX': 4,
    'NKE': 4,
    'DIS': 4,
    'WMT': 4,
    'HD': 3,
    'COST': 3,
    
    // Healthcare
    'JNJ': 3,
    'PFE': 6,
    'ABBV': 3,
    'MRK': 3,
    'UNH': 2,
    
    // Energy
    'XOM': 3,
    'CVX': 2,
    
    // ETFs
    'SPY': 4,
    'QQQ': 4,
    'EEM': 4,
    'EWZ': 4,
    'GLD': 4,
    'IWM': 4,
    
    // Argentine ADRs
    'YPF': 1,
    'GGAL': 10,
    'BMA': 10,
    'PAM': 5,
    'SUPV': 5,
    'BBAR': 3,
    'TEO': 5,
    'CEPU': 10,
    'LOMA': 5,
    'TGS': 5,
    'EDN': 20,
    'CRESY': 10,
    'IRCP': 4,
    
    // Crypto related
    'MSTR': 10,
    'COIN': 4,
    
    // Others
    'BABA': 9,
    'NIO': 6,
    'VALE': 5,
    'PBR': 4,
    'MELI': 6,
    'GLOB': 6,
    'DESP': 14,
};

/**
 * Calculate the USD value of CEDEAR holdings
 */
export function calculateCedearValue(
    symbol: string, 
    cedearQuantity: number, 
    usStockPriceUsd: number
): number {
    const ratio = CEDEAR_RATIOS[symbol.toUpperCase()] || 1;
    // Number of US shares = CEDEARs / ratio
    const usShares = cedearQuantity / ratio;
    return usShares * usStockPriceUsd;
}

