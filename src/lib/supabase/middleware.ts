import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes anyone can visit, logged in or not. The landing page, marketing
// pages, the public docs site, and the waitlist API all live here.
const MARKETING_PATHS = ["/", "/docs", "/pricing", "/privacy", "/terms", "/changelog", "/api/waitlist", "/api/og"];

// Routes that exist only for logged-out users. Logged-in visitors are
// bounced to the app.
const AUTH_PATHS = ["/sign-in", "/sign-up", "/auth"];

function isMarketingPath(pathname: string) {
  if (pathname === "/") return true;
  return MARKETING_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isMarketingPath(pathname)) {
    return response;
  }

  if (isAuthPath(pathname)) {
    if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return response;
}
