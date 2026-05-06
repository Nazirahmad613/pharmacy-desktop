import { useEffect, useState } from "react";
import {
  Box,
  Card,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Alert
} from "@mui/material";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import api from "../../../../api";

ChartJS.register(
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function BenefitsChart() {
  const [type, setType] = useState("monthly");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/benefits", {
        params: { type, month, year }
      });
      
      // ایمن‌سازی داده دریافتی
      let responseData = [];
      if (res.data) {
        if (Array.isArray(res.data)) {
          responseData = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          responseData = res.data.data;
        } else if (res.data.results && Array.isArray(res.data.results)) {
          responseData = res.data.results;
        }
      }
      
      setData(responseData);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت داده‌ها");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = () => {
    fetchData();
  };

  // بررسی وجود داده (با ایمنی کامل)
  const hasData = data && Array.isArray(data) && data.length > 0;

  // تابع ایمن برای دریافت اعداد
  const getSafeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // آماده‌سازی لیبل‌ها (فقط اگر داده وجود داشته باشد)
  const labels = hasData ? data.map((item) => {
    if (type === "yearly") return item?.year || "نامشخص";
    if (type === "monthly") return item?.month || "نامشخص";
    return item?.journal_date || "نامشخص";
  }) : [];

  // آماده‌سازی داده‌های نمودار
  const chartData = {
    labels: labels,
    datasets: hasData ? [
      {
        label: "درآمد",
        data: data.map((item) => getSafeNumber(item?.total_credit)),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
      {
        label: "مصارف",
        data: data.map((item) => getSafeNumber(item?.total_debit)),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
      {
        label: "سود خالص",
        data: data.map((item) => getSafeNumber(item?.net_benefit)),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      }
    ] : []
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const formattedValue = typeof value === 'number' ? value.toLocaleString('fa-IR') : '0';
            return `${context.dataset.label}: ${formattedValue}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => value?.toLocaleString('fa-IR') || '0'
        }
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography mr={2}>در حال بارگذاری...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleSearch}>
          تلاش مجدد
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="نوع گزارش"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="daily">روزانه</MenuItem>
              <MenuItem value="monthly">ماهانه</MenuItem>
              <MenuItem value="yearly">سالانه</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              label="ماه"
              fullWidth
              placeholder="مثلاً 1"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              label="سال"
              fullWidth
              placeholder="مثلاً 1403"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button variant="contained" fullWidth onClick={handleSearch}>
              نمایش
            </Button>
          </Grid>
        </Grid>
      </Card>

      {!hasData && !loading && !error && (
        <Card sx={{ mt: 3, p: 5 }}>
          <Typography variant="h6" textAlign="center" color="textSecondary">
            داده‌ای برای نمایش وجود ندارد
          </Typography>
          <Typography variant="body2" textAlign="center" color="textSecondary" mt={1}>
            لطفاً فیلترهای جستجو را تغییر دهید یا داده‌ای ایجاد کنید
          </Typography>
        </Card>
      )}
      
      {hasData && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                نمودار فواید (میله‌ای)
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                <Bar data={chartData} options={options} />
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                نمودار روند سود (خطی)
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                <Line data={chartData} options={options} />
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}