// src/app/pages/laboratory/LabSerology.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabSerology() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧫 سرولوژی"
      icon={<HealingIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />}
      testType="serology"
      testKeywords={["سرولوژی", "serology", "سیفلیس", "روبلا", "توکسوپلاسموز", "VDRL", "Rubella", "Toxoplasmosis"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}