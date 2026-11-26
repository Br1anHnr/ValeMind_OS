"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Database, KeyRound, ShieldCheck, Users } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function ConfiguracoesPage() {
  const [me, setMe] = useState<UserInfo | null>(null);
  const [team, setTeam] = useState<UserInfo[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/auth/me"), fetch("/api/users")]).then(
      async ([meRes, usersRes]) => {
        if (meRes.ok) {
          const d = await meRes.json();
          setMe(d.user);
        }
        if (usersRes.ok) {
          const d = await usersRes.json();
          setTeam(d.users ?? []);
        }
      }
    );
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "A confirmação da nova senha não confere." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error ?? "Erro ao alterar senha." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ type: "ok", text: "Senha atualizada com sucesso no Neon Postgres." });
    } catch {
      setFeedback({ type: "error", text: "Erro de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Configurações
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Conta ativa, alteração de senha e equipe interna conectada ao ValeMind OS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alterar Senha */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Alterar minha senha
            </h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Senha atual
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nova senha (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Confirmar nova senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {feedback ? (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-sm ${
                  feedback.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {feedback.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Atualizando..." : "Salvar nova senha"}
            </button>
          </form>
        </section>

        {/* Usuários & Infra */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Usuários ativos ({team.length})
              </h2>
            </div>
            <ul className="space-y-2.5">
              {team.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {u.name}{" "}
                      {me?.id === u.id ? (
                        <span className="ml-1 text-xs font-medium text-indigo-600">
                          (você)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    {u.role === "founder" ? "Responsável" : "Membro"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Infraestrutura & Segurança
              </h2>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Banco oficial conectado: <strong className="text-slate-900">Neon Postgres</strong>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Sessões autenticadas persistidas em banco com cookie <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">httpOnly</code>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
