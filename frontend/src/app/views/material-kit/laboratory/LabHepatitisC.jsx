// src/app/pages/laboratory/LabHepatitisC.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabHepatitisC() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧪 تست هپاتیت C"
      icon={<HealingIcon sx={{ color: "#f59e0b" }} />}
      testType=""  // ❌ بدون testType - فقط با کلمات کلیدی
      testKeywords={["هپاتیت c", "hepatitis c", "hcv"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}