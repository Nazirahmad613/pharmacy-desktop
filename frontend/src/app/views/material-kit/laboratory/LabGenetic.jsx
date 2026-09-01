// src/app/pages/laboratory/LabGenetic.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import ScienceIcon from "@mui/icons-material/Science";

export default function LabGenetic() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧬 آزمایش ژنتیک"
      icon={<ScienceIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />}
      testType="genetic"
      testKeywords={["ژنتیک", "genetic", "PCR", "کاریوتایپ", "karyotyping"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}