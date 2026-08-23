// src/app/pages/laboratory/LabHepatitisB.jsx

import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabHepatitisB() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="تست هپاتیت B"
      icon={<HealingIcon sx={{ color: "#f97316" }} />}
      testKeywords={["هپاتیت b", "hepatitis b", "hbsag"]}
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}