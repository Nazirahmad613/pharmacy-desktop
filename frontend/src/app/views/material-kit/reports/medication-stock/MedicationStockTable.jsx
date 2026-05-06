// src/components/reports/StockShortageReport.jsx
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "app/contexts/AuthContext";
import ReportLayout from "../../../../../components/ReportLayout";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  Grid,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Typography,
  CircularProgress,
  Chip,
} from "@mui/material";

export default function StockShortageReport() {
  const { api, user, loading: authLoading } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // خواندن پارامترها از URL
  const initialStockRange = searchParams.get("stockRange") || "0-20";
  const initialExpiryFilter = searchParams.get("expiryStatus") || "all";

  // فیلترها
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryFilter, setExpiryFilter] = useState(initialExpiryFilter);
  const [stockRangeFilter, setStockRangeFilter] = useState(initialStockRange);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // اگر پارامترها در URL تغییر کرد (مثلاً با کلیک روی هشدار)، فیلترها به‌روز شوند
  useEffect(() => {
    const newStockRange = searchParams.get("stockRange");
    const newExpiry = searchParams.get("expiryStatus");
    if (newStockRange) setStockRangeFilter(newStockRange);
    if (newExpiry) setExpiryFilter(newExpiry);
  }, [searchParams]);

  // حذف پارامترها از URL وقتی کاربر فیلترها را دستی تغییر داد (اختیاری)
  useEffect(() => {
    const currentStockRange = searchParams.get("stockRange");
    const currentExpiry = searchParams.get("expiryStatus");
    if (stockRangeFilter !== currentStockRange || expiryFilter !== currentExpiry) {
      setSearchParams({});
    }
  }, [stockRangeFilter, expiryFilter, setSearchParams]);

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

  useEffect(() => setPage(0), [searchTerm, expiryFilter, stockRangeFilter]);

  const isStockInRange = (stock, range) => {
    switch (range) {
      case "0-10": return stock >= 0 && stock <= 10;
      case "11-20": return stock >= 11 && stock <= 20;
      case "21-50": return stock >= 21 && stock <= 50;
      case "51+": return stock >= 51;
      case "0-20": return stock >= 0 && stock <= 20;
      case "all": return true;
      default: return true;
    }
  };

  const filteredData = useMemo(() => {
    let filtered = data;
    filtered = filtered.filter(item => isStockInRange(item.available_stock, stockRangeFilter));
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.medication_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (expiryFilter !== "all") {
      filtered = filtered.filter(item => item.expiry_status === expiryFilter);
    }
    return filtered;
  }, [data, searchTerm, expiryFilter, stockRangeFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setExpiryFilter("all");
    setStockRangeFilter("0-20");
    setPage(0);
    setSearchParams({});
  };

  const getStockChip = (stock) => {
    if (stock <= 10) return <Chip label="کمبود شدید" color="error" size="small" />;
    if (stock <= 20) return <Chip label="نزدیک به کمبود" color="warning" size="small" />;
    if (stock <= 50) return <Chip label="متوسط" color="info" size="small" />;
    return <Chip label="زیاد" color="success" size="small" />;
  };

  const getExpiryChip = (status) => {
    if (status === "EXPIRED") return <Chip label="تاریخ گذشته" color="error" size="small" />;
    if (status === "NEAR_EXPIRY") return <Chip label="نزدیک به انقضا" color="warning" size="small" />;
    return <Chip label="معتبر" color="success" size="small" />;
  };

  if (authLoading || loading) {
    return (
      <ReportLayout>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </ReportLayout>
    );
  }

  if (error) {
    return (
      <ReportLayout>
        <Typography color="error" textAlign="center" p={3}>
          {error}
        </Typography>
      </ReportLayout>
    );
  }

  return (
    <ReportLayout>
      <Box p={3}>
        <Typography variant="h4" textAlign="center" gutterBottom>
          📦 گزارش کمبود موجودی
        </Typography>

        <Card sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="جستجوی نام دارو"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>محدوده موجودی</InputLabel>
                <Select
                  value={stockRangeFilter}
                  onChange={(e) => setStockRangeFilter(e.target.value)}
                  label="محدوده موجودی"
                >
                  <MenuItem value="0-20">کمبود (۰ تا ۲۰)</MenuItem>
                  <MenuItem value="0-10">کمبود شدید (۰ تا ۱۰)</MenuItem>
                  <MenuItem value="11-20">نزدیک به کمبود (۱۱ تا ۲۰)</MenuItem>
                  <MenuItem value="21-50">متوسط (۲۱ تا ۵۰)</MenuItem>
                  <MenuItem value="51+">زیاد (۵۱ به بالا)</MenuItem>
                  <MenuItem value="all">همه محدوده‌ها</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>وضعیت انقضا</InputLabel>
                <Select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  label="وضعیت انقضا"
                >
                  <MenuItem value="all">همه</MenuItem>
                  <MenuItem value="EXPIRED">تاریخ گذشته</MenuItem>
                  <MenuItem value="NEAR_EXPIRY">نزدیک به انقضا</MenuItem>
                  <MenuItem value="VALID">معتبر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="outlined" fullWidth onClick={handleClearFilters}>
                پاک کردن
              </Button>
            </Grid>
          </Grid>
        </Card>

        <Card sx={{ mt: 3 }}>
          {filteredData.length === 0 ? (
            <Typography align="center" p={3}>
              هیچ دارویی با فیلترهای انتخاب‌شده یافت نشد.
            </Typography>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>نام دارو</TableCell>
                    <TableCell>موجودی</TableCell>
                    <TableCell>وضعیت موجودی</TableCell>
                    <TableCell>نزدیک‌ترین تاریخ انقضا</TableCell>
                    <TableCell>وضعیت انقضا</TableCell>
                    <TableCell>تأمین‌کننده</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.medication_name}</TableCell>
                        <TableCell>{item.available_stock}</TableCell>
                        <TableCell>{getStockChip(item.available_stock)}</TableCell>
                        <TableCell>
                          {item.nearest_expiry_date
                            ? new Date(item.nearest_expiry_date).toLocaleDateString("fa-IR")
                            : "—"}
                        </TableCell>
                        <TableCell>{getExpiryChip(item.expiry_status)}</TableCell>
                        <TableCell>{item.supplier_name || "—"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filteredData.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) =>
                  setRowsPerPage(parseInt(e.target.value, 10))
                }
                labelRowsPerPage="ردیف در صفحه:"
              />
            </>
          )}
        </Card>
      </Box>
    </ReportLayout>
  );
}