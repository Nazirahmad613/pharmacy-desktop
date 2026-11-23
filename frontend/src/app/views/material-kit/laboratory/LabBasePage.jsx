// src/app/pages/laboratory/LabBasePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  Card,
  CardContent,
  MenuItem,
  Stack,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Science as ScienceIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";

export default function LabBasePage({
  title,
  icon,
  testType,
  testKeywords = [],
  backPath = "/material/lab-hematology",
  badgeCount,
  onBadgeCountChange,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [resultData, setResultData] = useState({
    result: "",
    status: "completed",
    notes: "",
    normal_range: "",
    pdf_file: null,
    pdf_file_name: "",
    pdf_url: "",
  });

  // ============ دریافت درخواست‌ها ============
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:8000/api/laboratory-requests/all",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      let allRequests = [];

      if (result.success) {
        if (Array.isArray(result.data)) {
          allRequests = result.data;
        } else if (
          result.data?.all_requests &&
          Array.isArray(result.data.all_requests)
        ) {
          allRequests = result.data.all_requests;
        }
      }

      // ✅ پردازش و استخراج اطلاعات بیمار
      const processedRequests = allRequests.map((req) => {
        let patientName = "نامشخص";
        let patientPhone = "";
        let patientEmail = "";
        let patientAge = "";
        let patientGender = "";
        let patientNationalId = "";
        let patientFullName = "";

        if (req.patient) {
          const p = req.patient;
          if (p.full_name) {
            patientName = p.full_name;
            patientFullName = p.full_name;
          } else {
            const firstName = p.first_name || "";
            const lastName = p.last_name || "";
            patientName = `${firstName} ${lastName}`.trim() || "نامشخص";
            patientFullName = patientName;
          }
          if (p.mobile) patientPhone = p.mobile;
          if (p.email) patientEmail = p.email;
          if (p.age) patientAge = p.age;
          if (p.gender) patientGender = p.gender;
          if (p.national_id) patientNationalId = p.national_id;
        }

        if (req.registration && req.registration.patient) {
          const regPatient = req.registration.patient;
          if (!patientName || patientName === "نامشخص") {
            const firstName = regPatient.first_name || "";
            const lastName = regPatient.last_name || "";
            patientName = `${firstName} ${lastName}`.trim() || "نامشخص";
            patientFullName = patientName;
          }
          if (!patientPhone && regPatient.mobile) patientPhone = regPatient.mobile;
          if (!patientEmail && regPatient.email) patientEmail = regPatient.email;
          if (!patientAge && regPatient.age) patientAge = regPatient.age;
          if (!patientGender && regPatient.gender) patientGender = regPatient.gender;
          if (!patientNationalId && regPatient.national_id)
            patientNationalId = regPatient.national_id;
        }

        if (!patientName || patientName === "نامشخص") {
          if (req.patient_name) patientName = req.patient_name;
          else if (req.patientName) patientName = req.patientName;
          else if (req.name) patientName = req.name;
        }

        return {
          ...req,
          patient_name: patientName,
          patient_full_name: patientFullName,
          patient_phone: patientPhone,
          patient_email: patientEmail,
          patient_age: patientAge,
          patient_gender: patientGender,
          patient_national_id: patientNationalId,
          registration_id: req.registration?.reg_id || req.reg_id || null,
          visit_number: req.registration?.visit_number || null,
          doctor_name: req.doctor?.name || null,
        };
      });

      // ✅ فیلتر بر اساس نوع تست
      const filteredRequests = processedRequests.filter((r) => {
        if (testType) {
          if (r.test_type === testType) {
            return true;
          }
          const testName = (r.test_name || "").toLowerCase();
          const testTypeName = (r.test_type || "").toLowerCase();

          if (
            testName.includes(testType.toLowerCase()) ||
            testTypeName.includes(testType.toLowerCase())
          ) {
            return true;
          }

          if (testKeywords.length > 0) {
            return testKeywords.some(
              (keyword) =>
                testName.includes(keyword.toLowerCase()) ||
                testTypeName.includes(keyword.toLowerCase())
            );
          }
          return false;
        }

        if (testKeywords.length > 0) {
          const testName = (r.test_name || "").toLowerCase();
          const testTypeName = (r.test_type || "").toLowerCase();
          return testKeywords.some(
            (keyword) =>
              testName.includes(keyword.toLowerCase()) ||
              testTypeName.includes(keyword.toLowerCase())
          );
        }

        return false;
      });

      setRequests(filteredRequests);

      if (onBadgeCountChange) {
        onBadgeCountChange(filteredRequests.length);
      }

      setError(null);
    } catch (err) {
      console.error("❌ خطا در دریافت اطلاعات:", err);
      setError("خطا در دریافت اطلاعات. لطفاً مجدداً تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [testType, testKeywords]);

  // ============ مشاهده جزئیات ============
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setOpenDetailDialog(true);
  };

  // ============ باز کردن دیالوگ ثبت نتیجه ============
  const handleOpenResultDialog = (request) => {
    setSelectedRequest(request);
    setResultData({
      result: request.result || "",
      status: request.status || "pending",
      notes: request.notes || "",
      normal_range: request.normal_range || "",
      pdf_file: null,
      pdf_file_name: request.pdf_file_name || "",
      pdf_url: request.pdf_url || "",
    });
    setOpenResultDialog(true);
  };

  // ============ انتخاب فایل PDF ============
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === "application/pdf") {
        setResultData({
          ...resultData,
          pdf_file: file,
          pdf_file_name: file.name,
        });
      } else {
        setError("لطفاً فقط فایل PDF انتخاب کنید");
      }
    }
  };

  // ============ آپلود فایل PDF ============
  const uploadPdfFile = async (requestId) => {
    if (!resultData.pdf_file) return null;

    try {
      setUploading(true);
      setUploadProgress(0);

      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("pdf_file", resultData.pdf_file);
      formData.append("request_id", requestId);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.open(
          "POST",
          "http://localhost:8000/api/laboratory-requests/upload-pdf",
          true
        );
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            reject(new Error("خطا در آپلود فایل"));
          }
        };

        xhr.onerror = () => reject(new Error("خطا در آپلود فایل"));
        xhr.send(formData);
      });
    } catch (error) {
      console.error("❌ خطا در آپلود:", error);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ============ حذف فایل PDF ============
  const handleRemoveFile = () => {
    setResultData({
      ...resultData,
      pdf_file: null,
      pdf_file_name: "",
      pdf_url: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============ دانلود فایل PDF ============
  const handleDownloadPdf = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  // ============ ثبت نتیجه با آپلود PDF ============
  const handleSaveResult = async () => {
    try {
      setUploading(true);

      const token = localStorage.getItem("token");
      let pdfUrl = resultData.pdf_url;

      if (resultData.pdf_file) {
        const uploadResult = await uploadPdfFile(selectedRequest.id);
        if (uploadResult && uploadResult.success) {
          pdfUrl = uploadResult.pdf_url;
        }
      }

      const response = await fetch(
        `http://localhost:8000/api/laboratory-requests/${selectedRequest.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            result: resultData.result,
            status: resultData.status,
            notes: resultData.notes,
            normal_range: resultData.normal_range,
            pdf_url: pdfUrl,
            pdf_file_name: resultData.pdf_file_name,
          }),
        }
      );

      if (!response.ok) throw new Error("خطا در ثبت نتیجه");

      const result = await response.json();
      if (result.success) {
        setOpenResultDialog(false);
        setUploading(false);
        await fetchRequests();
        setError(null);
      }
    } catch (err) {
      console.error("❌ خطا در ثبت نتیجه:", err);
      setError("خطا در ثبت نتیجه یا آپلود فایل");
      setUploading(false);
    }
  };

  // ============ چاپ نتیجه ============
  const handlePrint = () => {
    window.print();
  };

  // ============ دریافت حرف اول نام ============
  const getInitials = (name) => {
    if (!name || name === "نامشخص") return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // ============ دریافت رنگ برای Avatar (پالت پاستلی و مدرن روی پس‌زمینه سفید) ============
  const getAvatarColor = (name) => {
    const colors = [
      { bg: "#e0f2fe", text: "#0369a1" }, // آبی آسمانی
      { bg: "#dcfce7", text: "#15803d" }, // سبز زمردی
      { bg: "#ede9fe", text: "#6d28d9" }, // بنفش ملایم
      { bg: "#fef3c7", text: "#b45309" }, // کهربایی
      { bg: "#fce7f3", text: "#be185d" }, // صورتی
      { bg: "#ccfbf1", text: "#0f766e" }, // فیروزه‌ای
      { bg: "#ffedd5", text: "#c2410c" }, // نارنجی
      { bg: "#e0e7ff", text: "#3730a3" }, // نیلی
    ];
    if (!name || name === "نامشخص") return colors[0];
    const index = name.length % colors.length;
    return colors[index];
  };

  // ============ دریافت جنسیت به فارسی ============
  const getGenderLabel = (gender) => {
    const genders = {
      male: "مرد",
      female: "زن",
      other: "سایر",
    };
    return genders[gender] || gender || "نامشخص";
  };

  // استایل مشترک فیلدهای متنی در تم روشن
  const lightInputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: "#ffffff",
      borderRadius: "10px",
      color: "#0f172a",
      "& fieldset": { borderColor: "#cbd5e1" },
      "&:hover fieldset": { borderColor: "#0284c7" },
      "&.Mui-focused fieldset": { borderColor: "#0284c7", borderWidth: "1.5px" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0284c7" },
  };

  // ============ رندر ============
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 5,
          minHeight: "60vh",
          bgcolor: "#f8fafc",
        }}
      >
        <CircularProgress sx={{ color: "#0284c7" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3.5 },
        minHeight: "100vh",
        bgcolor: "#f8fafc", // پس‌زمینه سفید یخی بسیار آرام‌بخش
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          bgcolor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            width: "5px",
            height: "100%",
            bgcolor: "#0284c7",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => navigate(backPath)}
            sx={{
              color: "#0284c7",
              bgcolor: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "12px",
              "&:hover": { bgcolor: "#e0f2fe" },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: "12px",
                bgcolor: "#eff6ff",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}
              >
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                مدیریت درخواست‌ها و ثبت نتایج آزمایشگاهی
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip
            label={`${requests.length} کل درخواست‌ها`}
            sx={{
              bgcolor: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontWeight: 700,
              px: 1,
            }}
          />
          <Chip
            label={`${requests.filter((r) => r.status !== "completed").length} در انتظار انجام`}
            sx={{
              bgcolor: "#fffbeb",
              color: "#b45309",
              border: "1px solid #fde68a",
              fontWeight: 700,
              px: 1,
            }}
          />
        </Box>
      </Paper>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2.5,
            borderRadius: "12px",
            border: "1px solid #fecaca",
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Table */}
      {requests.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            bgcolor: "#ffffff",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <ScienceIcon sx={{ fontSize: 38, color: "#94a3b8" }} />
          </Box>
          <Typography variant="h6" sx={{ color: "#334155", fontWeight: 700 }}>
            هیچ درخواستی برای {title} یافت نشد
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.8 }}>
            درخواست‌های جدید پس از پرداخت فیس در این جدول نمایش داده می‌شوند
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            bgcolor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
            overflowX: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: "#f1f5f9",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                <TableCell sx={{ color: "#334155", fontWeight: 800 }}>#</TableCell>
                <TableCell sx={{ color: "#334155", fontWeight: 800 }}>
                  اطلاعات بیمار
                </TableCell>
                <TableCell sx={{ color: "#334155", fontWeight: 800 }}>
                  نوع تست
                </TableCell>
                <TableCell sx={{ color: "#334155", fontWeight: 800 }}>
                  تاریخ درخواست
                </TableCell>
                <TableCell sx={{ color: "#334155", fontWeight: 800 }}>
                  وضعیت
                </TableCell>
                <TableCell sx={{ color: "#334155", fontWeight: 800 }}>
                  فایل PDF
                </TableCell>
                <TableCell
                  sx={{ color: "#334155", fontWeight: 800 }}
                  align="center"
                >
                  عملیات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req, index) => {
                const patientName = req.patient_name || "نامشخص";
                const patientPhone = req.patient_phone || "";
                const patientAge = req.patient_age || "";
                const patientGender = req.patient_gender || "";
                const patientNationalId = req.patient_national_id || "";
                const registrationId = req.registration_id || req.reg_id || "";
                const doctorName = req.doctor_name || "";

                const initials = getInitials(patientName);
                const avatarTheme = getAvatarColor(patientName);
                const genderLabel = getGenderLabel(patientGender);

                return (
                  <TableRow
                    key={req.id}
                    sx={{
                      transition: "background-color 0.15s ease",
                      "&:hover": { bgcolor: "#f8fafc" },
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <TableCell sx={{ color: "#64748b", fontWeight: 600 }}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: avatarTheme.bg,
                            color: avatarTheme.text,
                            border: `1px solid ${avatarTheme.text}30`,
                            width: 44,
                            height: 44,
                            fontSize: 16,
                            fontWeight: 800,
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography
                            sx={{
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: "14.5px",
                            }}
                          >
                            {patientName}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1.2,
                              mt: 0.4,
                            }}
                          >
                            {patientPhone && (
                              <Typography
                                sx={{
                                  color: "#475569",
                                  fontSize: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.4,
                                }}
                              >
                                <PhoneIcon sx={{ fontSize: 13, color: "#0284c7" }} />
                                {patientPhone}
                              </Typography>
                            )}
                            {patientAge && (
                              <Typography
                                sx={{
                                  color: "#475569",
                                  fontSize: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.4,
                                }}
                              >
                                <AccessTimeIcon
                                  sx={{ fontSize: 13, color: "#0284c7" }}
                                />
                                {patientAge} سال
                              </Typography>
                            )}
                            {patientGender && (
                              <Typography
                                sx={{
                                  color: "#475569",
                                  fontSize: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.4,
                                }}
                              >
                                <BadgeIcon sx={{ fontSize: 13, color: "#0284c7" }} />
                                {genderLabel}
                              </Typography>
                            )}
                          </Box>
                          {patientNationalId && (
                            <Typography sx={{ color: "#64748b", fontSize: "11px" }}>
                              تذکره: {patientNationalId}
                            </Typography>
                          )}
                          <Typography
                            sx={{
                              color: "#94a3b8",
                              fontSize: "11px",
                              mt: 0.2,
                            }}
                          >
                            مراجعه: {registrationId || "N/A"}
                            {doctorName && ` • داکتر: ${doctorName}`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.test_name || req.test_type || "نامشخص"}
                        size="small"
                        sx={{
                          bgcolor: "#f0f9ff",
                          color: "#0369a1",
                          border: "1px solid #bae6fd",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "#475569", fontSize: "13px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <CalendarIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                        {new Date(req.created_at).toLocaleDateString("fa-IR")}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          req.status === "completed"
                            ? "تکمیل شده"
                            : "در انتظار"
                        }
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            req.status === "completed" ? "#dcfce7" : "#fef3c7",
                          color:
                            req.status === "completed" ? "#15803d" : "#b45309",
                          border:
                            req.status === "completed"
                              ? "1px solid #bbf7d0"
                              : "1px solid #fde68a",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {req.pdf_url ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PdfIcon />}
                          onClick={() => handleDownloadPdf(req.pdf_url)}
                          sx={{
                            color: "#dc2626",
                            borderColor: "#fca5a5",
                            bgcolor: "#fef2f2",
                            borderRadius: "8px",
                            fontWeight: 600,
                            "&:hover": {
                              borderColor: "#ef4444",
                              bgcolor: "#fee2e2",
                            },
                          }}
                        >
                          PDF
                        </Button>
                      ) : (
                        <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
                          ندارد
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <Tooltip title="مشاهده جزئیات">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewDetails(req)}
                            sx={{
                              color: "#0284c7",
                              borderColor: "#bae6fd",
                              bgcolor: "#f0f9ff",
                              borderRadius: "8px",
                              fontWeight: 600,
                              "&:hover": {
                                borderColor: "#0284c7",
                                bgcolor: "#e0f2fe",
                              },
                            }}
                          >
                            جزئیات
                          </Button>
                        </Tooltip>
                        {req.status !== "completed" && (
                          <Tooltip title="ثبت نتیجه">
                            <Button
                              size="small"
                              variant="contained"
                              disableElevation
                              startIcon={<EditIcon />}
                              onClick={() => handleOpenResultDialog(req)}
                              sx={{
                                bgcolor: "#16a34a",
                                borderRadius: "8px",
                                fontWeight: 600,
                                "&:hover": { bgcolor: "#15803d" },
                              }}
                            >
                              ثبت نتیجه
                            </Button>
                          </Tooltip>
                        )}
                        {req.status === "completed" && (
                          <Tooltip title="چاپ نتیجه">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PrintIcon />}
                              onClick={handlePrint}
                              sx={{
                                color: "#d97706",
                                borderColor: "#fde68a",
                                bgcolor: "#fffbeb",
                                borderRadius: "8px",
                                fontWeight: 600,
                                "&:hover": {
                                  borderColor: "#d97706",
                                  bgcolor: "#fef3c7",
                                },
                              }}
                            >
                              چاپ
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ============ دیالوگ جزئیات ============ */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#ffffff",
            color: "#0f172a",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <PersonIcon sx={{ color: "#0284c7" }} />
              جزئیات درخواست آزمایش
            </Typography>
            <IconButton
              onClick={() => setOpenDetailDialog(false)}
              sx={{ color: "#64748b", "&:hover": { bgcolor: "#e2e8f0" } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedRequest && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "#475569", fontWeight: 700, mb: 1 }}
                    >
                      <PersonIcon
                        sx={{
                          fontSize: 16,
                          verticalAlign: "middle",
                          mr: 0.5,
                          color: "#0284c7",
                        }}
                      />
                      اطلاعات بیمار
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#e2e8f0" }} />
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        {(() => {
                          const avTheme = getAvatarColor(
                            selectedRequest.patient_name || "User"
                          );
                          return (
                            <Avatar
                              sx={{
                                bgcolor: avTheme.bg,
                                color: avTheme.text,
                                width: 56,
                                height: 56,
                                fontSize: 22,
                                fontWeight: 800,
                              }}
                            >
                              {getInitials(
                                selectedRequest.patient_name || "کاربر"
                              )}
                            </Avatar>
                          );
                        })()}
                        <Box>
                          <Typography
                            sx={{
                              color: "#0f172a",
                              fontWeight: 800,
                              fontSize: "17px",
                            }}
                          >
                            {selectedRequest.patient_name || "نامشخص"}
                          </Typography>
                          {selectedRequest.patient_phone && (
                            <Typography
                              sx={{ color: "#475569", fontSize: "13.5px" }}
                            >
                              <PhoneIcon
                                sx={{
                                  fontSize: 14,
                                  verticalAlign: "middle",
                                  mr: 0.5,
                                  color: "#0284c7",
                                }}
                              />
                              {selectedRequest.patient_phone}
                            </Typography>
                          )}
                          {selectedRequest.patient_email && (
                            <Typography
                              sx={{ color: "#475569", fontSize: "13.5px" }}
                            >
                              <EmailIcon
                                sx={{
                                  fontSize: 14,
                                  verticalAlign: "middle",
                                  mr: 0.5,
                                  color: "#0284c7",
                                }}
                              />
                              {selectedRequest.patient_email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            سن:
                          </Typography>
                          <Typography
                            sx={{ color: "#0f172a", fontWeight: 600 }}
                          >
                            {selectedRequest.patient_age || "ندارد"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            جنسیت:
                          </Typography>
                          <Typography
                            sx={{ color: "#0f172a", fontWeight: 600 }}
                          >
                            {getGenderLabel(selectedRequest.patient_gender)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            تذکره:
                          </Typography>
                          <Typography
                            sx={{ color: "#0f172a", fontWeight: 600 }}
                          >
                            {selectedRequest.patient_national_id || "ندارد"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "#475569", fontWeight: 700, mb: 1 }}
                    >
                      <ScienceIcon
                        sx={{
                          fontSize: 16,
                          verticalAlign: "middle",
                          mr: 0.5,
                          color: "#0284c7",
                        }}
                      />
                      اطلاعات آزمایش
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#e2e8f0" }} />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography sx={{ color: "#64748b" }}>
                          نوع تست:
                        </Typography>
                        <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>
                          {selectedRequest.test_name ||
                            selectedRequest.test_type ||
                            "نامشخص"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography sx={{ color: "#64748b" }}>
                          شماره مراجعه:
                        </Typography>
                        <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                          {selectedRequest.registration_id ||
                            selectedRequest.reg_id ||
                            "N/A"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography sx={{ color: "#64748b" }}>
                          داکتر:
                        </Typography>
                        <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                          {selectedRequest.doctor_name || "نامشخص"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography sx={{ color: "#64748b" }}>
                          تاریخ درخواست:
                        </Typography>
                        <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                          {new Date(
                            selectedRequest.created_at
                          ).toLocaleDateString("fa-IR")}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography sx={{ color: "#64748b" }}>
                          وضعیت:
                        </Typography>
                        <Chip
                          label={
                            selectedRequest.status === "completed"
                              ? "تکمیل شده"
                              : "در انتظار"
                          }
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor:
                              selectedRequest.status === "completed"
                                ? "#dcfce7"
                                : "#fef3c7",
                            color:
                              selectedRequest.status === "completed"
                                ? "#15803d"
                                : "#b45309",
                          }}
                        />
                      </Box>
                      {selectedRequest.result && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography sx={{ color: "#64748b" }}>
                            نتیجه:
                          </Typography>
                          <Typography
                            sx={{ color: "#16a34a", fontWeight: 700 }}
                          >
                            {selectedRequest.result}
                          </Typography>
                        </Box>
                      )}
                      {selectedRequest.pdf_url && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography sx={{ color: "#64748b" }}>
                            فایل PDF:
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PdfIcon />}
                            onClick={() =>
                              handleDownloadPdf(selectedRequest.pdf_url)
                            }
                            sx={{
                              color: "#dc2626",
                              borderColor: "#fca5a5",
                              bgcolor: "#fef2f2",
                              borderRadius: "8px",
                            }}
                          >
                            مشاهده PDF
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {selectedRequest.notes && (
                <Grid item xs={12}>
                  <Card
                    elevation={0}
                    sx={{
                      bgcolor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: "#475569", fontWeight: 700, mb: 1 }}
                      >
                        یادداشت‌ها
                      </Typography>
                      <Divider sx={{ mb: 1.5, borderColor: "#e2e8f0" }} />
                      <Typography sx={{ color: "#334155" }}>
                        {selectedRequest.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
            p: 2,
          }}
        >
          <Button
            onClick={() => setOpenDetailDialog(false)}
            sx={{ color: "#64748b", fontWeight: 600 }}
          >
            بستن
          </Button>
          {selectedRequest?.status !== "completed" && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<EditIcon />}
              onClick={() => {
                setOpenDetailDialog(false);
                handleOpenResultDialog(selectedRequest);
              }}
              sx={{
                bgcolor: "#16a34a",
                borderRadius: "10px",
                fontWeight: 700,
                "&:hover": { bgcolor: "#15803d" },
              }}
            >
              ثبت نتیجه
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ============ دیالوگ ثبت نتیجه با آپلود PDF ============ */}
      <Dialog
        open={openResultDialog}
        onClose={() => !uploading && setOpenResultDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#ffffff",
            color: "#0f172a",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <EditIcon sx={{ color: "#16a34a" }} />
              ثبت نتیجه آزمایش
            </Typography>
            <IconButton
              onClick={() => !uploading && setOpenResultDialog(false)}
              sx={{ color: "#64748b", "&:hover": { bgcolor: "#e2e8f0" } }}
              disabled={uploading}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {uploading && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ color: "#475569", mb: 1 }}>
                در حال آپلود فایل...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#e2e8f0",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "#16a34a",
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: "#64748b", mt: 0.5 }}>
                {uploadProgress}%
              </Typography>
            </Box>
          )}

          {selectedRequest && (
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "12px",
                    p: 2,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" sx={{ color: "#0369a1" }}>
                        نام بیمار:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        {(() => {
                          const avTheme = getAvatarColor(
                            selectedRequest.patient_name || "User"
                          );
                          return (
                            <Avatar
                              sx={{
                                bgcolor: avTheme.bg,
                                color: avTheme.text,
                                width: 32,
                                height: 32,
                                fontSize: 13,
                                fontWeight: 800,
                              }}
                            >
                              {getInitials(
                                selectedRequest.patient_name || "کاربر"
                              )}
                            </Avatar>
                          );
                        })()}
                        <Typography
                          sx={{
                            color: "#0f172a",
                            fontWeight: 800,
                            fontSize: "15px",
                          }}
                        >
                          {selectedRequest.patient_name || "نامشخص"}
                        </Typography>
                        {selectedRequest.patient_phone && (
                          <Typography
                            sx={{ color: "#475569", fontSize: "12px", ml: 1 }}
                          >
                            <PhoneIcon
                              sx={{ fontSize: 12, verticalAlign: "middle" }}
                            />
                            {selectedRequest.patient_phone}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                        {selectedRequest.patient_age && (
                          <Typography
                            sx={{ color: "#475569", fontSize: "12px" }}
                          >
                            سن: {selectedRequest.patient_age} سال
                          </Typography>
                        )}
                        {selectedRequest.patient_gender && (
                          <Typography
                            sx={{ color: "#475569", fontSize: "12px" }}
                          >
                            جنسیت:{" "}
                            {getGenderLabel(selectedRequest.patient_gender)}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" sx={{ color: "#0369a1" }}>
                        نوع تست:
                      </Typography>
                      <Typography
                        sx={{
                          color: "#0f172a",
                          fontWeight: 800,
                          mt: 0.5,
                          fontSize: "15px",
                        }}
                      >
                        {selectedRequest.test_name ||
                          selectedRequest.test_type ||
                          "نامشخص"}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#475569", mt: 0.5, fontSize: "12px" }}
                      >
                        شماره مراجعه:{" "}
                        {selectedRequest.registration_id ||
                          selectedRequest.reg_id ||
                          "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="نتیجه آزمایش"
                  multiline
                  rows={4}
                  value={resultData.result}
                  onChange={(e) =>
                    setResultData({ ...resultData, result: e.target.value })
                  }
                  placeholder="مقدار نتیجه آزمایش را وارد کنید..."
                  disabled={uploading}
                  sx={lightInputSx}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="محدوده نرمال"
                  value={resultData.normal_range}
                  onChange={(e) =>
                    setResultData({
                      ...resultData,
                      normal_range: e.target.value,
                    })
                  }
                  placeholder="مثلاً: 10-20"
                  disabled={uploading}
                  sx={lightInputSx}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="وضعیت"
                  value={resultData.status}
                  onChange={(e) =>
                    setResultData({ ...resultData, status: e.target.value })
                  }
                  disabled={uploading}
                  sx={lightInputSx}
                >
                  <MenuItem value="pending">در انتظار</MenuItem>
                  <MenuItem value="completed">تکمیل شده</MenuItem>
                  <MenuItem value="cancelled">لغو شده</MenuItem>
                </TextField>
              </Grid>

              {/* ============ بخش آپلود PDF ============ */}
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "12px",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "#0284c7",
                      bgcolor: "#f0f9ff",
                    },
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    id="pdf-upload"
                    disabled={uploading}
                  />

                  {resultData.pdf_file_name || resultData.pdf_url ? (
                    <Box>
                      <List>
                        <ListItem
                          sx={{
                            bgcolor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            mb: 1,
                          }}
                        >
                          <ListItemIcon>
                            <PdfIcon sx={{ color: "#dc2626" }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={resultData.pdf_file_name || "فایل PDF"}
                            sx={{ color: "#0f172a" }}
                          />
                          <IconButton
                            onClick={handleRemoveFile}
                            disabled={uploading}
                            sx={{ color: "#dc2626" }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItem>
                      </List>
                      <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        sx={{
                          color: "#0284c7",
                          borderColor: "#0284c7",
                          borderRadius: "8px",
                          "&:hover": {
                            bgcolor: "#e0f2fe",
                          },
                        }}
                      >
                        تغییر فایل
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <AttachFileIcon
                        sx={{ fontSize: 42, color: "#94a3b8", mb: 1 }}
                      />
                      <Typography
                        variant="body1"
                        sx={{ color: "#334155", fontWeight: 600, mb: 0.5 }}
                      >
                        برای آپلود فایل PDF کلیک کنید
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        فقط فایل‌های PDF پذیرفته می‌شوند
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          disableElevation
                          startIcon={<UploadIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          sx={{
                            bgcolor: "#0284c7",
                            borderRadius: "8px",
                            fontWeight: 600,
                            "&:hover": { bgcolor: "#0369a1" },
                          }}
                        >
                          انتخاب فایل PDF
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="یادداشت"
                  multiline
                  rows={2}
                  value={resultData.notes}
                  onChange={(e) =>
                    setResultData({ ...resultData, notes: e.target.value })
                  }
                  placeholder="یادداشت اضافی..."
                  disabled={uploading}
                  sx={lightInputSx}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
            p: 2,
            gap: 1,
          }}
        >
          <Button
            onClick={() => setOpenResultDialog(false)}
            disabled={uploading}
            sx={{ color: "#64748b", fontWeight: 600 }}
          >
            لغو
          </Button>
          <Button
            onClick={handleSaveResult}
            variant="contained"
            disableElevation
            startIcon={
              uploading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
            disabled={uploading}
            sx={{
              bgcolor: "#16a34a",
              borderRadius: "10px",
              fontWeight: 700,
              "&:hover": { bgcolor: "#15803d" },
              "&.Mui-disabled": {
                bgcolor: "#cbd5e1",
                color: "#64748b",
              },
            }}
          >
            {uploading ? "در حال ذخیره..." : "ذخیره نتیجه"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}