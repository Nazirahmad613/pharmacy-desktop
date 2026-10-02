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
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("daily");

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

  const aggregatedData = useMemo(() => {
    if (!rawData.length) return [];

    // تاریخ شمسی به صورت "1403/01/01" یا "1403-01-01"
    const parseDate = (dateStr) => {
      if (!dateStr) return { year: 0, month: 0, day: 0 };
      const normalized = String(dateStr).replace(/\//g, "-");
      const parts = normalized.split("-");
      if (parts.length !== 3) return { year: 0, month: 0, day: 0 };
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10),
      };
    };

    if (period === "daily") {
      return [...rawData].sort((a, b) =>
        String(a.report_date).localeCompare(String(b.report_date))
      );
    }

    if (period === "monthly") {
      const groups = new Map();
      rawData.forEach((item) => {
        const { year, month } = parseDate(item.report_date);
        if (!year || !month) return;
        const key = `${year}-${String(month).padStart(2, "0")}`;
        if (!groups.has(key)) {
          groups.set(key, {
            label: `${year}/${String(month).padStart(2, "0")}`,
            total_patients: 0,
            total_prescriptions: 0,
            total_sales: 0,
          });
        }
        const g = groups.get(key);
        g.total_patients += Number(item.total_patients) || 0;
        g.total_prescriptions += Number(item.total_prescriptions) || 0;
        g.total_sales += Number(item.total_sales) || 0;
      });
      return Array.from(groups.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    }

    if (period === "yearly") {
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
        const g = groups.get(key);
        g.total_patients += Number(item.total_patients) || 0;
        g.total_prescriptions += Number(item.total_prescriptions) || 0;
        g.total_sales += Number(item.total_sales) || 0;
      });
      return Array.from(groups.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    }

    return [];
  }, [rawData, period]);

  const chartData = useMemo(() => {
    if (!aggregatedData.length) return null;

    const labels = aggregatedData.map((item) =>
      period === "daily" ? item.report_date : item.label
    );
    const patientsData = aggregatedData.map((i) => Number(i.total_patients) || 0);
    const prescriptionsData = aggregatedData.map(
      (i) => Number(i.total_prescriptions) || 0
    );
    const salesData = aggregatedData.map((i) => Number(i.total_sales) || 0);

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
          yAxisID: "y",
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
          label: "فروش کل (افغانی)",
          data: salesData,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          borderWidth: 2,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          yAxisID: "y1",
        },
      ],
    };
  }, [aggregatedData, period]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", rtl: true },
      tooltip: {
        rtl: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || "";
            let value = context.raw;
            if (String(label).includes("فروش")) {
              value = Number(value).toLocaleString("fa-IR") + " افغانی";
            } else {
              value = Number(value).toLocaleString("fa-IR");
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
        title: { display: true, text: "تعداد (مریض / نسخه)" },
        ticks: { callback: (val) => Number(val).toLocaleString("fa-IR") },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        title: { display: true, text: "فروش (افغانی)" },
        ticks: { callback: (val) => Number(val).toLocaleString("fa-IR") },
        grid: { drawOnChartArea: false },
      },
      x: {
        ticks: { autoSkip: true, maxRotation: 45, minRotation: 45 },
        title: {
          display: true,
          text: period === "daily" ? "تاریخ" : period === "monthly" ? "ماه" : "سال",
        },
      },
    },
  };

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
          <Select
            value={period}
            label="نوع گزارش"
            onChange={(e) => setPeriod(e.target.value)}
          >
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