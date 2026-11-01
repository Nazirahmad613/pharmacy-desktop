// src/app/material/emergency/components/TriagePriorityChip.jsx
"use client";

import { Chip } from "@mui/material";

const PRIORITY_CONFIG = {
  critical: { label: "بحرانی", color: "error" },
  urgent: { label: "فوری", color: "warning" },
  semi_urgent: { label: "نیمه‌فوری", color: "info" },
  non_urgent: { label: "غیرفوری", color: "success" },
};

export default function TriagePriorityChip({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.non_urgent;
  return <Chip label={config.label} color={config.color} size="small" />;
}