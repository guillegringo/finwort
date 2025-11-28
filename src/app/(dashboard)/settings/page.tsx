"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const [defaultFxSource, setDefaultFxSource] = useState("MEP");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    // Load profile on mount
    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from("profiles")
                .select("default_fx_source")
                .eq("id", user.id)
                .single();
            if (error && error.code !== "PGRST116") {
                console.error(error);
            }
            if (data) {
                setDefaultFxSource(data.default_fx_source || "MEP");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSave() {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    default_fx_source: defaultFxSource,
                    updated_at: new Date().toISOString(),
                });
            if (error) throw error;
            toast.success("Settings saved");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your application preferences.</p>
            </div>

            <div className="max-w-md space-y-4 p-6 bg-card rounded-xl border shadow-sm">
                {/* FX Source selector */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Default FX Source</label>
                    <select
                        value={defaultFxSource}
                        onChange={(e) => setDefaultFxSource(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="MEP">Dólar MEP</option>
                        <option value="CCL">Contado con Liqui</option>
                        <option value="Blue">Dólar Blue</option>
                        <option value="Oficial">Dólar Oficial</option>
                        <option value="Cripto">Dólar Cripto</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                        This source will be selected by default when adding new trades.
                    </p>
                </div>

                {/* Theme selector */}
                <div className="flex items-center justify-between pt-4">
                    <span className="text-sm font-medium">Theme</span>
                    <select
                        value={theme}
                        onChange={(e) => {
                            const newTheme = e.target.value as typeof theme;
                            setTheme(newTheme);
                            router.refresh();
                        }}
                        className="rounded-md bg-muted px-3 py-1 text-sm"
                    >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        {/* Add additional Tailwind theme options here if defined */}
                    </select>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </button>
            </div>
        </div>
    );
}
