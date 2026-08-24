// src/app/pages/laboratory/LabBiochemistry.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import BiotechIcon from "@mui/icons-material/Biotech";

export default function LabBiochemistry() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧬 بیوشیمی خون"
      icon={<BiotechIcon sx={{ color: "#8b5cf6" }} />}
      testType="biochemistry"  // ✅ مقدار صحیح
      testKeywords={["بیوشیمی", "biochemistry", "شیمیایی", "شیمی خون"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}