import React, { useState, useEffect } from "react";
import ReportLayout from "../../../../components/ReportLayout";
import {
  Box,
  Card,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Pagination,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import axios from "axios";

export default function BenefitsReport() {
  const [type, setType] = useState("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [data, setData] = useState([]);

  // Pagination state (matching SalesTable style)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const token = localStorage.getItem("token");

  const fetchData = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/benefits", {
        params: { type, date, month, year },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });
      console.log("DATA:", res.data);
      setData(res.data);
    } catch (err) {
      console.error("ERROR:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      console.warn("توکن یافت نشد ❌");
    }
  }, []);

  const handleSearch = () => {
    fetchData();
    setCurrentPage(1); // reset page on new search
  };

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <ReportLayout>
      <Box p={3}>
        <Card sx={{ p: 3 }}>
          <Grid container spacing={2}>
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

            {type === "daily" && (
              <Grid item xs={12} md={3}>
                <TextField
                  type="date"
                  fullWidth
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Grid>
            )}

            {type === "monthly" && (
              <>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="ماه"
                    fullWidth
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="سال"
                    fullWidth
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </Grid>
              </>
            )}

            {type === "yearly" && (
              <Grid item xs={12} md={3}>
                <TextField
                  label="سال"
                  fullWidth
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </Grid>
            )}

            <Grid item xs={12} md={2}>
              <Button variant="contained" fullWidth onClick={handleSearch}>
                جستجو
              </Button>
            </Grid>
          </Grid>
        </Card>

        <Card sx={{ mt: 3 }}>
          {data.length === 0 ? (
            <Typography align="center" p={3}>
              داده‌ای موجود نیست ❗
            </Typography>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>تاریخ</TableCell>
                    <TableCell>سال</TableCell>
                    <TableCell>ماه</TableCell>
                    <TableCell>درآمد</TableCell>
                    <TableCell>مصارف</TableCell>
                    <TableCell>سود خالص</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.journal_date}</TableCell>
                      <TableCell>{row.year}</TableCell>
                      <TableCell>{row.month}</TableCell>
                      <TableCell>{row.total_credit}</TableCell>
                      <TableCell>{row.total_debit}</TableCell>
                      <TableCell>{row.net_benefit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls (matching SalesTable style) */}
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