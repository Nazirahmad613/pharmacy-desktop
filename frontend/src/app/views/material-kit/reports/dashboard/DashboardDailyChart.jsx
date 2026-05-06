import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Paper,
} from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useAuth } from "app/contexts/AuthContext";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

const DashboardDailyChart = () => {
  const { api, user, loading: authLoading } = useAuth();
  const [rawData, setRawData] = useState([]);      // داده‌های روزانه از API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("daily");   // daily, monthly, yearly

  // 1. دریافت داده‌های روزانه (مانند جدول)
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/dashboard-daily");
        const responseData = Array.isArray(res.data) ? res.data : [];
        setRawData(responseData);
      } catch (err) {
        console.error(err);
        setError("خطا در دریافت داده‌ها. لطفاً دوباره تلاش کنید.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, api]);

  // 2. گروه‌بندی داده‌ها بر اساس دوره (روزانه، ماهانه، سالانه)
  const aggregatedData = useMemo(() => {
    if (!rawData.length) return [];

    // کمکی: تبدیل تاریخ شمسی به عدد سال و ماه (فرض کنید report_date به صورت "1403-01-01" است)
    const parseDate = (dateStr) => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return { year: 0, month: 0, day: 0 };
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10),
      };
    };

    if (period === "daily") {
      // همان داده‌های روزانه، فقط مرتب شده
      return [...rawData].sort((a, b) => (a.report_date > b.report_date ? 1 : -1));
    }

    if (period === "monthly") {
      // گروه‌بندی بر اساس سال و ماه
      const groups = new Map();
      rawData.forEach((item) => {
        const { year, month } = parseDate(item.report_date);
        if (!year || !month) return;
        const key = `${year}-${month}`;
        if (!groups.has(key)) {
          groups.set(key, {
            label: `${year}/${month}`,
            total_patients: 0,
            total_prescriptions: 0,
            total_sales: 0,
          });
        }
        const group = groups.get(key);
        group.total_patients += item.total_patients || 0;
        group.total_prescriptions += item.total_prescriptions || 0;
        group.total_sales += item.total_sales || 0;
      });
      // تبدیل به آرایه و مرتب‌سازی بر اساس سال و ماه
      return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
    }

    if (period === "yearly") {
      // گروه‌بندی بر اساس سال
      const groups = new Map();
      rawData.forEach((item) => {
        const { year } = parseDate(item.report_date);
        if (!year) return;
        const key = `${year}`;
        if (!groups.has(key)) {
          groups.set(key, {
            label: `${year}`,
            total_patients: 0,
            total_prescriptions: 0,
            total_sales: 0,
          });
        }
        const group = groups.get(key);
        group.total_patients += item.total_patients || 0;
        group.total_prescriptions += item.total_prescriptions || 0;
        group.total_sales += item.total_sales || 0;
      });
      return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
    }

    return [];
  }, [rawData, period]);

  // 3. آماده‌سازی داده‌های نمودار (سه خط)
  const chartData = useMemo(() => {
    if (!aggregatedData.length) return null;

    const labels = aggregatedData.map((item) => item.label);
    const patientsData = aggregatedData.map((item) => item.total_patients);
    const prescriptionsData = aggregatedData.map((item) => item.total_prescriptions);
    const salesData = aggregatedData.map((item) => item.total_sales);

    return {
      labels,
      datasets: [
        {
          label: "تعداد مریضان",
          data: patientsData,
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.1)",
          borderWidth: 2,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          yAxisID: "y", // محور چپ
        },
        {
          label: "تعداد نسخه‌ها",
          data: prescriptionsData,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.1)",
          borderWidth: 2,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          yAxisID: "y",
        },
        {
          label: "فروش کل (تومان)",
          data: salesData,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          borderWidth: 2,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          yAxisID: "y1", // محور راست برای فروش (مقیاس متفاوت)
        },
      ],
    };
  }, [aggregatedData]);

  // 4. تنظیمات نمودار با دو محور Y (چپ برای تعداد، راست برای مبلغ فروش)
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", rtl: true, labels: { font: { family: "Vazirmatn" } } },
      tooltip: {
        rtl: true,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || "";
            let value = context.raw;
            if (context.dataset.label.includes("فروش")) {
              value = value.toLocaleString("fa-IR") + " تومان";
            } else {
              value = value.toLocaleString("fa-IR");
            }
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: { display: true, text: "تعداد (مریض / نسخه)", font: { family: "Vazirmatn" } },
        ticks: { callback: (val) => val.toLocaleString("fa-IR") },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        title: { display: true, text: "فروش (تومان)", font: { family: "Vazirmatn" } },
        ticks: { callback: (val) => val.toLocaleString("fa-IR") },
        grid: { drawOnChartArea: false }, // خطوط شبکه را فقط برای محور چپ نشان بده
      },
      x: {
        ticks: { autoSkip: true, maxRotation: 45, minRotation: 45 },
        title: { display: true, text: period === "daily" ? "تاریخ" : period === "monthly" ? "ماه" : "سال", font: { family: "Vazirmatn" } },
      },
    },
  };

  // وضعیت‌های لودینگ و خطا
  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!rawData.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <Typography color="textSecondary">داده‌ای برای نمایش وجود ندارد</Typography>
      </Box>
    );
  }

  if (!chartData) return null;

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>نوع گزارش</InputLabel>
          <Select value={period} label="نوع گزارش" onChange={(e) => setPeriod(e.target.value)}>
            <MenuItem value="daily">روزانه</MenuItem>
            <MenuItem value="monthly">ماهانه</MenuItem>
            <MenuItem value="yearly">سالانه</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ height: 450, width: "100%" }}>
          <Line data={chartData} options={options} />
        </Box>
      </Paper>
    </Box>
  );
};

export default DashboardDailyChart;