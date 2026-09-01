// src/app/pages/laboratory/LabStool.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

export default function LabStool() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="💩 آزمایش مدفوع"
      icon={<LocalHospitalIcon sx={{ fontSize: 40, color: "#f59e0b" }} />}
      testType="stool"
      testKeywords={["مدفوع", "stool", "کشت", "خون مخفی", "occult blood"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}