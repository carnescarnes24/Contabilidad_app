"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBusiness, updateBusiness, toggleBusiness } from "./actions";

type BusinessRow = {
  id: string;
  name: string;
  nit: string | null;
  active: boolean;
  invoiceCount: number;
  thirdPartyCount: number;
  createdAt: string;
};

export function BusinessesTable({ initial }: { initial: BusinessRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setMsg(null);
    setOpen(true);
  }

  function openEdit(b: BusinessRow) {
    setEditing(b);
    setMsg(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateBusiness(editing.id, {
          name: fd.get("name"),
          nit: fd.get("nit"),
        });
        setOpen(false);
        router.refresh(); // En edición, un refresh normal es suficiente
      } else {
        await createBusiness({
          name: fd.get("name"),
          nit: fd.get("nit"),
        });
        setOpen(false);
        // Al crear una empresa nueva, forzamos recarga completa 
        // para que el JWT se actualice y el selector del header la muestre
        window.location.reload(); 
      }
    } catch (err) {
      setMsg((err as Error).message);
      setLoading(false);
    }
  }

  async function onToggle(b: BusinessRow) {
    if (!confirm(`¿${b.active ? "Desactivar" : "Activar"} "${b.name}"?`)) return;
    try {
      await toggleBusiness(b.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={openNew}
          className="bg-brand-red hover:bg-brand-red/90 text-white"
        >
          + Nueva empresa
        </Button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream/50 text-left text-brand-brown">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">NIT</th>
              <th className="p-3 text-right">Facturas</th>
              <th className="p-3 text-right">Terceros</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((b) => (
              <tr key={b.id} className="border-t border-brand-orange/10">
                <td className="p-3 font-medium text-brand-brown">{b.name}</td>
                <td className="p-3 font-mono text-xs">{b.nit ?? "—"}</td>
                <td className="p-3 text-right">{b.invoiceCount}</td>
                <td className="p-3 text-right">{b.thirdPartyCount}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {b.active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => openEdit(b)}
                    className="text-sm text-brand-brown hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onToggle(b)}
                    className="text-sm text-brand-red hover:underline"
                  >
                    {b.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {initial.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Aún no hay empresas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-brand-brown mb-4">
              {editing ? "Editar empresa" : "Nueva empresa"}
            </h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Nombre
                </label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  required
                  placeholder="Ej. Carnicería El Buen Corte"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  NIT (opcional)
                </label>
                <Input
                  name="nit"
                  defaultValue={editing?.nit ?? ""}
                  placeholder="900123456-7"
                />
              </div>
              {msg && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {msg}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-brand-red hover:bg-brand-red/90 text-white"
                >
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