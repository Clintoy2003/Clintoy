import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { prompts } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [updated] = await db
      .update(prompts)
      .set({ uses: sql`${prompts.uses} + 1` })
      .where(eq(prompts.id, id))
      .returning({ uses: prompts.uses });
    return Response.json({ ok: true, uses: updated?.uses ?? null });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
