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

// کارت‌های انیمیشنی
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

  // آمار موجودی بر اساس محدوده
  const stockStats = useMemo(() => {
    let low = 0, medium = 0, high = 0;
    data.forEach(item => {
      if (item.available_stock <= 10) low++;
      else if (item.available_stock <= 50) medium++;
      else high++;
    });
    return { low, medium, high };
  }, [data]);

  // آمار وضعیت انقضا
  const expiryStats = useMemo(() => {
    let expired = 0, nearExpiry = 0, valid = 0;
    data.forEach(item => {
      if (item.expiry_status === "EXPIRED") expired++;
      else if (item.expiry_status === "NEAR_EXPIRY") nearExpiry++;
      else valid++;
    });
    return { expired, nearExpiry, valid };
  }, [data]);

  // آمار موجودی بر اساس تأمین‌کننده
  const supplierStats = useMemo(() => {
    const supplierMap = new Map();
    
    data.forEach(item => {
      const supplierName = item.supplier_name || "نامشخص";
      const currentStock = supplierMap.get(supplierName) || 0;
      supplierMap.set(supplierName, currentStock + (item.available_stock || 0));
    });
    
    const sortedSuppliers = Array.from(supplierMap.entries())
      .map(([name, stock]) => ({ name, stock }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8);
    
    return sortedSuppliers;
  }, [data]);

  // آمار تعداد داروها بر اساس تأمین‌کننده
  const supplierCountStats = useMemo(() => {
    const supplierMap = new Map();
    
    data.forEach(item => {
      const supplierName = item.supplier_name || "نامشخص";
      const currentCount = supplierMap.get(supplierName) || 0;
      supplierMap.set(supplierName, currentCount + 1);
    });
    
    const sortedSuppliers = Array.from(supplierMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    
    return sortedSuppliers;
  }, [data]);

  // رنگ‌های متنوع برای چارت تأمین‌کنندگان
  const supplierColors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#C9CBCF", "#7BC225", "#F7464A", "#46BFBD",
    "#FDB45C", "#949FB1", "#4D5360", "#E7E9ED", "#1E88E5"
  ];

  // ✅ تعریف توابع navigate - فقط برای کلیک روی کارت‌ها
  const handleSevereClick = () => {
    navigate("/reports/medication-stock?stockRange=0-10");
  };

  const handleNearExpiryClick = () => {
    navigate("/reports/medication-stock?expiryStatus=NEAR_EXPIRY");
  };

  const handleSupplierClick = (supplierName) => {
    navigate(`/reports/medication-stock?supplier=${encodeURIComponent(supplierName)}`);
  };

  // ✅ گزینه‌های چارت بدون قابلیت کلیک (فقط نمایشی)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom", rtl: true },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} مورد` } },
    },
    // ✅ حذف onClick از چارت‌های اصلی
  };

  // ✅ گزینه‌های چارت تأمین‌کنندگان با قابلیت کلیک (برای رفتن به جزئیات)
  const supplierChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom", rtl: true },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toLocaleString()} عدد` } },
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const supplierName = supplierStats[index]?.name;
        if (supplierName && supplierName !== "نامشخص") {
          handleSupplierClick(supplierName);
        }
      }
    },
  };

  const supplierCountChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom", rtl: true },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} مورد` } },
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const supplierName = supplierCountStats[index]?.name;
        if (supplierName && supplierName !== "نامشخص") {
          handleSupplierClick(supplierName);
        }
      }
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

  const supplierPieData = {
    labels: supplierStats.map(s => s.name),
    datasets: [{
      data: supplierStats.map(s => s.stock),
      backgroundColor: supplierColors.slice(0, supplierStats.length),
      borderColor: "#fff",
      borderWidth: 1,
    }],
  };

  const supplierCountPieData = {
    labels: supplierCountStats.map(s => s.name),
    datasets: [{
      data: supplierCountStats.map(s => s.count),
      backgroundColor: supplierColors.slice(0, supplierCountStats.length),
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
      {/* کارت‌های هشدار چشمک‌زن - کلیک به صفحه جزئیات می‌رود */}
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
        {/* ✅ چارت توزیع موجودی - بدون کلیک (فقط نمایش) */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              توزیع وضعیت موجودی
            </Typography>
            <Box sx={{ maxWidth: 250, mx: "auto" }}>
              <Pie data={stockPieData} options={chartOptions} />
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={1}>
              🔴 کمبود شدید &nbsp;&nbsp; 🟡 متوسط &nbsp;&nbsp; 🔵 زیاد
            </Typography>
            <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={0.5}>
              ※ برای مشاهده جزئیات روی کارت قرمز بالا کلیک کنید
            </Typography>
          </Card>
        </Grid>

        {/* ✅ چارت وضعیت انقضا - بدون کلیک (فقط نمایش) */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              توزیع وضعیت انقضا
            </Typography>
            <Box sx={{ maxWidth: 250, mx: "auto" }}>
              <Pie data={expiryPieData} options={chartOptions} />
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={1}>
              🔴 تاریخ گذشته &nbsp;&nbsp; 🟠 نزدیک به انقضا &nbsp;&nbsp; 🔵 معتبر
            </Typography>
            <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={0.5}>
              ※ برای مشاهده جزئیات روی کارت نارنجی بالا کلیک کنید
            </Typography>
          </Card>
        </Grid>

        {/* ✅ چارت توزیع موجودی بر اساس تأمین‌کننده - با کلیک (برای رفتن به جزئیات) */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              🏭 توزیع موجودی بر اساس تأمین‌کننده
            </Typography>
            {supplierStats.length > 0 ? (
              <>
                <Box sx={{ maxWidth: 280, mx: "auto" }}>
                  <Pie data={supplierPieData} options={supplierChartOptions} />
                </Box>
                <Typography variant="caption" display="block" textAlign="center" mt={1}>
                  {supplierStats.length} تأمین‌کننده | کلیک روی هر بخش برای مشاهده جزئیات
                </Typography>
              </>
            ) : (
              <Typography variant="body2" textAlign="center" color="text.secondary">
                داده‌ای برای نمایش وجود ندارد
              </Typography>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* ردیف دوم: چارت تعداد داروها و لیست تأمین‌کنندگان */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              📊 تعداد داروها بر اساس تأمین‌کننده
            </Typography>
            {supplierCountStats.length > 0 ? (
              <>
                <Box sx={{ maxWidth: 350, mx: "auto" }}>
                  <Pie data={supplierCountPieData} options={supplierCountChartOptions} />
                </Box>
                <Typography variant="caption" display="block" textAlign="center" mt={1}>
                  {supplierCountStats.length} تأمین‌کننده | کلیک روی هر بخش برای مشاهده جزئیات
                </Typography>
              </>
            ) : (
              <Typography variant="body2" textAlign="center" color="text.secondary">
                داده‌ای برای نمایش وجود ندارد
              </Typography>
            )}
          </Card>
        </Grid>

        {/* کارت خلاصه تأمین‌کنندگان - با کلیک روی هر ردیف */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              🏢 لیست تأمین‌کنندگان و موجودی
            </Typography>
            <Box sx={{ maxHeight: 280, overflow: "auto" }}>
              {supplierStats.map((supplier, index) => (
                <Box
                  key={index}
                  onClick={() => supplier.name !== "نامشخص" && handleSupplierClick(supplier.name)}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1,
                    borderBottom: "1px solid #e0e0e0",
                    cursor: supplier.name !== "نامشخص" ? "pointer" : "default",
                    transition: "background-color 0.2s",
                    "&:hover": supplier.name !== "نامشخص" ? { backgroundColor: "#f5f5f5" } : {}
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: supplierColors[index % supplierColors.length]
                      }}
                    />
                    <Typography variant="body2" fontWeight="500">
                      {supplier.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      موجودی: {supplier.stock.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {((supplier.stock / supplierStats.reduce((sum, s) => sum + s.stock, 0)) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={2} color="text.secondary">
              مجموع موجودی کل: {supplierStats.reduce((sum, s) => sum + s.stock, 0).toLocaleString()} عدد
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}