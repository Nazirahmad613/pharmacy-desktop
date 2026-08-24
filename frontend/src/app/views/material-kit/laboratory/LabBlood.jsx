// src/app/pages/laboratory/LabBlood.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";

export default function LabBlood() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🧪 آزمایش خون (هماتولوژی)"
      icon={<BloodtypeIcon sx={{ color: "#ef4444" }} />}
      testType="blood"  // ✅ مقدار صحیح
      testKeywords={["خون", "blood", "هماتولوژی", "hematology", "CBC"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}