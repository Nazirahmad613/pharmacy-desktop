import { useState, useEffect } from "react";
import { useAuth } from "app/contexts/AuthContext";
import { accountStyles } from "./AccountSummaryStyles";
import ReportLayout from "../../../../components/ReportLayout";

import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Button,
} from "@mui/material";

export default function AccountSummaryText() {
  const { api, user, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ===== دریافت داده‌ها =====
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("❌ ابتدا وارد سیستم شوید تا حساب‌ها نمایش داده شوند");
      setData([]);
      setFilteredData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/account-summary");

        let apiData = [];

        if (res.data?.data && Array.isArray(res.data.data)) {
          apiData = res.data.data;
        } else if (Array.isArray(res.data)) {
          apiData = res.data;
        }

        if (!apiData.length) {
          setError("هیچ حسابی یافت نشد");
        }

        setData(apiData);
        setFilteredData(apiData);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
        setError("خطا در دریافت داده‌ها. لطفاً API و توکن را بررسی کنید.");
        setData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, user, authLoading]);

  // ===== فیلتر و جستجو =====
  useEffect(() => {
    let temp = [...data];

    if (filterType) {
      temp = temp.filter((item) => item.account_type === filterType);
    }

    if (search) {
      temp = temp.filter((item) =>
        item.account_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    temp.sort((a, b) => {
      if (a.account_type < b.account_type) return -1;
      if (a.account_type > b.account_type) return 1;
      if (a.account_name < b.account_name) return -1;
      if (a.account_name > b.account_name) return 1;
      return 0;
    });

    setFilteredData(temp);
    setCurrentPage(1);
  }, [search, filterType, data]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // ===== Loading کاربر =====
  if (authLoading) {
    return (
      <Box className="loading-box">
        <CircularProgress />
        <Typography mt={2}>
          در حال بارگذاری اطلاعات کاربر...
        </Typography>
      </Box>
    );
  }

  const translateAccountType = (type) => {
  const map = {
    patient: "مریض",
    doctor: "داکتر",
    visitor: "مراجع",
    customer: "مشتری",
    staff: "کارمند",
    supplier: "تأمین‌کننده",

    rent: "کرایه",
    electricity: "برق",
    water: "آب",
    internet: "انترنت",
    salary: "معاش",
    fuel: "سوخت",
    maintenance: "ترمیمات",

    laboratory: "لابراتوار",
    transport: "ترانسپورت",
    consultation: "مشاوره",

    expense: "مصرف عمومی",
    income: "درآمد",
    other: "سایر",
  };

  return map[type] || type;
};

  return ( 
    <ReportLayout title="گزارش حساب‌ها">
    <Box className="account-page">
      <Typography variant="h4" className="account-title">
        گزارش حساب‌ها
      </Typography>

      {/* جستجو و فیلتر */}
      <Box className="filter-section">
        <TextField
          label="جستجوی نام حساب"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={accountStyles.searchBox}
        />

        <FormControl sx={accountStyles.selectBox}>
          <InputLabel>فیلتر نوع حساب</InputLabel>
          <Select
            value={filterType}
            label="فیلتر نوع حساب"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">همه</MenuItem>
            <MenuItem value="doctor">داکتر</MenuItem>
            <MenuItem value="patient">مریض</MenuItem>
            <MenuItem value="customer">مشتری</MenuItem>
            <MenuItem value="supplier">حمایت‌کننده</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Loading */}
      {loading && (
        <Box className="loading-box">
          <CircularProgress />
        </Box>
      )}

      {/* خطا */}
      {!loading && error && (
        <Typography className="error-text">
          {error}
        </Typography>
      )}

      {/* کارت‌ها */}
      {!loading && !error && currentItems.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {currentItems.map((item) => {
            const balance = Number(item.balance || 0);

            return (
              <Box
                key={`${item.account_type}_${item.account_id}`}
                className="account-card"
              >
                <Typography className="account-name">
                  {item.account_name}
                </Typography>
                <Typography className="account-info">
                  نوع حساب:     <strong>{translateAccountType(item.account_type)}</strong>
                </Typography>

                <Typography className="account-info">
                  مجموع حساب:{" "}
                  {Number(item.total_credit || 0).toLocaleString()}
                </Typography>

                <Typography className="account-info">
                  پرداخت شده:{" "}
                  {Number(item.total_debit || 0).toLocaleString()}
                </Typography>

                <Typography className="account-info">
                  باقی مانده:{" "}
                  <span
                    className={
                      balance >= 0
                        ? "balance-positive"
                        : "balance-negative"
                    }
                  >
                    {balance.toLocaleString()}
                  </span>
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Pagination */}
      {!loading && !error && filteredData.length > itemsPerPage && (
        <Box className="pagination-wrapper">
          <Button
            variant="contained"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            قبلی
          </Button>

          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i + 1}
              variant={currentPage === i + 1 ? "contained" : "outlined"}
              sx={accountStyles.paginationButton(currentPage === i + 1)}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}

          <Button
            variant="contained"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            بعدی
          </Button>
        </Box>
      )}
    </Box>
    </ReportLayout> 
  );
}