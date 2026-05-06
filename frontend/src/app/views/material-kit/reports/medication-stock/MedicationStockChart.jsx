// src/components/reports/StockShortagePieChart.jsx
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "app/contexts/AuthContext";
import { Box, Card, Grid, Typography, CircularProgress } from "@mui/material";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useNavigate } from "react-router-dom";
import { keyframes } from "@emotion/react";
import { styled } from "@mui/material/styles";

ChartJS.register(ArcElement, Tooltip, Legend);

// انیمیشن چشمک‌زن قوی برای کمبود شدید (قرمز)
const blinkRed = keyframes`
  0% { 
    opacity: 1; 
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.8);
    transform: scale(1);
  }
  50% { 
    opacity: 0.3; 
    box-shadow: 0 0 0 15px rgba(211, 47, 47, 0);
    transform: scale(1.03);
  }
  100% { 
    opacity: 1; 
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0);
    transform: scale(1);
  }
`;

// انیمیشن چشمک‌زن قوی برای نزدیک به انقضا (نارنجی)
const blinkOrange = keyframes`
  0% { 
    opacity: 1; 
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.8);
    transform: scale(1);
  }
  50% { 
    opacity: 0.3; 
    box-shadow: 0 0 0 15px rgba(255, 152, 0, 0);
    transform: scale(1.03);
  }
  100% { 
    opacity: 1; 
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
    transform: scale(1);
  }
`;

// کارت‌های انیمیشنی با انیمیشن سریع‌تر (0.8s)
const AnimatedRedCard = styled(Card)({
  animation: `${blinkRed} 0.8s ease-in-out infinite`,
  transition: "transform 0.2s",
  "&:hover": {
    transform: "scale(1.02) !important",
  },
});

const AnimatedOrangeCard = styled(Card)({
  animation: `${blinkOrange} 0.8s ease-in-out infinite`,
  transition: "transform 0.2s",
  "&:hover": {
    transform: "scale(1.02) !important",
  },
});

export default function StockShortagePieChart() {
  const { api, user, loading: authLoading } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("❌ لطفاً ابتدا وارد سیستم شوید");
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/reports/medication-stock");
        setData(res.data || []);
      } catch (err) {
        console.error(err);
        setError("خطا در دریافت داده‌ها");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, user, authLoading]);

  const stockStats = useMemo(() => {
    let low = 0, medium = 0, high = 0;
    data.forEach(item => {
      if (item.available_stock <= 10) low++;
      else if (item.available_stock <= 50) medium++;
      else high++;
    });
    return { low, medium, high };
  }, [data]);

  const expiryStats = useMemo(() => {
    let expired = 0, nearExpiry = 0, valid = 0;
    data.forEach(item => {
      if (item.expiry_status === "EXPIRED") expired++;
      else if (item.expiry_status === "NEAR_EXPIRY") nearExpiry++;
      else valid++;
    });
    return { expired, nearExpiry, valid };
  }, [data]);

  const handleSevereClick = () => {
    navigate("/reports/medication-stock?stockRange=0-10");
  };

  const handleNearExpiryClick = () => {
    navigate("/reports/medication-stock?expiryStatus=NEAR_EXPIRY");
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom", rtl: true },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} مورد` } },
    },
  };

  const stockPieData = {
    labels: ["کمبود شدید (≤۱۰)", "متوسط (۱۱-۵۰)", "زیاد (>۵۰)"],
    datasets: [{
      data: [stockStats.low, stockStats.medium, stockStats.high],
      backgroundColor: ["#FF6384", "#FFCE56", "#36A2EB"],
      borderColor: "#fff",
      borderWidth: 1,
    }],
  };

  const expiryPieData = {
    labels: ["تاریخ گذشته", "نزدیک به انقضا", "معتبر"],
    datasets: [{
      data: [expiryStats.expired, expiryStats.nearExpiry, expiryStats.valid],
      backgroundColor: ["#FF6384", "#FF9F40", "#4BC0C0"],
      borderColor: "#fff",
      borderWidth: 1,
    }],
  };

  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" textAlign="center" p={3}>
        {error}
      </Typography>
    );
  }

  if (data.length === 0) {
    return (
      <Typography textAlign="center" p={3}>
        داده‌ای برای نمایش وجود ندارد.
      </Typography>
    );
  }

  return (
    <Box p={2}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <AnimatedRedCard
            onClick={handleSevereClick}
            sx={{
              backgroundColor: "#FFEBEE",
              borderLeft: "6px solid #d32f2f",
              padding: "12px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Typography variant="subtitle2" color="error" fontWeight="bold">
              ⚠️ کمبود شدید
            </Typography>
            <Typography variant="h5" color="error" fontWeight="bold">
              {stockStats.low}
            </Typography>
            <Typography variant="caption">مورد دارو با موجودی ≤۱۰</Typography>
          </AnimatedRedCard>
        </Grid>
        <Grid item xs={12} sm={6}>
          <AnimatedOrangeCard
            onClick={handleNearExpiryClick}
            sx={{
              backgroundColor: "#FFF3E0",
              borderLeft: "6px solid #ff9800",
              padding: "12px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Typography variant="subtitle2" color="#e65100" fontWeight="bold">
              ⏳ نزدیک به انقضا
            </Typography>
            <Typography variant="h5" color="#e65100" fontWeight="bold">
              {expiryStats.nearExpiry}
            </Typography>
            <Typography variant="caption">کمتر از ۳۰ روز باقی‌مانده</Typography>
          </AnimatedOrangeCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              توزیع وضعیت موجودی
            </Typography>
            <Box sx={{ maxWidth: 280, mx: "auto" }}>
              <Pie data={stockPieData} options={chartOptions} />
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={1}>
              🔴 کمبود شدید &nbsp;&nbsp; 🟡 متوسط &nbsp;&nbsp; 🔵 زیاد
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              توزیع وضعیت انقضا
            </Typography>
            <Box sx={{ maxWidth: 280, mx: "auto" }}>
              <Pie data={expiryPieData} options={chartOptions} />
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={1}>
              🔴 تاریخ گذشته &nbsp;&nbsp; 🟠 نزدیک به انقضا &nbsp;&nbsp; 🔵 معتبر
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}