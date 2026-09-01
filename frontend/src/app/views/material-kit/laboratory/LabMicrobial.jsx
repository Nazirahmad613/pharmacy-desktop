// src/app/pages/laboratory/LabMicrobial.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import BiotechIcon from "@mui/icons-material/Biotech";

export default function LabMicrobial() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🦠 آزمایش میکروبی"
      icon={<BiotechIcon sx={{ fontSize: 40, color: "#22c55e" }} />}
      testType="microbial"
      testKeywords={["میکروبی", "کشت", "باکتری", "قارچ", "microbial", "culture", "bacteria", "fungal"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}