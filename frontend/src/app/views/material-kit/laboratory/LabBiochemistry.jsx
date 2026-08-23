// src/app/pages/laboratory/LabBiochemistry.jsx

import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import BiotechIcon from "@mui/icons-material/Biotech";

export default function LabBiochemistry() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="بیوشیمی خون"
      icon={<BiotechIcon sx={{ color: "#8b5cf6" }} />}
      testType="biochemistry"
      testKeywords={["بیوشیمی", "biochemistry", "شیمیایی"]}
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}