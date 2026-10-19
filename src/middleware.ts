import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "clintoy_session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;

  if (token) {
    const secret = process.env.AUTH_SECRET;
    if (secret) {
      try {
        await jwtVerify(token, new TextEncoder().encode(secret));
        valid = true;
      } catch {
        valid = false;
      }
    }
  }

  if (!valid) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*"],
};
