import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

export function invalidIdResponse(label = "ID inválido") {
  return NextResponse.json({ error: label }, { status: 400 });
}

export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<
  { ok: true; data: T } | { ok: false; response: NextResponse }
> {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Corpo da requisição JSON inválido" },
        { status: 400 }
      ),
    };
  }
}

export function validateEnumFilter<T extends string>(
  raw: string,
  allowed: readonly T[],
  fieldName: string
): { ok: true; value: T | null } | { ok: false; response: NextResponse } {
  if (!raw || raw === "all") return { ok: true, value: null };
  if ((allowed as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as T };
  }
  return {
    ok: false,
    response: NextResponse.json(
      { error: `Filtro "${fieldName}" inválido` },
      { status: 400 }
    ),
  };
}

export function validateUuidFilter(
  raw: string,
  fieldName: string
): { ok: true; value: string | null } | { ok: false; response: NextResponse } {
  if (!raw || raw === "all") return { ok: true, value: null };
  if (isValidUuid(raw)) return { ok: true, value: raw };
  return {
    ok: false,
    response: NextResponse.json(
      { error: `Parâmetro "${fieldName}" deve ser um UUID válido` },
      { status: 400 }
    ),
  };
}
