"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUser, updateUser, toggleUserActive } from "./actions";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ACCOUNTANT" | "VIEWER";
  active: boolean;
  businessIds: string[];
};

type Business = { id: string; name: string };

export function UsersTable({
  initial,
  businesses,
  currentUserId,
}: {
  initial: UserRow[];
  businesses: Business[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setMsg(null);
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setMsg(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    
    // Recoger empresas seleccionadas
    const businessIds = businesses
      .map((b) => b.id)
      .filter((id) => fd.get(`biz_${id}`) === "on");

    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      role: fd.get("role"),
      password: fd.get("password"),
      businesses: businessIds,
    };

    try {
      if (editing) {
        await updateUser(editing.id, payload);
      } else {
        await createUser(payload);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(u: UserRow) {
    if (!confirm(`¿${u.active ? "Desactivar" : "Activar"} a ${u.name}?`)) return;
    try {
      await toggleUserActive(u.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-brand-red hover:bg-brand-red/90 text-white">
          + Nuevo Usuario
        </Button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream/50 text-left text-brand-brown">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Empresas</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((u) => (
              <tr key={u.id} className="border-t border-brand-orange/10 hover:bg-brand-cream/20">
                <td className="p-3 font-medium text-brand-brown">{u.name}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-xs">
                  {u.businessIds.map((id) => businesses.find((b) => b.id === id)?.name).filter(Boolean).join(", ") || "Ninguna"}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="text-sm text-brand-brown hover:underline"
                  >
                    Editar
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => onToggle(u)}
                      className="text-sm text-brand-red hover:underline"
                    >
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-brand-brown mb-4">
              {editing ? "Editar Usuario" : "Nuevo Usuario"}
            </h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-brand-brown">Nombre</label>
                <Input name="name" defaultValue={editing?.name ?? ""} required />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">Email</label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} required />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Contraseña {editing && "(dejar en blanco para no cambiar)"}
                </label>
                <Input name="password" type="password" required={!editing} minLength={6} />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">Rol</label>
                <select
                  name="role"
                  defaultValue={editing?.role ?? "VIEWER"}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="ACCOUNTANT">Contador</option>
                  <option value="VIEWER">Solo lectura</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown block mb-1">
                  Empresas asignadas
                </label>
                <div className="space-y-1 pl-1">
                  {businesses.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`biz_${b.id}`}
                        defaultChecked={editing?.businessIds.includes(b.id)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>

              {msg && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{msg}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-brand-red hover:bg-brand-red/90 text-white">
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}