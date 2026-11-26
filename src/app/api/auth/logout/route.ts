import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao sair:", err);
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}
