// src/app/pages/laboratory/LabPathology.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import ScienceIcon from "@mui/icons-material/Science";

export default function LabPathology() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🔬 پاتولوژی"
      icon={<ScienceIcon sx={{ fontSize: 40, color: "#ef4444" }} />}
      testType="pathology"
      testKeywords={["پاتولوژی", "pathology", "بیوپسی", "سیتولوژی", "biopsy", "cytology"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}