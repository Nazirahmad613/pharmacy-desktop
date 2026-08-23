// src/app/pages/laboratory/LabBloodSugar.jsx

import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";

export default function LabBloodSugar() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="قند خون (Blood Sugar)"
      icon={<MonitorHeartIcon sx={{ color: "#ec4899" }} />}
      testKeywords={["قند", "blood sugar", "گلوکز", "glucose"]}
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}