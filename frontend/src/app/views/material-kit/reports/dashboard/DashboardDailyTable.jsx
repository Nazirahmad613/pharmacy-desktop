import { useEffect, useState, useMemo } from "react";
import { useAuth } from "app/contexts/AuthContext";
import ReportLayout from "../../../../../components/ReportLayout";
import {
  Box,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Pagination,
  CircularProgress,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  overflowX: "auto",
  backgroundColor: theme.palette.background.paper,
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const SearchBox = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  flexWrap: "wrap",
  marginBottom: theme.spacing(3),
  alignItems: "flex-end",
  direction: "rtl",
}));

export default function DashboardDailyTable() {
  const { api, user, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchDate, setSearchDate] = useState("");
  const [searchPatient, setSearchPatient] = useState("");
  const [searchPrescription, setSearchPrescription] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/dashboard-daily");
        const responseData = Array.isArray(res.data) ? res.data : [];
        setData(responseData);
      } catch (err) {
        console.error(err);
        setError("خطا در دریافت داده‌ها. لطفاً دوباره تلاش کنید.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, api]);

  const filteredData = useMemo(() => {
    if (!data.length) return [];

    return data.filter((item) => {
      const dateStr = String(item.report_date ?? "");
      const matchesDate = searchDate ? dateStr.includes(searchDate) : true;
      const matchesPatient = searchPatient
        ? String(item.total_patients ?? "").includes(searchPatient)
        : true;
      const matchesPrescription = searchPrescription
        ? String(item.total_prescriptions ?? "").includes(searchPrescription)
        : true;
      return matchesDate && matchesPatient && matchesPrescription;
    });
  }, [data, searchDate, searchPatient, searchPrescription]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDate, searchPatient, searchPrescription]);

  const handleSearch = () => setCurrentPage(1);

  const handleClearFilters = () => {
    setSearchDate("");
    setSearchPatient("");
    setSearchPrescription("");
    setCurrentPage(1);
  };

  if (authLoading || loading) {
    return (
      <ReportLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      </ReportLayout>
    );
  }

  if (error) {
    return (
      <ReportLayout>
        <Alert severity="error">{error}</Alert>
      </ReportLayout>
    );
  }

  return (
    <ReportLayout>
      <Box p={3}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>گزارش روزانه</h2>

        <SearchBox>
          <TextField
            label="تاریخ"
            variant="outlined"
            size="small"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            placeholder="مثلاً 1403/01/01"
          />
          <TextField
            label="تعداد مریضان"
            variant="outlined"
            size="small"
            type="number"
            value={searchPatient}
            onChange={(e) => setSearchPatient(e.target.value)}
          />
          <TextField
            label="تعداد نسخه‌ها"
            variant="outlined"
            size="small"
            type="number"
            value={searchPrescription}
            onChange={(e) => setSearchPrescription(e.target.value)}
          />
          <Button variant="contained" onClick={handleSearch}>جستجو</Button>
          <Button variant="outlined" onClick={handleClearFilters}>پاک کردن</Button>
        </SearchBox>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell>تاریخ</StyledTableCell>
                <StyledTableCell>مریضان</StyledTableCell>
                <StyledTableCell>داکتران</StyledTableCell>
                <StyledTableCell>نسخه‌ها</StyledTableCell>
                <StyledTableCell>فروش (افغانی)</StyledTableCell>
                <StyledTableCell>پرداخت‌شده</StyledTableCell>
                <StyledTableCell>باقی</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <StyledTableCell colSpan={7} align="center">
                    داده‌ای یافت نشد
                  </StyledTableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, idx) => (
                  <StyledTableRow key={`${item.report_date}-${idx}`}>
                    <StyledTableCell>{item.report_date}</StyledTableCell>
                    <StyledTableCell>{item.total_patients}</StyledTableCell>
                    <StyledTableCell>{item.total_doctors}</StyledTableCell>
                    <StyledTableCell>{item.total_prescriptions}</StyledTableCell>
                    <StyledTableCell>
                      {Number(item.total_sales ?? 0).toLocaleString("fa-IR")}
                    </StyledTableCell>
                    <StyledTableCell>
                      {Number(item.total_paid ?? 0).toLocaleString("fa-IR")}
                    </StyledTableCell>
                    <StyledTableCell>
                      {Number(item.total_due ?? 0).toLocaleString("fa-IR")}
                    </StyledTableCell>
                  </StyledTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </StyledTableContainer>

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Box>
    </ReportLayout>
  );
}