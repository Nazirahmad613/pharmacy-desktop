// src/app/pages/laboratory/LabHepatitisC.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabHepatitisC() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧪 تست هپاتیت C"
      icon={<HealingIcon sx={{ fontSize: 40, color: "#f59e0b" }} />}
      testType=""
      testKeywords={["هپاتیت c", "hepatitis c", "hcv"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}