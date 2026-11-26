import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { users } from "./schema";
import { hashPassword } from "../lib/password";

const INITIAL_USERS = [
  {
    name: "Brian Henrique",
    email: "contatobh18@gmail.com",
    password: "test-123",
    role: "founder" as const,
  },
  {
    name: "Fabio Bussman",
    email: "fabio12345@gmail.com",
    password: "test-123",
    role: "founder" as const,
  },
];

async function seed() {
  console.log("Iniciando seed dos usuários iniciais no Neon Postgres...");

  for (const item of INITIAL_USERS) {
    const email = item.email.toLowerCase();
    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Usuário já existe: ${item.name} (${email})`);
      continue;
    }

    await db.insert(users).values({
      name: item.name,
      email,
      passwordHash: hashPassword(item.password),
      role: item.role,
      active: true,
    });

    console.log(`Usuário criado: ${item.name} (${email})`);
  }

  console.log("Seed concluído com sucesso.");
}

seed()
  .catch((err) => {
    console.error("Erro ao executar seed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
