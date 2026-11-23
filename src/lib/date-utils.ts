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