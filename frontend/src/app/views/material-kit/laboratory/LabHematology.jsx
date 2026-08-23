// src/app/pages/laboratory/LabHematology.jsx

import React from "react";
import LabBasePage from "./LabBasePage";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";

export default function LabHematology() {
  return (
    <LabBasePage
      title="آزمایش خون (هماتولوژی)"
      icon={<BloodtypeIcon sx={{ color: "#ef4444" }} />}
      testType="blood"
      testKeywords={["خون", "blood", "هماتولوژی", "hematology", "CBC"]}
      backPath="/material/lab-hematology"
      isMainPage={true}
    />
  );
}