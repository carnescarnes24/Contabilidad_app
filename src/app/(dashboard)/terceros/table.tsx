"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createThirdParty,
  updateThirdParty,
  toggleThirdParty,
  deleteThirdParty,
} from "./actions";

type PartyRow = {
  id: string;
  type: "CLIENTE" | "PROVEEDOR" | "AMBOS";
  docType: string;
  docNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  invoicesCount: number;
  saldoCobrar: number;
  saldoPagar: number;
};

type Filter = "TODOS" | "CLIENTE" | "PROVEEDOR" | "AMBOS";

export function ThirdPartiesTable({
  initial,
  canEdit,
}: {
  initial: PartyRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("TODOS");
  const [showInactive, setShowInactive] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartyRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => {
    return initial.filter((p) => {
      if (!showInactive && !p.active) return false;
      if (filter !== "TODOS" && p.type !== filter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.docNumber.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [initial, search, filter, showInactive]);

  function openNew() {
    setEditing(null);
    setMsg(null);
    setOpen(true);
  }

  function openEdit(p: PartyRow) {
    setEditing(p);
    setMsg(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: fd.get("type"),
      docType: fd.get("docType"),
      docNumber: fd.get("docNumber"),
      name: fd.get("name"),
      email: fd.get("email") || "",
      phone: fd.get("phone") || undefined,
      address: fd.get("address") || undefined,
    };
    try {
      if (editing) {
        await updateThirdParty(editing.id, payload);
      } else {
        await createThirdParty(payload);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(p: PartyRow) {
    if (!confirm(`¿${p.active ? "Desactivar" : "Activar"} "${p.name}"?`)) return;
    try {
      await toggleThirdParty(p.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function onDelete(p: PartyRow) {
    if (p.invoicesCount > 0) return;
    if (
      !confirm(
        `¿Eliminar permanentemente "${p.name}"? Esta acción no se puede deshacer.`
      )
    )
      return;
    try {
      await deleteThirdParty(p.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Buscar por nombre, documento, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 border-brand-orange/40"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="border border-brand-orange/40 rounded-lg px-3 py-2 text-sm bg-white text-brand-brown"
          >
            <option value="TODOS">Todos los tipos</option>
            <option value="CLIENTE">Clientes</option>
            <option value="PROVEEDOR">Proveedores</option>
            <option value="AMBOS">Ambos</option>
          </select>
          <label className="text-sm text-brand-brown flex items-center gap-1">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Ver inactivos
          </label>
        </div>
        {canEdit && (
          <Button
            onClick={openNew}
            className="bg-brand-red hover:bg-brand-red/90 text-white"
          >
            + Nuevo tercero
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream/50 text-left text-brand-brown">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Tipo</th>
              <th className="p-3 text-right">Por cobrar</th>
              <th className="p-3 text-right">Por pagar</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-t border-brand-orange/10 hover:bg-brand-cream/20"
              >
                <td className="p-3">
                  <Link
                    href={`/terceros/${p.id}`}
                    className="font-medium text-brand-brown hover:text-brand-red hover:underline"
                  >
                    {p.name}
                  </Link>
                  {p.email && (
                    <p className="text-xs text-slate-500">{p.email}</p>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">
                  {p.docType} {p.docNumber}
                </td>
                <td className="p-3">
                  <TypeBadge type={p.type} />
                </td>
                <td className="p-3 text-right text-emerald-700 font-medium">
                  {p.saldoCobrar > 0 ? formatCOP(p.saldoCobrar) : "—"}
                </td>
                <td className="p-3 text-right text-rose-700 font-medium">
                  {p.saldoPagar > 0 ? formatCOP(p.saldoPagar) : "—"}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-sm text-brand-brown hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onToggle(p)}
                        className="text-sm text-brand-orange hover:underline"
                      >
                        {p.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        disabled={p.invoicesCount > 0}
                        title={
                          p.invoicesCount > 0
                            ? `Tiene ${p.invoicesCount} factura(s) asociada(s). Desactívalo en su lugar.`
                            : "Eliminar"
                        }
                        className="text-sm text-red-600 hover:underline disabled:text-slate-300 disabled:cursor-not-allowed disabled:no-underline"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No se encontraron terceros con los filtros actuales
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-brand-brown mb-4">
              {editing ? "Editar tercero" : "Nuevo tercero"}
            </h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-brand-brown">
                    Nombre / Razón social
                  </label>
                  <Input
                    name="name"
                    defaultValue={editing?.name ?? ""}
                    required
                    placeholder="Ej. Restaurante La Parrilla"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Tipo
                  </label>
                  <select
                    name="type"
                    defaultValue={editing?.type ?? "CLIENTE"}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="CLIENTE">Cliente</option>
                    <option value="PROVEEDOR">Proveedor</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-brand-brown">
                      Tipo doc.
                    </label>
                    <select
                      name="docType"
                      defaultValue={editing?.docType ?? "NIT"}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="NIT">NIT</option>
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-brown">
                      Número
                    </label>
                    <Input
                      name="docNumber"
                      defaultValue={editing?.docNumber ?? ""}
                      required
                      placeholder="900123456-7"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    defaultValue={editing?.email ?? ""}
                    placeholder="contacto@cliente.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Teléfono
                  </label>
                  <Input
                    name="phone"
                    defaultValue={editing?.phone ?? ""}
                    placeholder="3001234567"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium text-brand-brown">
                    Dirección
                  </label>
                  <Input
                    name="address"
                    defaultValue={editing?.address ?? ""}
                    placeholder="Calle 123 #45-67"
                  />
                </div>
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

function TypeBadge({ type }: { type: PartyRow["type"] }) {
  const map: Record<PartyRow["type"], string> = {
    CLIENTE: "bg-blue-100 text-blue-700",
    PROVEEDOR: "bg-amber-100 text-amber-700",
    AMBOS: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[type]}`}
    >
      {type}
    </span>
  );
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}