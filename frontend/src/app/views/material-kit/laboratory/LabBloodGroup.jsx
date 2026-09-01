// src/app/pages/laboratory/LabBloodGroup.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";

export default function LabBloodGroup() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🩸 گروپ خون"
      icon={<BloodtypeIcon sx={{ fontSize: 40, color: "#3b82f6" }} />}
      testType=""
      testKeywords={["گروپ خون", "blood group", "ABO"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}