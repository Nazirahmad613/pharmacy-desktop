// src/app/pages/laboratory/LabMalaria.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabMalaria() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🦟 تست مالاریا"
      icon={<HealingIcon sx={{ color: "#22c55e" }} />}
      testType=""  // ❌ بدون testType - فقط با کلمات کلیدی
      testKeywords={["مالاریا", "malaria", "پلاسمودیوم"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}