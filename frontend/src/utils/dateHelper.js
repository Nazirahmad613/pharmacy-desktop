// utils/dateHelper.js
export function formatDateToFa(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("fa-IR");
}

export function convertToISODate(faDate) {
  // faDate: YYYY-MM-DD شمسی
  if (!faDate) return "";
  const parts = faDate.split("-");
  if (parts.length !== 3) return faDate;
  // تبدیل شمسی به میلادی
  // اگر از moment-jalaali یا persian-date استفاده نکرده‌اید، فقط ارسال به API بصورت همون string
  return `${parts[0]}-${parts[1]}-${parts[2]}`; 
}