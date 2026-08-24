// src/app/pages/laboratory/LabUrine.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import WaterIcon from "@mui/icons-material/Water";

export default function LabUrine() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="💧 آنالیز ادرار"
      icon={<WaterIcon sx={{ color: "#fcd34d" }} />}
      testType="urine"  // ✅ مقدار صحیح
      testKeywords={["ادرار", "urine", "آنالیز ادرار"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}