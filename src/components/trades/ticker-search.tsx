"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TickerResult {
    symbol: string;
    name: string;
    type: string;
    exchange: string;
}

type InstrumentType = "CEDEAR" | "STOCK" | "BOND" | "CRYPTO" | "FCI";

interface TickerSearchProps {
    value: string;
    onChange: (value: string, name?: string) => void;
    instrumentType: InstrumentType;
    placeholder?: string;
}

// Popular suggestions by type
const SUGGESTIONS: Record<InstrumentType, { symbol: string; name: string }[]> = {
    CEDEAR: [
        { symbol: "AAPL", name: "Apple Inc." },
        { symbol: "MELI", name: "MercadoLibre Inc." },
        { symbol: "GOOGL", name: "Alphabet Inc." },
        { symbol: "MSFT", name: "Microsoft Corp." },
        { symbol: "AMZN", name: "Amazon.com Inc." },
        { symbol: "TSLA", name: "Tesla Inc." },
        { symbol: "NVDA", name: "NVIDIA Corp." },
        { symbol: "META", name: "Meta Platforms" },
        { symbol: "NFLX", name: "Netflix Inc." },
        { symbol: "GLOB", name: "Globant S.A." },
    ],
    STOCK: [
        { symbol: "GGAL", name: "Grupo Galicia" },
        { symbol: "YPF", name: "YPF S.A." },
        { symbol: "BMA", name: "Banco Macro" },
        { symbol: "PAM", name: "Pampa Energía" },
        { symbol: "TXAR", name: "Ternium Argentina" },
        { symbol: "ALUA", name: "Aluar" },
        { symbol: "BBAR", name: "BBVA Argentina" },
        { symbol: "SUPV", name: "Supervielle" },
        { symbol: "TECO2", name: "Telecom Argentina" },
        { symbol: "MIRG", name: "Mirgor" },
        { symbol: "CRES", name: "Cresud" },
        { symbol: "TGSU2", name: "TGS" },
        { symbol: "EDN", name: "Edenor" },
        { symbol: "LOMA", name: "Loma Negra" },
        { symbol: "CEPU", name: "Central Puerto" },
    ],
    BOND: [
        { symbol: "AL30", name: "Bono Argentina 2030 Ley Arg" },
        { symbol: "AL35", name: "Bono Argentina 2035 Ley Arg" },
        { symbol: "GD30", name: "Bono Argentina 2030 Ley NY" },
        { symbol: "GD35", name: "Bono Argentina 2035 Ley NY" },
        { symbol: "GD38", name: "Bono Argentina 2038 Ley NY" },
        { symbol: "GD41", name: "Bono Argentina 2041 Ley NY" },
        { symbol: "GD46", name: "Bono Argentina 2046 Ley NY" },
        { symbol: "AE38", name: "Bono Argentina 2038 Ley Arg" },
        { symbol: "AL29", name: "Bono Argentina 2029 Ley Arg" },
        { symbol: "GD29", name: "Bono Argentina 2029 Ley NY" },
        { symbol: "TX26", name: "Bono CER 2026" },
        { symbol: "T2X4", name: "Bono CER 2024" },
        { symbol: "S31O4", name: "Lecap Oct 2024" },
    ],
    CRYPTO: [
        { symbol: "BTC", name: "Bitcoin" },
        { symbol: "ETH", name: "Ethereum" },
        { symbol: "SOL", name: "Solana" },
        { symbol: "BNB", name: "Binance Coin" },
        { symbol: "XRP", name: "Ripple" },
        { symbol: "ADA", name: "Cardano" },
        { symbol: "DOGE", name: "Dogecoin" },
        { symbol: "DOT", name: "Polkadot" },
        { symbol: "MATIC", name: "Polygon" },
        { symbol: "LINK", name: "Chainlink" },
        { symbol: "AVAX", name: "Avalanche" },
        { symbol: "UNI", name: "Uniswap" },
    ],
    FCI: [
        { symbol: "FCI-ALPHA", name: "Alpha FCI" },
        { symbol: "FCI-DELTA", name: "Delta FCI" },
        { symbol: "FCI-LATAM", name: "Latam FCI" },
    ],
};

