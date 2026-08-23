// src/app/pages/laboratory/LabHIV.jsx

import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabHIV() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="تست HIV / AIDS"
      icon={<HealingIcon sx={{ color: "#ef4444" }} />}
      testKeywords={["hiv", "ایدز", "aids"]}
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}