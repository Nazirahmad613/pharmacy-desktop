// src/app/pages/laboratory/LabParasitology.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import HealingIcon from "@mui/icons-material/Healing";

export default function LabParasitology() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🦟 انگل‌شناسی"
      icon={<HealingIcon sx={{ fontSize: 40, color: "#22c55e" }} />}
      testType="parasitology"
      testKeywords={["انگل", "parasite", "کالا آزار", "لیشمانیوز", "مالاریا", "kala azar", "leishmaniasis", "malaria"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}