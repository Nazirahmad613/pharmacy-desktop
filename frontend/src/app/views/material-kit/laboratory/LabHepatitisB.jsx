// src/app/pages/laboratory/LabHepatitisB.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabHepatitisB() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧪 تست هپاتیت B"
      icon={<HealingIcon sx={{ color: "#f97316" }} />}
      testType=""  // ❌ بدون testType - فقط با کلمات کلیدی
      testKeywords={["هپاتیت b", "hepatitis b", "hbsag"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}