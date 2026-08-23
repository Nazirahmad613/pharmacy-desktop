// src/app/pages/laboratory/LabBasePage.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Science as ScienceIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://localhost:8000/api";

export default function LabBasePage({
  title,
  icon,
  testType,
  testKeywords = [],
  backPath = "/material/lab-hematology", // ✅ اولین صفحه لابراتوار (آزمایش خون)
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);

  // ============ دریافت داده‌ها ============
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_BASE_URL}/laboratory-requests/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("خطا در دریافت داده‌ها");
      }

      const result = await response.json();
      console.log(`📋 داده‌های ${title}:`, result);

      if (result.success && result.data) {
        let allRequests = result.data.all_requests || [];
        
        // فیلتر بر اساس نوع تست
        let filtered = allRequests.filter((r) => {
          if (testType && r.test_type === testType) {
            return true;
          }
          if (testKeywords.length > 0) {
            const testName = (r.test_name || "").toLowerCase();
            return testKeywords.some((keyword) => 
              testName.includes(keyword.toLowerCase())
            );
          }
          return false;
        });

        // فقط درخواست‌هایی که فیس دارند
        filtered = filtered.filter((r) => r.has_fee === true);

        setRequests(filtered);
        setFilteredRequests(filtered);

        if (filtered.length === 0) {
          toast.info(`هیچ درخواستی در بخش ${title} یافت نشد`);
        }
      }
    } catch (error) {
      console.error(`❌ خطا در دریافت داده‌های ${title}:`, error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  // ============ جستجو ============
  useEffect(() => {
    let filtered = requests;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.test_name?.toLowerCase().includes(term) ||
          r.patient?.full_name?.toLowerCase().includes(term) ||
          r.barcode?.toLowerCase().includes(term) ||
          r.reg_id?.toString().includes(term)
      );
    }
    if (tabValue === 1) {
      filtered = filtered.filter((r) => r.status === "pending");
    } else if (tabValue === 2) {
      filtered = filtered.filter((r) => r.status === "in_progress");
    } else if (tabValue === 3) {
      filtered = filtered.filter((r) => r.status === "completed");
    }
    setFilteredRequests(filtered);
  }, [searchTerm, requests, tabValue]);

  // ============ بارگذاری اولیه ============
  useEffect(() => {
    fetchData();
  }, []);

  // ============ دریافت رنگ وضعیت ============
  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b",
      sample_taken: "#3b82f6",
      in_progress: "#8b5cf6",
      sent_to_lab: "#06b6d4",
      completed: "#22c55e",
      cancelled: "#ef4444",
      rejected: "#6b7280",
    };
    return colors[status] || "#9ca3af";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "در انتظار",
      sample_taken: "نمونه گرفته شده",
      in_progress: "در حال انجام",
      sent_to_lab: "ارسال به لابراتوار",
      completed: "تکمیل شده",
      cancelled: "لغو شده",
      rejected: "رد شده",
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      paid: "پرداخت کامل",
      partial: "پرداخت ناقص",
      pending: "در انتظار پرداخت",
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      paid: "#22c55e",
      partial: "#f97316",
      pending: "#f59e0b",
    };
    return colors[status] || "#9ca3af";
  };

  // ============ تغییر وضعیت ============
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/laboratory-requests/${requestId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("خطا در تغییر وضعیت");
      }

      toast.success("وضعیت با موفقیت تغییر کرد");
      fetchData();
    } catch (error) {
      console.error("❌ خطا:", error);
      toast.error("خطا در تغییر وضعیت");
    }
  };

  // ============ نمایش جزئیات ============
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setOpenDetailDialog(true);
  };

  // ============ چاپ ============
  const handlePrint = (request) => {
    window.open(
      `${API_BASE_URL}/laboratory-requests/${request.id}/print`,
      "_blank"
    );
  };

  // ============ فرمت تاریخ ============
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("fa-IR");
    } catch {
      return "-";
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleString("fa-IR");
    } catch {
      return "-";
    }
  };

  // ============ هدایت به صفحه اصلی لابراتوار ============
  const handleGoBack = () => {
    navigate(backPath);
  };

  // ============ رندر ============
  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Back Button */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        {/* دکمه بازگشت به صفحه اصلی لابراتوار */}
        <Tooltip title="بازگشت به صفحه اصلی لابراتوار">
          <IconButton
            onClick={handleGoBack}
            sx={{
              color: "#60a5fa",
              backgroundColor: "#0f1a2a",
              "&:hover": { backgroundColor: "#1a2a3a" },
              border: "1px solid #374151",
              borderRadius: "8px",
              p: 1,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="h5" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
          {icon}
          {title}
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
            بروزرسانی
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#1a2a3a", borderBottom: "3px solid #60a5fa" }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: "#60a5fa", fontWeight: "bold" }}>
                {requests.length}
              </Typography>
              <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                📋 کل درخواست‌ها
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#1a2a3a", borderBottom: "3px solid #f59e0b" }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: "#f59e0b", fontWeight: "bold" }}>
                {requests.filter((r) => r.status === "pending").length}
              </Typography>
              <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                ⏳ در انتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#1a2a3a", borderBottom: "3px solid #8b5cf6" }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: "#8b5cf6", fontWeight: "bold" }}>
                {requests.filter((r) => r.status === "in_progress").length}
              </Typography>
              <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                🔄 در حال انجام
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#1a2a3a", borderBottom: "3px solid #22c55e" }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: "#22c55e", fontWeight: "bold" }}>
                {requests.filter((r) => r.status === "completed").length}
              </Typography>
              <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                ✅ تکمیل شده
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search & Filter */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: "#1a2a3a" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="جستجو بر اساس نام مریض، بارکد، شماره مراجعه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9ca3af" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "#374151" },
                  "&:hover fieldset": { borderColor: "#60a5fa" },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Tabs
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              sx={{
                "& .MuiTab-root": { color: "#9ca3af" },
                "& .Mui-selected": { color: "#60a5fa" },
                "& .MuiTabs-indicator": { backgroundColor: "#60a5fa" },
              }}
            >
              <Tab label="همه" />
              <Tab label="در انتظار" />
              <Tab label="در حال انجام" />
              <Tab label="تکمیل شده" />
            </Tabs>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <LinearProgress sx={{ bgcolor: "#1a2a3a" }} />
          <Typography sx={{ color: "#9ca3af", mt: 2 }}>در حال بارگذاری...</Typography>
        </Box>
      ) : filteredRequests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#1a2a3a" }}>
          <Typography sx={{ color: "#9ca3af" }}>
            📭 هیچ درخواستی در این بخش یافت نشد
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280", mt: 1 }}>
            درخواست‌ها بعد از اخذ فیس در تب "اخذ فیس" ماژول ثبت نام، به صورت خودکار به این بخش منتقل می‌شوند
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ bgcolor: "#1a2a3a", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#0f1a2a" }}>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>#</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>شماره مراجعه</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>نام مریض</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>نوع آزمایش</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>نام آزمایش</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>بارکد</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>وضعیت</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>وضعیت پرداخت</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>تاریخ</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((request, index) => (
                    <TableRow key={request.id} sx={{ "&:hover": { bgcolor: "#0f1a2a" } }}>
                      <TableCell sx={{ color: "white" }}>{index + 1 + page * rowsPerPage}</TableCell>
                      <TableCell sx={{ color: "#60a5fa" }}>{request.reg_id}</TableCell>
                      <TableCell sx={{ color: "white" }}>
                        {request.patient?.full_name || "نامشخص"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={request.test_type_label || request.test_type}
                          size="small"
                          sx={{
                            bgcolor: "#0f1a2a",
                            color: "#60a5fa",
                            border: "1px solid #60a5fa",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "white" }}>{request.test_name || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.barcode}
                          size="small"
                          sx={{
                            bgcolor: "#0f1a2a",
                            color: "#fcd34d",
                            fontFamily: "monospace",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(request.status)}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(request.status) + "33",
                            color: getStatusColor(request.status),
                            border: `1px solid ${getStatusColor(request.status)}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPaymentStatusLabel(request.payment_status)}
                          size="small"
                          sx={{
                            bgcolor: getPaymentStatusColor(request.payment_status) + "33",
                            color: getPaymentStatusColor(request.payment_status),
                            border: `1px solid ${getPaymentStatusColor(request.payment_status)}`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#9ca3af", fontSize: "12px" }}>
                        {formatDate(request.request_date || request.created_at)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="مشاهده جزئیات">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(request)}
                            sx={{ color: "#60a5fa" }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="چاپ">
                          <IconButton
                            size="small"
                            onClick={() => handlePrint(request)}
                            sx={{ color: "#fcd34d" }}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        {request.status === "pending" && (
                          <>
                            <Tooltip title="شروع انجام آزمایش">
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(request.id, "in_progress")}
                                sx={{ color: "#8b5cf6" }}
                              >
                                <PendingIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تکمیل آزمایش">
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(request.id, "completed")}
                                sx={{ color: "#22c55e" }}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {request.status === "in_progress" && (
                          <Tooltip title="تکمیل آزمایش">
                            <IconButton
                              size="small"
                              onClick={() => handleStatusChange(request.id, "completed")}
                              sx={{ color: "#22c55e" }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredRequests.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              color: "#9ca3af",
              "& .MuiTablePagination-selectIcon": { color: "#9ca3af" },
            }}
          />
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#1a1a2e", color: "white" },
        }}
      >
        {selectedRequest && (
          <>
            <DialogTitle sx={{ color: "#60a5fa", borderBottom: "1px solid #2a3a4a" }}>
              <Box display="flex" alignItems="center" gap={1}>
                <ScienceIcon />
                جزئیات درخواست لابراتوار
                <Chip
                  label={selectedRequest.barcode}
                  size="small"
                  sx={{
                    bgcolor: "#0f1a2a",
                    color: "#fcd34d",
                    fontFamily: "monospace",
                    mr: "auto",
                  }}
                />
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>شماره مراجعه</Typography>
                  <Typography sx={{ color: "white", fontWeight: "bold" }}>{selectedRequest.reg_id}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نام مریض</Typography>
                  <Typography sx={{ color: "white", fontWeight: "bold" }}>
                    {selectedRequest.patient?.full_name || "نامشخص"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نوع آزمایش</Typography>
                  <Typography sx={{ color: "white" }}>
                    {selectedRequest.test_type_label || selectedRequest.test_type}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نام آزمایش</Typography>
                  <Typography sx={{ color: "white" }}>{selectedRequest.test_name || "-"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>توضیحات</Typography>
                  <Typography sx={{ color: "white" }}>
                    {selectedRequest.test_description || "بدون توضیحات"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>وضعیت</Typography>
                  <Chip
                    label={getStatusLabel(selectedRequest.status)}
                    sx={{
                      bgcolor: getStatusColor(selectedRequest.status) + "33",
                      color: getStatusColor(selectedRequest.status),
                      border: `1px solid ${getStatusColor(selectedRequest.status)}`,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>وضعیت پرداخت</Typography>
                  <Chip
                    label={getPaymentStatusLabel(selectedRequest.payment_status)}
                    sx={{
                      bgcolor: getPaymentStatusColor(selectedRequest.payment_status) + "33",
                      color: getPaymentStatusColor(selectedRequest.payment_status),
                      border: `1px solid ${getPaymentStatusColor(selectedRequest.payment_status)}`,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>تاریخ درخواست</Typography>
                  <Typography sx={{ color: "white" }}>
                    {formatDateTime(selectedRequest.request_date || selectedRequest.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>بارکد</Typography>
                  <Typography sx={{ color: "#fcd34d", fontFamily: "monospace" }}>
                    {selectedRequest.barcode}
                  </Typography>
                </Grid>
                {selectedRequest.fee && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ color: "#10b981" }}>اطلاعات فیس</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>مبلغ کل</Typography>
                      <Typography sx={{ color: "#fcd34d" }}>
                        {selectedRequest.fee.amount?.toFixed(2) || 0} افغانی
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>مبلغ پرداختی</Typography>
                      <Typography sx={{ color: "#22c55e" }}>
                        {selectedRequest.fee.paid_amount?.toFixed(2) || 0} افغانی
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>روش پرداخت</Typography>
                      <Typography sx={{ color: "white" }}>
                        {selectedRequest.fee.payment_method || "-"}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ borderTop: "1px solid #2a3a4a", p: 2 }}>
              <Button onClick={() => setOpenDetailDialog(false)} variant="outlined" sx={{ color: "#9ca3af" }}>
                بستن
              </Button>
              <Button onClick={() => handlePrint(selectedRequest)} variant="contained" sx={{ bgcolor: "#fcd34d", color: "#1a1a2e" }}>
                <PrintIcon sx={{ mr: 1 }} />
                چاپ
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}