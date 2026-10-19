import { getCurrentUser, isGoogleAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user, googleEnabled: isGoogleAuthConfigured() });
}
