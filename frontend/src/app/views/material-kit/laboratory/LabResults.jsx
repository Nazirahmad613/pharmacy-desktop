// src/app/pages/laboratory/LabResults.jsx

import React, { useState, useEffect } from "react";
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FactCheck as FactCheckIcon,
  Upload as UploadIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  LocalHospital as LocalHospitalIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://localhost:8000/api";

export default function LabResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [resultText, setResultText] = useState("");
  const [resultFile, setResultFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingToTreatment, setSendingToTreatment] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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
      console.log("📋 داده‌های نتایج:", result);

      if (result.success && result.data) {
        let allRequests = result.data.all_requests || [];
        
        // فقط درخواست‌های دارای فیس و با وضعیت in_progress یا pending
        allRequests = allRequests.filter(
          (r) => r.has_fee === true && (r.status === "in_progress" || r.status === "pending" || r.status === "completed")
        );

        setRequests(allRequests);
        setFilteredRequests(allRequests);

        if (allRequests.length === 0) {
          toast.info("هیچ درخواستی برای ثبت نتیجه وجود ندارد");
        }
      }
    } catch (error) {
      console.error("❌ خطا:", error);
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

  // ============ باز کردن دیالوگ ثبت نتیجه ============
  const handleOpenResultDialog = (request) => {
    setSelectedRequest(request);
    setResultText(request.results || "");
    setResultFile(null);
    setOpenResultDialog(true);
  };

  // ============ ثبت نتیجه ============
  const handleSubmitResult = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("results", resultText);
      if (resultFile) {
        formData.append("result_file", resultFile);
      }
      formData.append("status", "completed");

      const response = await fetch(`${API_BASE_URL}/laboratory-requests/${selectedRequest.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("خطا در ثبت نتیجه");
      }

      toast.success("✅ نتیجه آزمایش با موفقیت ثبت شد");
      setOpenResultDialog(false);
      fetchData();
    } catch (error) {
      console.error("❌ خطا:", error);
      toast.error(error.message || "خطا در ثبت نتیجه");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ باز کردن دیالوگ ارسال به معالجه ============
  const handleOpenSendToTreatment = (request) => {
    setSelectedRequest(request);
    setSendNote("");
    setOpenSendDialog(true);
  };

  // ============ ارسال به معالجه ============
  const handleSendToTreatment = async () => {
    if (!selectedRequest) return;

    setSendingToTreatment(true);
    try {
      const token = localStorage.getItem("token");
      
      // ارسال نتیجه به بخش معالجه
      const payload = {
        laboratory_request_id: selectedRequest.id,
        reg_id: selectedRequest.reg_id,
        patient_id: selectedRequest.patient_id,
        test_name: selectedRequest.test_name,
        test_type: selectedRequest.test_type,
        results: selectedRequest.results || resultText,
        result_file_path: selectedRequest.result_file_path,
        note: sendNote || "نتیجه آزمایش ارسال شد",
        status: "sent_to_treatment",
      };

      const response = await fetch(`${API_BASE_URL}/laboratory-requests/${selectedRequest.id}/send-to-treatment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("خطا در ارسال به معالجه");
      }

      const result = await response.json();
      
      // به‌روزرسانی وضعیت درخواست
      await fetch(`${API_BASE_URL}/laboratory-requests/${selectedRequest.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "sent_to_treatment",
          sent_to_treatment_at: new Date().toISOString()
        }),
      });

      setSnackbar({
        open: true,
        message: "✅ نتیجه آزمایش با موفقیت به بخش معالجه ارسال شد",
        severity: "success",
      });

      setOpenSendDialog(false);
      fetchData();
    } catch (error) {
      console.error("❌ خطا در ارسال به معالجه:", error);
      setSnackbar({
        open: true,
        message: error.message || "خطا در ارسال به معالجه",
        severity: "error",
      });
    } finally {
      setSendingToTreatment(false);
    }
  };

  // ============ دریافت رنگ وضعیت ============
  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b",
      in_progress: "#8b5cf6",
      completed: "#22c55e",
      sent_to_treatment: "#06b6d4",
    };
    return colors[status] || "#9ca3af";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "در انتظار",
      in_progress: "در حال انجام",
      completed: "تکمیل شده",
      sent_to_treatment: "ارسال به معالجه",
    };
    return labels[status] || status;
  };

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
    navigate("/material/lab-hematology");
  };

  // ============ بستن Snackbar ============
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
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
          <FactCheckIcon sx={{ color: "#60a5fa" }} />
          ثبت نتایج آزمایش
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
            📭 هیچ درخواستی برای ثبت نتیجه وجود ندارد
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280", mt: 1 }}>
            درخواست‌ها بعد از اخذ فیس و شروع آزمایش در این بخش نمایش داده می‌شوند
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
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>آزمایش</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>بارکد</TableCell>
                  <TableCell sx={{ color: "#60a5fa", fontWeight: "bold" }}>وضعیت</TableCell>
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
                      <TableCell sx={{ color: "#9ca3af", fontSize: "12px" }}>
                        {formatDate(request.request_date || request.created_at)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="ثبت نتیجه">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenResultDialog(request)}
                            sx={{ color: "#22c55e" }}
                          >
                            <FactCheckIcon />
                          </IconButton>
                        </Tooltip>
                        {request.status === "completed" && (
                          <Tooltip title="ارسال به معالجه">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenSendToTreatment(request)}
                              sx={{ color: "#06b6d4" }}
                            >
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {request.status === "sent_to_treatment" && (
                          <Tooltip title="ارسال شده به معالجه">
                            <IconButton
                              size="small"
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

      {/* Result Dialog */}
      <Dialog
        open={openResultDialog}
        onClose={() => setOpenResultDialog(false)}
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
                <FactCheckIcon />
                ثبت نتیجه آزمایش
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
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نام مریض</Typography>
                  <Typography sx={{ color: "white" }}>
                    {selectedRequest.patient?.full_name || "نامشخص"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>شماره مراجعه</Typography>
                  <Typography sx={{ color: "#60a5fa", fontWeight: "bold" }}>
                    {selectedRequest.reg_id}
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
                  <Typography sx={{ color: "white" }}>
                    {selectedRequest.test_name || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نتیجه آزمایش</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    placeholder="نتیجه آزمایش را وارد کنید..."
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "white",
                        "& fieldset": { borderColor: "#374151" },
                        "&:hover fieldset": { borderColor: "#60a5fa" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>فایل نتیجه (اختیاری)</Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{
                      color: "#60a5fa",
                      borderColor: "#374151",
                      "&:hover": { borderColor: "#60a5fa" },
                    }}
                  >
                    انتخاب فایل
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setResultFile(e.target.files[0])}
                    />
                  </Button>
                  {resultFile && (
                    <Typography sx={{ color: "#22c55e", mt: 1 }}>
                      ✅ {resultFile.name}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ borderTop: "1px solid #2a3a4a", p: 2 }}>
              <Button onClick={() => setOpenResultDialog(false)} variant="outlined" sx={{ color: "#9ca3af" }}>
                انصراف
              </Button>
              <Button
                onClick={handleSubmitResult}
                variant="contained"
                disabled={submitting}
                sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
              >
                {submitting ? "در حال ثبت..." : "ثبت نتیجه"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Send to Treatment Dialog */}
      <Dialog
        open={openSendDialog}
        onClose={() => setOpenSendDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#1a1a2e", color: "white" },
        }}
      >
        {selectedRequest && (
          <>
            <DialogTitle sx={{ color: "#06b6d4", borderBottom: "1px solid #2a3a4a" }}>
              <Box display="flex" alignItems="center" gap={1}>
                <LocalHospitalIcon />
                ارسال به بخش معالجه
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ bgcolor: "#0f1a2a", color: "#60a5fa" }}>
                    آیا از ارسال نتیجه آزمایش به بخش معالجه اطمینان دارید؟
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>شماره مراجعه</Typography>
                  <Typography sx={{ color: "#60a5fa", fontWeight: "bold" }}>
                    {selectedRequest.reg_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نام مریض</Typography>
                  <Typography sx={{ color: "white" }}>
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
                  <Typography sx={{ color: "white" }}>
                    {selectedRequest.test_name || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>
                    یادداشت (اختیاری)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={sendNote}
                    onChange={(e) => setSendNote(e.target.value)}
                    placeholder="یادداشت برای بخش معالجه..."
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "white",
                        "& fieldset": { borderColor: "#374151" },
                        "&:hover fieldset": { borderColor: "#06b6d4" },
                      },
                    }}
                  />
                </Grid>
                {selectedRequest.result_file_path && (
                  <Grid item xs={12}>
                    <Alert severity="success" sx={{ bgcolor: "#0f1a2a", color: "#22c55e" }}>
                      <PdfIcon sx={{ mr: 1 }} />
                      فایل نتیجه: {selectedRequest.result_file_path.split("/").pop()}
                    </Alert>
                  </Grid>
                )}
                {selectedRequest.results && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: "#9ca3af" }}>نتیجه آزمایش</Typography>
                    <Paper sx={{ p: 2, bgcolor: "#0f1a2a", border: "1px solid #2a3a4a" }}>
                      <Typography sx={{ color: "white", whiteSpace: "pre-wrap" }}>
                        {selectedRequest.results}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ borderTop: "1px solid #2a3a4a", p: 2 }}>
              <Button onClick={() => setOpenSendDialog(false)} variant="outlined" sx={{ color: "#9ca3af" }}>
                انصراف
              </Button>
              <Button
                onClick={handleSendToTreatment}
                variant="contained"
                disabled={sendingToTreatment}
                sx={{ 
                  bgcolor: "#06b6d4", 
                  "&:hover": { bgcolor: "#0891b2" },
                  display: "flex",
                  gap: 1,
                }}
              >
                {sendingToTreatment ? "در حال ارسال..." : <><SendIcon /> ارسال به معالجه</>}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}