// Build Yahoo Finance search query based on instrument type
function buildSearchQuery(query: string, type: InstrumentType): string {
    const baseUrl = "https://query1.finance.yahoo.com/v1/finance/search";
    const params = new URLSearchParams({
        q: query,
        quotesCount: "15",
        newsCount: "0",
        enableFuzzyQuery: "false",
    });

    return `${baseUrl}?${params.toString()}`;
}

// Filter Yahoo Finance results based on instrument type
function filterResults(quotes: any[], type: InstrumentType): TickerResult[] {
    return quotes
        .filter((q: any) => {
            switch (type) {
                case "CEDEAR":
                    // US stocks - NYSE, NASDAQ
                    return (
                        (q.quoteType === "EQUITY" || q.quoteType === "ETF") &&
                        (q.exchange === "NYQ" || q.exchange === "NMS" || q.exchange === "NGM" || 
                         q.exchDisp === "NYSE" || q.exchDisp === "NASDAQ")
                    );
                case "STOCK":
                    // Argentine stocks - Buenos Aires
                    return (
                        q.quoteType === "EQUITY" &&
                        (q.exchange === "BUE" || q.exchDisp === "Buenos Aires")
                    );
                case "BOND":
                    // Bonds are harder to find, we'll rely mostly on local suggestions
                    return q.quoteType === "BOND" || q.exchange === "BUE";
                case "CRYPTO":
                    return q.quoteType === "CRYPTOCURRENCY";
                case "FCI":
                    // FCIs are local, not in Yahoo Finance
                    return false;
                default:
                    return true;
            }
        })
        .slice(0, 10)
        .map((q: any) => ({
            symbol: cleanSymbol(q.symbol, type),
            name: q.shortname || q.longname || q.symbol,
            type: q.quoteType,
            exchange: q.exchDisp || q.exchange || "",
        }));
}

// Clean up symbol (remove suffixes like .BA for Argentine stocks)
function cleanSymbol(symbol: string, type: InstrumentType): string {
    if (type === "STOCK" || type === "BOND") {
        return symbol.replace(".BA", "");
    }
    if (type === "CRYPTO") {
        return symbol.replace("-USD", "").replace("USD", "");
    }
    return symbol;
}

// Enhance search query for better results
function enhanceQuery(query: string, type: InstrumentType): string {
    switch (type) {
        case "STOCK":
            // Add .BA for Argentine stocks search
            return query.includes(".BA") ? query : query;
        case "CRYPTO":
            // Add -USD for crypto search
            return query.includes("-USD") ? query : query;
        default:
            return query;
    }
}

