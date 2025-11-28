import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Cookie max age: 1 year in seconds
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const cookieOptions = {
                            ...options,
                            maxAge: COOKIE_MAX_AGE,
                            sameSite: "lax" as const,
                            secure: process.env.NODE_ENV === "production",
                        };
                        request.cookies.set({
                            name,
                            value,
                            ...cookieOptions,
                        });
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        });
                        response.cookies.set({
                            name,
                            value,
                            ...cookieOptions,
                        });
                    });
                },
            },
        }
    );

    // refreshing the auth token
    await supabase.auth.getUser();

    return response;
}
