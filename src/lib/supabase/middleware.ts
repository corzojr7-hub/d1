import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const allowedOrigins = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .map((origin) => origin?.trim())
    .filter(Boolean) as string[],
);

const rateLimitHits = new Map<string, { hits: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateLimitHits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitHits.set(key, { hits: 1, resetAt: now + windowMs });
    return false;
  }

  current.hits += 1;
  return current.hits > limit;
}

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") || "";
  if (allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, X-CRON-SECRET, X-POS-SECRET",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

function isSecretBackdoorRoute(pathname: string) {
  return pathname.startsWith("/api/cron/") || pathname === "/api/pos/sync";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return applyCors(request, new NextResponse(null, { status: 204 }));
  }

  if (
    (pathname === "/login" || pathname.startsWith("/api")) &&
    isRateLimited(`${getClientIp(request)}:${pathname}`, pathname === "/login" ? 20 : 120, 60000)
  ) {
    return applyCors(
      request,
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname === "/login";
  const isPublicRoute = pathname.startsWith("/_next") || pathname === "/manifest.webmanifest";
  const isApiRoute = pathname.startsWith("/api");

  if (!user && !isAuthRoute && !isPublicRoute && !isSecretBackdoorRoute(pathname)) {
    if (isApiRoute) {
      return applyCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyCors(request, NextResponse.redirect(url));
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return applyCors(request, NextResponse.redirect(url));
  }

  if (user && (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.id)
      .eq("status", "activo")
      .single();
    const jwtRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "";

    if (!profile || profile.role !== "admin" || (jwtRole && jwtRole !== profile.role)) {
      if (isApiRoute) {
        return applyCors(request, NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      }
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return applyCors(request, NextResponse.redirect(url));
    }
  }

  return applyCors(request, supabaseResponse);
}
