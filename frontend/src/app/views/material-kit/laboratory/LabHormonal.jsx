// src/app/pages/laboratory/LabHormonal.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import ScienceIcon from "@mui/icons-material/Science";

export default function LabHormonal() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧬 هورمون‌ها"
      icon={<ScienceIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />}
      testType="hormonal"
      testKeywords={["هورمون", "hormonal", "تیروئید", "تستوسترون", "استروژن", "FSH", "LH", "TSH", "T3", "T4"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}