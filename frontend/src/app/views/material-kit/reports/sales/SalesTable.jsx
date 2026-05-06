import { useEffect, useState, useMemo } from "react";
import { useAuth } from "app/contexts/AuthContext";
import ReportLayout from "../../../../../components/ReportLayout";
import {
  Box,
  Card,
  Grid,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  CircularProgress,
  Pagination,
  Select,
  MenuItem,          // ✅ added
  FormControl,       // ✅ added
  InputLabel,        // ✅ added
} from "@mui/material";

export default function SalesTable() {
  const { api, user, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search filters
  const [searchText, setSearchText] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // Pagination (matching BenefitsReport style)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("❌ لطفاً ابتدا وارد سیستم شوید");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/sales-view");
        let apiData = Array.isArray(res.data) ? res.data : [];
        if (!apiData.length) setError("هیچ داده‌ای یافت نشد");
        setData(apiData);
      } catch (err) {
        console.error(err);
        setError("خطا در دریافت داده‌ها");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, user, authLoading]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, searchDate]);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.customer_name?.toLowerCase().includes(lowerSearch)) ||
          (item.doctor_name?.toLowerCase().includes(lowerSearch)) ||
          (item.gen_name?.toLowerCase().includes(lowerSearch))
      );
    }

    if (searchDate) {
      filtered = filtered.filter((item) =>
        item.journal_date?.includes(searchDate)
      );
    }

    return filtered;
  }, [data, searchText, searchDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleClearFilters = () => {
    setSearchText("");
    setSearchDate("");
    setCurrentPage(1);
  };

  if (authLoading || loading) {
    return (
      <ReportLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
          <Typography mr={1}>در حال بارگذاری...</Typography>
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
          گزارش فروش
        </Typography>

        {/* Filter Card */}
        <Card sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="جستجو (مشتری / دکتر / دارو)"
                variant="outlined"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="نام مشتری، دکتر یا دارو..."
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="تاریخ"
                variant="outlined"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="outlined" fullWidth onClick={handleClearFilters}>
                پاک کردن
              </Button>
            </Grid>
          </Grid>
        </Card>

        {/* Table Card */}
        <Card sx={{ mt: 3 }}>
          {filteredData.length === 0 ? (
            <Typography align="center" p={3}>
              داده‌ای موجود نیست ❗
            </Typography>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>تاریخ</TableCell>
                    <TableCell>مشتری</TableCell>
                    <TableCell>دکتر</TableCell>
                    <TableCell>دارو</TableCell>
                    <TableCell>مبلغ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.journal_date}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell>{item.doctor_name}</TableCell>
                      <TableCell>{item.gen_name}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, page) => setCurrentPage(page)}
                  shape="rounded"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      backgroundColor: "#ffffff",
                      color: "#333",
                      border: "1px solid #ccc",
                    },
                    "& .MuiPaginationItem-root:hover": {
                      backgroundColor: "#e3f2fd",
                    },
                    "& .MuiPaginationItem-page.Mui-selected": {
                      backgroundColor: "#1976d2",
                      color: "#fff",
                      border: "1px solid #1976d2",
                      fontWeight: "bold",
                    },
                    "& .MuiPaginationItem-ellipsis": {
                      color: "#333",
                    },
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>ردیف در صفحه</InputLabel>
                  <Select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    label="ردیف در صفحه"
                  >
                    <MenuItem value={5}>۵</MenuItem>
                    <MenuItem value={10}>۱۰</MenuItem>
                    <MenuItem value={25}>۲۵</MenuItem>
                    <MenuItem value={50}>۵۰</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </>
          )}
        </Card>
      </Box>
    </ReportLayout>
  );
}