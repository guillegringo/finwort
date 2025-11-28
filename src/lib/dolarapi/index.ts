export interface DolarRate {
    moneda: string;
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion: string;
}

export async function getDolarRates(): Promise<DolarRate[]> {
    try {
        const res = await fetch("https://dolarapi.com/v1/dolares", {
            next: { revalidate: 60 }, // Cache for 60 seconds
        });
        if (!res.ok) {
            throw new Error("Failed to fetch rates");
        }
        return res.json();
    } catch (error) {
        console.error("Error fetching rates:", error);
        return [];
    }
}

export async function getCryptoRates(): Promise<any[]> {
    // DolarAPI also has crypto endpoints, or we can use another one.
    // For now, let's stick to USD rates.
    // https://dolarapi.com/v1/cotizaciones/cripto
    try {
        const res = await fetch("https://dolarapi.com/v1/cotizaciones/cripto", {
            next: { revalidate: 60 },
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Error fetching crypto rates:", error);
        return [];
    }
}
