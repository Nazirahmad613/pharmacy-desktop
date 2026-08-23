// src/app/pages/laboratory/LabBloodGroup.jsx

import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";

export default function LabBloodGroup() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="گروپ خون (Blood Group)"
      icon={<BloodtypeIcon sx={{ color: "#ef4444" }} />}
      testKeywords={["گروپ خون", "blood group", "خون"]}
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}