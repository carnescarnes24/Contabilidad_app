export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const dateStr = typeof dateInput === "string" && !dateInput.includes("T") 
    ? `${dateInput}T12:00:00` 
    : dateInput;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  
  const day = String(date.getDate()).padStart(2, '0');
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export function daysUntil(dateInput: string | Date | null | undefined): number {
  if (!dateInput) return 0;
  const dateStr = typeof dateInput === "string" && !dateInput.includes("T") 
    ? `${dateInput}T12:00:00` 
    : dateInput;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export function formatCOP(value: number): string {
  if (isNaN(value)) return "$0";
  const rounded = Math.round(value);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${formatted}`;
}

export function toInputDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const dateStr = typeof dateInput === "string" && !dateInput.includes("T") 
    ? `${dateInput}T12:00:00` 
    : dateInput;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}