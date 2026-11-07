"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, changePassword } from "./actions";

export function ProfileForm({
  user,
}: {
  user: { id: string; name: string; email: string; role: string; createdAt: string };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"data" | "pass">("data");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await updateProfile({
        name: fd.get("name"),
        email: fd.get("email"),
      });
      setMsg({ type: "ok", text: "Perfil actualizado correctamente" });
      router.refresh();
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function onPass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await changePassword({
        currentPassword: fd.get("currentPassword"),
        newPassword: fd.get("newPassword"),
        confirmPassword: fd.get("confirmPassword"),
      });
      setMsg({ type: "ok", text: "Contraseña actualizada" });
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-brand-orange/20 shadow-sm overflow-hidden">
      <div className="flex border-b border-brand-orange/20">
        <button
          onClick={() => { setTab("data"); setMsg(null); }}
          className={`px-5 py-3 text-sm font-medium ${tab === "data" ? "text-brand-red border-b-2 border-brand-red -mb-px" : "text-slate-500 hover:text-brand-brown"}`}
        >
          Datos personales
        </button>
        <button
          onClick={() => { setTab("pass"); setMsg(null); }}
          className={`px-5 py-3 text-sm font-medium ${tab === "pass" ? "text-brand-red border-b-2 border-brand-red -mb-px" : "text-slate-500 hover:text-brand-brown"}`}
        >
          Cambiar contraseña
        </button>
      </div>

      <div className="p-6">
        {msg && (
          <div
            className={`mb-4 text-sm px-3 py-2 rounded-lg ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          >
            {msg.text}
          </div>
        )}

        {tab === "data" && (
          <form onSubmit={onData} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-brand-brown">Nombre</label>
              <Input name="name" defaultValue={user.name} required />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Email</label>
              <Input name="email" type="email" defaultValue={user.email} required />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Rol</label>
              <Input value={user.role} disabled className="bg-slate-50" />
            </div>
            <div className="text-xs text-slate-500">
              Miembro desde {new Date(user.createdAt).toLocaleDateString("es-CO")}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-red hover:bg-brand-red/90 text-white"
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        )}

        {tab === "pass" && (
          <form onSubmit={onPass} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-brand-brown">Contraseña actual</label>
              <Input name="currentPassword" type="password" required />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Nueva contraseña</label>
              <Input name="newPassword" type="password" minLength={6} required />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Confirmar contraseña</label>
              <Input name="confirmPassword" type="password" minLength={6} required />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-red hover:bg-brand-red/90 text-white"
            >
              {loading ? "Actualizando..." : "Cambiar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}