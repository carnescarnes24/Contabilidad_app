"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBusinessConfig } from "./actions";

export function ConfigForm({
  initialData,
  canEdit,
}: {
  initialData: {
    invoicePrefix: string;
    payablePrefix: string;
    dueDays: string;
    alertDays: string;
    alertEmail: string;
    enableEmailAlerts: boolean;
    tradeName: string;
    logoUrl: string;
  };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    
    try {
      await saveBusinessConfig({
        invoicePrefix: fd.get("invoicePrefix"),
        payablePrefix: fd.get("payablePrefix"),
        dueDays: fd.get("dueDays"),
        alertDays: fd.get("alertDays"),
        alertEmail: fd.get("alertEmail"),
        enableEmailAlerts: fd.get("enableEmailAlerts"),
        tradeName: fd.get("tradeName"),
        logoUrl: fd.get("logoUrl"),
      });
      setMsg({ type: "ok", text: "Configuración guardada correctamente" });
      router.refresh();
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* SECCIÓN: Facturación */}
      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-brand-red border-b border-brand-orange/20 pb-2">
          1. Facturación y Operación
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-brown">Prefijo Cuentas por Cobrar</label>
            <Input name="invoicePrefix" defaultValue={initialData.invoicePrefix} disabled={!canEdit} required />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-brown">Prefijo Cuentas por Pagar</label>
            <Input name="payablePrefix" defaultValue={initialData.payablePrefix} disabled={!canEdit} required />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-brown">Días de vencimiento por defecto</label>
            <Input name="dueDays" type="number" defaultValue={initialData.dueDays} disabled={!canEdit} required />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-brown">Alerta de vencimiento (días antes)</label>
            <p className="text-xs text-slate-500 mb-1">Para las tarjetas de "Próximos vencimientos"</p>
            <Input name="alertDays" type="number" defaultValue={initialData.alertDays} disabled={!canEdit} required />
          </div>
        </div>
      </div>

      {/* SECCIÓN: Notificaciones */}
      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-brand-red border-b border-brand-orange/20 pb-2">
          2. Notificaciones
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="text-sm font-medium text-brand-brown">Correo para alertas</label>
            <Input name="alertEmail" type="email" defaultValue={initialData.alertEmail} placeholder="admin@empresa.com" disabled={!canEdit} />
          </div>
          <div className="flex items-center h-full pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="enableEmailAlerts"
                defaultChecked={initialData.enableEmailAlerts}
                disabled={!canEdit}
                className="w-4 h-4 text-brand-red rounded focus:ring-brand-red"
              />
              <span className="text-sm text-brand-brown font-medium">
                Activar envío de alertas por correo
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* SECCIÓN: Apariencia */}
      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-brand-red border-b border-brand-orange/20 pb-2">
          3. Apariencia
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-brown">Nombre comercial (Reportes)</label>
            <p className="text-xs text-slate-500 mb-1">Aparecerá en las exportaciones a Excel</p>
            <Input name="tradeName" defaultValue={initialData.tradeName} disabled={!canEdit} />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-brown">URL del Logo (opcional)</label>
            <p className="text-xs text-slate-500 mb-1">Enlace directo a la imagen (PNG/JPG)</p>
            <Input name="logoUrl" type="url" defaultValue={initialData.logoUrl} placeholder="https://..." disabled={!canEdit} />
          </div>
        </div>
      </div>

      {/* MENSAJES Y BOTÓN DE GUARDAR */}
      {msg && (
        <div className={`text-sm px-4 py-3 rounded-lg font-medium ${
          msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="bg-brand-red hover:bg-brand-red/90 text-white px-8">
            {loading ? "Guardando..." : "Guardar todos los cambios"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          Solo los administradores pueden modificar estos ajustes.
        </p>
      )}
    </form>
  );
}