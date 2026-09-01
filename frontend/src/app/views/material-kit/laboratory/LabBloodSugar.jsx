// src/app/pages/laboratory/LabBloodSugar.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";

export default function LabBloodSugar() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🩸 قند خون"
      icon={<MonitorHeartIcon sx={{ fontSize: 40, color: "#ec4899" }} />}
      testType=""
      testKeywords={["قند", "blood sugar", "گلوکز", "glucose", "FBS"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}