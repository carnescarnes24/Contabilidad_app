"use client";

import { useState } from "react";

export function BusinessSwitcher({
  businesses,
  current,
}: {
  businesses: { id: string; name: string }[];
  current: string;
}) {
  const [selected, setSelected] = useState(current);

  return (
    <select
      value={selected}
      onChange={(e) => {
        const next = e.target.value;
        setSelected(next);
        document.cookie = `businessId=${next}; path=/; max-age=31536000; SameSite=Lax`;
        // Recarga completa para evadir la caché del router de Next.js
        window.location.reload(); 
      }}
      className="border border-brand-orange/40 rounded-lg px-3 py-1.5 text-sm bg-white text-brand-brown font-medium"
    >
      {businesses.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}