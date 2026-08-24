// src/app/pages/laboratory/LabHematology.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Badge,
} from "@mui/material";
import {
  Bloodtype as BloodtypeIcon,
  Water as WaterIcon,
  Biotech as BiotechIcon,
  MonitorHeart as MonitorHeartIcon,
  Healing as HealingIcon,
  Science as ScienceIcon,
} from "@mui/icons-material";

export default function LabHematology() {
  const navigate = useNavigate();
  const [badgeCounts, setBadgeCounts] = useState({
    blood: 0,
    urine: 0,
    biochemistry: 0,
    bloodSugar: 0,
    hepatitisB: 0,
    hepatitisC: 0,
    hiv: 0,
    malaria: 0,
    bloodGroup: 0,
  });

  // ============ دریافت تعداد درخواست‌ها ============
  const fetchBadgeCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/api/laboratory-requests/all", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return;

      const result = await response.json();
      let allRequests = [];

      if (result.success) {
        if (Array.isArray(result.data)) {
          allRequests = result.data;
        } else if (result.data.all_requests && Array.isArray(result.data.all_requests)) {
          allRequests = result.data.all_requests;
        }
      }

      // فقط درخواست‌های دارای فیس
      const paidRequests = allRequests.filter((r) => r.has_fee === true);

      // شمارش بر اساس نوع تست
      const counts = {
        blood: paidRequests.filter((r) => 
          r.test_type === "blood" || 
          (r.test_name && ["خون", "blood", "cbc", "هماتولوژی"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        urine: paidRequests.filter((r) => 
          r.test_type === "urine" || 
          (r.test_name && ["ادرار", "urine"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        biochemistry: paidRequests.filter((r) => 
          r.test_type === "biochemistry" || 
          (r.test_name && ["بیوشیمی", "biochemistry"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        bloodSugar: paidRequests.filter((r) => 
          (r.test_name && ["قند", "blood sugar", "گلوکز", "glucose"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        hepatitisB: paidRequests.filter((r) => 
          (r.test_name && ["هپاتیت b", "hepatitis b", "hbsag"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        hepatitisC: paidRequests.filter((r) => 
          (r.test_name && ["هپاتیت c", "hepatitis c", "hcv"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        hiv: paidRequests.filter((r) => 
          (r.test_name && ["hiv", "ایدز", "aids"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        malaria: paidRequests.filter((r) => 
          (r.test_name && ["مالاریا", "malaria", "پلاسمودیوم"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
        bloodGroup: paidRequests.filter((r) => 
          (r.test_name && ["گروپ خون", "blood group"].some(k => 
            (r.test_name || "").toLowerCase().includes(k.toLowerCase())
          ))
        ).length,
      };

      setBadgeCounts(counts);
    } catch (error) {
      console.error("❌ خطا در دریافت تعداد:", error);
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // ============ کارت‌های منو ============
  const menuItems = [
    {
      id: "blood",
      title: "🧪 آزمایش خون (هماتولوژی)",
      icon: <BloodtypeIcon sx={{ fontSize: 40, color: "#ef4444" }} />,
      path: "/material/lab-blood",
      badgeCount: badgeCounts.blood,
    },
    {
      id: "urine",
      title: "💧 آنالیز ادرار",
      icon: <WaterIcon sx={{ fontSize: 40, color: "#fcd34d" }} />,
      path: "/material/lab-urine",
      badgeCount: badgeCounts.urine,
    },
    {
      id: "biochemistry",
      title: "🧬 بیوشیمی خون",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      path: "/material/lab-biochemistry",
      badgeCount: badgeCounts.biochemistry,
    },
    {
      id: "bloodSugar",
      title: "🩸 قند خون",
      icon: <MonitorHeartIcon sx={{ fontSize: 40, color: "#ec4899" }} />,
      path: "/material/lab-blood-sugar",
      badgeCount: badgeCounts.bloodSugar,
    },
    {
      id: "hepatitisB",
      title: "🧪 تست هپاتیت B",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#f97316" }} />,
      path: "/material/lab-hepatitis-b",
      badgeCount: badgeCounts.hepatitisB,
    },
    {
      id: "hepatitisC",
      title: "🧪 تست هپاتیت C",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#f59e0b" }} />,
      path: "/material/lab-hepatitis-c",
      badgeCount: badgeCounts.hepatitisC,
    },
    {
      id: "hiv",
      title: "🧫 تست HIV / AIDS",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#ef4444" }} />,
      path: "/material/lab-hiv",
      badgeCount: badgeCounts.hiv,
    },
    {
      id: "malaria",
      title: "🦟 تست مالاریا",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#22c55e" }} />,
      path: "/material/lab-malaria",
      badgeCount: badgeCounts.malaria,
    },
    {
      id: "bloodGroup",
      title: "🩸 گروپ خون",
      icon: <BloodtypeIcon sx={{ fontSize: 40, color: "#3b82f6" }} />,
      path: "/material/lab-blood-group",
      badgeCount: badgeCounts.bloodGroup,
    },
    {
      id: "results",
      title: "📄 ثبت نتایج",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#06b6d4" }} />,
      path: "/material/lab-results",
      badgeCount: 0,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <BloodtypeIcon sx={{ fontSize: 35, color: "#ef4444" }} />
        🧪 لابراتوار
        <Typography variant="body2" sx={{ color: "#9ca3af", fontWeight: "normal" }}>
          - مدیریت آزمایشات
        </Typography>
      </Typography>

      <Grid container spacing={3}>
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            <Card
              sx={{
                bgcolor: "#1a2a3a",
                borderRadius: "12px",
                border: "1px solid #374151",
                transition: "all 0.3s",
                cursor: "pointer",
                "&:hover": {
                  transform: "translateY(-4px)",
                  borderColor: "#60a5fa",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                },
              }}
              onClick={() => navigate(item.path)}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" sx={{ color: "white", fontWeight: "bold", fontSize: "14px" }}>
                  {item.title}
                </Typography>
                {item.badgeCount > 0 && (
                  <Badge
                    badgeContent={item.badgeCount}
                    color="error"
                    sx={{
                      mt: 1,
                      "& .MuiBadge-badge": {
                        fontSize: "14px",
                        fontWeight: "bold",
                        backgroundColor: "#ef4444",
                        color: "white",
                        padding: "0 8px",
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "#9ca3af", visibility: "hidden" }}>
                      -
                    </Typography>
                  </Badge>
                )}
                {item.badgeCount === 0 && (
                  <Typography variant="body2" sx={{ color: "#6b7280", mt: 1 }}>
                    هیچ درخواستی
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}