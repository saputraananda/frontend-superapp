/**
 * Formats a date string (YYYY-MM-DD or ISO string) to Indonesian date format:
 * e.g., "Rabu, 21 Juli 2026"
 * 
 * @param {string} dateStr 
 * @returns {string}
 */
export const formatDateIndonesian = (dateStr) => {
  if (!dateStr) return "";
  
  // Extract YYYY-MM-DD portion
  const dateOnly = String(dateStr).substring(0, 10);
  const parts = dateOnly.split("-");
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return dateStr;
  
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const dayName = days[date.getDay()];
  const monthName = months[month];
  
  return `${dayName}, ${day} ${monthName} ${year}`;
};