export function TickerSearch({ value, onChange, instrumentType, placeholder }: TickerSearchProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<TickerResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get default placeholder based on type
    const getPlaceholder = () => {
        switch (instrumentType) {
            case "CEDEAR": return "Buscar AAPL, MSFT, GOOGL...";
            case "STOCK": return "Buscar GGAL, YPF, BMA...";
            case "BOND": return "Buscar AL30, GD30, GD35...";
            case "CRYPTO": return "Buscar BTC, ETH, SOL...";
            case "FCI": return "Buscar fondo...";
            default: return "Buscar...";
        }
    };

    // Reset when instrument type changes
    useEffect(() => {
        setQuery("");
        setResults([]);
        onChange("");
    }, [instrumentType]);

    // Search for tickers
    useEffect(() => {
        const searchTickers = async () => {
            if (query.length < 1) {
                // Show suggestions when empty
                const suggestions = SUGGESTIONS[instrumentType] || [];
                setResults(suggestions.map(s => ({
                    symbol: s.symbol,
                    name: s.name,
                    type: instrumentType,
                    exchange: instrumentType === "STOCK" ? "BCBA" : instrumentType === "CEDEAR" ? "US" : "",
                })));
                return;
            }

            // For FCI and Bonds, only use local suggestions (Yahoo doesn't have good data)
            if (instrumentType === "FCI" || instrumentType === "BOND") {
                const suggestions = SUGGESTIONS[instrumentType] || [];
                const filtered = suggestions
                    .filter(s => 
                        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
                        s.name.toLowerCase().includes(query.toLowerCase())
                    )
                    .map(s => ({
                        symbol: s.symbol,
                        name: s.name,
                        type: instrumentType,
                        exchange: "BCBA",
                    }));
                setResults(filtered);
                return;
            }

            setIsLoading(true);
            try {
                const searchQuery = enhanceQuery(query, instrumentType);
                const url = buildSearchQuery(searchQuery, instrumentType);
                
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                });

                if (!res.ok) throw new Error("Search failed");

                const data = await res.json();
                const filtered = filterResults(data.quotes || [], instrumentType);

                // If no results from API, fall back to local suggestions
                if (filtered.length === 0) {
                    const suggestions = SUGGESTIONS[instrumentType] || [];
                    const localFiltered = suggestions
                        .filter(s => 
                            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
                            s.name.toLowerCase().includes(query.toLowerCase())
                        )
                        .map(s => ({
                            symbol: s.symbol,
                            name: s.name,
                            type: instrumentType,
                            exchange: "",
                        }));
                    setResults(localFiltered);
                } else {
                    setResults(filtered);
                }
            } catch (error) {
                console.error("Search error:", error);
                // Fallback to local suggestions
                const suggestions = SUGGESTIONS[instrumentType] || [];
                const filtered = suggestions
                    .filter(s => 
                        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
                        s.name.toLowerCase().includes(query.toLowerCase())
                    )
                    .map(s => ({
                        symbol: s.symbol,
                        name: s.name,
                        type: instrumentType,
                        exchange: "",
                    }));
                setResults(filtered);
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(searchTickers, 300);
        return () => clearTimeout(debounce);
    }, [query, instrumentType]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev => prev < results.length - 1 ? prev + 1 : prev);
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    selectTicker(results[selectedIndex]);
                }
                break;
            case "Escape":
                setIsOpen(false);
                break;
        }
    };

    const selectTicker = (ticker: TickerResult) => {
        setQuery(ticker.symbol);
        onChange(ticker.symbol, ticker.name);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    // Get type label
    const getTypeLabel = (type: InstrumentType) => {
        switch (type) {
            case "CEDEAR": return "CEDEAR";
            case "STOCK": return "Merval";
            case "BOND": return "Bono";
            case "CRYPTO": return "Crypto";
            case "FCI": return "FCI";
            default: return "";
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value.toUpperCase());
                        setIsOpen(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || getPlaceholder()}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm uppercase placeholder:text-muted-foreground placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {/* Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                        {query.length < 1 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50">
                                {instrumentType === "CEDEAR" && "CEDEARs populares"}
                                {instrumentType === "STOCK" && "Acciones del Merval"}
                                {instrumentType === "BOND" && "Bonos argentinos"}
                                {instrumentType === "CRYPTO" && "Criptomonedas populares"}
                                {instrumentType === "FCI" && "Fondos disponibles"}
                            </div>
                        )}
                        {results.map((result, index) => (
                            <button
                                key={`${result.symbol}-${index}`}
                                type="button"
                                onClick={() => selectTicker(result)}
                                className={cn(
                                    "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-muted/50 transition-colors",
                                    selectedIndex === index && "bg-muted",
                                    value === result.symbol && "bg-primary/10"
                                )}
                            >
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{result.symbol}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                            {getTypeLabel(instrumentType)}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                        {result.name}
                                    </span>
                                </div>
                                {value === result.symbol && (
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* No results */}
            {isOpen && query.length > 0 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
                    No se encontraron resultados para "{query}"
                </div>
            )}
        </div>
    );
}
