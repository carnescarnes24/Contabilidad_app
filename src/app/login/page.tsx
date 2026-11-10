"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false, // Evita que NextAuth redirija automáticamente y oculte el error
      });

      if (res?.error) {
        setError("Correo o contraseña incorrectos. Por favor, verifica tus datos.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-carniceria flex items-center justify-center p-4 relative overflow-hidden">
      {/* Círculos decorativos difuminados */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-gold/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-red/40 blur-3xl" />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-brand-gold/40 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-red to-brand-orange shadow-lg">
            <span className="text-3xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-brown">
            Contabilidad a tu alcance
          </h1>
          <p className="text-sm text-brand-brown/70">
            Gestión financiera de tu carnicería
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-brand-brown">Email</label>
            <Input
              name="email"
              type="email"
              placeholder="admin@demo.com"
              required
              className="border-brand-orange/40 focus-visible:ring-brand-orange"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-brand-brown">Contraseña</label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="border-brand-orange/40 focus-visible:ring-brand-orange"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-semibold shadow-md"
          >
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </form>

        <div className="text-center text-xs text-brand-brown/60 pt-2 border-t border-brand-orange/20">
          Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}