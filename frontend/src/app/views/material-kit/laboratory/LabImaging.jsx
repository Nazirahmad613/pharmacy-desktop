// src/app/pages/laboratory/LabImaging.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

export default function LabImaging() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="📷 تصویربرداری"
      icon={<LocalHospitalIcon sx={{ fontSize: 40, color: "#3b82f6" }} />}
      testType="imaging"
      testKeywords={["تصویربرداری", "imaging", "سونوگرافی", "رادیوگرافی", "سی‌تی اسکن", "ام‌آرآی", "ultrasound", "xray", "ct scan", "mri"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}