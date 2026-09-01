// src/app/pages/laboratory/LabHIV.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabHIV() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧫 تست HIV / AIDS"
      icon={<HealingIcon sx={{ fontSize: 40, color: "#ef4444" }} />}
      testType=""
      testKeywords={["hiv", "ایدز", "aids"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}