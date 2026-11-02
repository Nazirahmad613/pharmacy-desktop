// src/app/material/emergency/components/TriagePriorityChip.jsx
"use client";

import { Chip } from "@mui/material";

// پشتیبانی از هر دو حالت: رشته‌ای (critical/urgent/...) و عددی (1..5)
const PRIORITY_CONFIG = {
  // رشته‌ای
  critical:    { label: "بحرانی",   color: "error" },
  urgent:      { label: "فوری",     color: "warning" },
  semi_urgent: { label: "نیمه‌فوری", color: "info" },
  moderate:    { label: "متوسط",    color: "info" },
  low:         { label: "کم",       color: "success" },
  non_urgent:  { label: "غیرفوری",  color: "success" },
  // عددی (بک‌اند از 1 تا 5 استفاده می‌کند)
  1: { label: "بحرانی (۱)",   color: "error" },
  2: { label: "فوری (۲)",     color: "warning" },
  3: { label: "متوسط (۳)",    color: "info" },
  4: { label: "کم (۴)",       color: "success" },
  5: { label: "غیرفوری (۵)",  color: "default" },
};

export default function TriagePriorityChip({ priority }) {
  if (priority === null || priority === undefined || priority === "") {
    return <Chip label="تعیین نشده" size="small" variant="outlined" />;
  }
  const config =
    PRIORITY_CONFIG[priority] ||
    PRIORITY_CONFIG[String(priority)] ||
    { label: String(priority), color: "default" };
  return <Chip label={config.label} color={config.color} size="small" />;
}