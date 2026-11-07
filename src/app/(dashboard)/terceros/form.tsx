"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createThirdParty } from "./actions";
import { useRouter } from "next/navigation";

export function ThirdPartyForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await createThirdParty({
        type: fd.get("type"),
        docType: fd.get("docType"),
        docNumber: fd.get("docNumber"),
        name: fd.get("name"),
        email: fd.get("email") || "",
        phone: fd.get("phone") || undefined,
        address: fd.get("address") || undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>+ Nuevo tercero</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <h2 className="font-semibold">Nuevo tercero</h2>
          <select name="type" className="w-full border rounded p-2">
            <option value="CLIENTE">Cliente</option>
            <option value="PROVEEDOR">Proveedor</option>
            <option value="AMBOS">Ambos</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input name="docType" placeholder="NIT / CC" defaultValue="NIT" />
            <Input name="docNumber" placeholder="Número" required />
          </div>
          <Input name="name" placeholder="Nombre / razón social" required />
          <Input name="email" placeholder="Email (opcional)" type="email" />
          <Input name="phone" placeholder="Teléfono" />
          <Input name="address" placeholder="Dirección" />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}