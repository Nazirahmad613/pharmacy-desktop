// src/app/pages/laboratory/LabUrine.jsx

import React from "react";
import LabBasePage from "./LabBasePage";
import WaterIcon from "@mui/icons-material/Water";

export default function LabUrine() {
  return (
    <LabBasePage
      title="آنالیز ادرار"
      icon={<WaterIcon sx={{ color: "#fcd34d" }} />}
      testType="urine"
      testKeywords={["ادرار", "urine", "آنالیز ادرار"]}
      backPath="/material/lab-hematology"
    />
  );
}