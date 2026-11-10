"use client";

import { useEffect, useState } from "react";

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    // 1. Obtener la versión actual de la app
    async function checkVersion() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = await res.json();
        
        if (!currentVersion) {
          // Primera carga: guardamos la versión
          setCurrentVersion(data.version);
        } else if (data.version !== currentVersion) {
          // Si la versión del servidor es diferente, hay actualización
          setUpdateAvailable(true);
        }
      } catch (e) {
        // Ignorar errores de red
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 60000); // Consulta cada 60 segs
    return () => clearInterval(interval);
  }, [currentVersion]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-brand-brown text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50">
      <div>
        <p className="font-semibold text-sm">¡Actualización disponible!</p>
        <p className="text-xs text-brand-cream/80">Hay una nueva versión de la aplicación.</p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="bg-brand-orange text-brand-brown px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-brand-gold transition-colors"
      >
        Recargar
      </button>
    </div>
  );
}