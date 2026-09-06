// src/app/pages/radiology/Radiology.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Badge,
  Paper,
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
  Avatar,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  MenuItem,
  Snackbar,
} from "@mui/material";
import {
  Radio as RadioIcon,
  Healing as HealingIcon,
  Science as ScienceIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
  MonitorHeart as MonitorHeartIcon,
  Water as WaterIcon,
  Biotech as BiotechIcon,
  MedicalServices as MedicalServicesIcon,
  Preview as PreviewIcon,
  Scanner as ScannerIcon,
} from "@mui/icons-material";

export default function Radiology() {
  const navigate = useNavigate();
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [resultData, setResultData] = useState({
    result: "",
    status: "Completed",
    notes: "",
    normal_range: "",
    pdf_file: null,
    pdf_file_name: "",
    pdf_url: "",
    interpretation: "",
    findings: "",
  });
  const [editingResult, setEditingResult] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState(null);

  // ============ دسته‌بندی کامل رادیولوژی ============
  const categories = [
    // ===== رادیوگرافی (X-Ray) =====
    { 
      id: "xray", 
      title: "📷 رادیوگرافی ساده (X-Ray)", 
      icon: <ImageIcon sx={{ fontSize: 40, color: "#6b7280" }} />, 
      testType: "xray", 
      keywords: ["xray", "x-ray", "رادیوگرافی", "ساده"] 
    },
    { 
      id: "chest_xray", 
      title: "📷 رادیوگرافی قفسه سینه (CXR)", 
      icon: <ImageIcon sx={{ fontSize: 40, color: "#3b82f6" }} />, 
      testType: "chest_xray", 
      keywords: ["chest", "قفسه سینه", "cxr", "chest x-ray"] 
    },
    { 
      id: "abdominal_xray", 
      title: "📷 رادیوگرافی شکم", 
      icon: <ImageIcon sx={{ fontSize: 40, color: "#f59e0b" }} />, 
      testType: "abdominal_xray", 
      keywords: ["شکم", "abdominal", "abdomen"] 
    },
    { 
      id: "spine_xray", 
      title: "📷 رادیوگرافی ستون فقرات", 
      icon: <ImageIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "spine_xray", 
      keywords: ["ستون فقرات", "spine", "vertebra"] 
    },
    { 
      id: "extremity_xray", 
      title: "📷 رادیوگرافی اندام‌ها", 
      icon: <ImageIcon sx={{ fontSize: 40, color: "#10b981" }} />, 
      testType: "extremity_xray", 
      keywords: ["اندام", "extremity", "limb"] 
    },
    // ===== سی‌تی اسکن (CT Scan) =====
    { 
      id: "ct_scan", 
      title: "📷 سی‌تی اسکن (CT Scan)", 
      icon: <ScannerIcon sx={{ fontSize: 40, color: "#3b82f6" }} />, 
      testType: "ct_scan", 
      keywords: ["ct", "سی‌تی اسکن", "computed tomography"] 
    },
    { 
      id: "brain_ct", 
      title: "📷 سی‌تی اسکن مغز", 
      icon: <ScannerIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "brain_ct", 
      keywords: ["مغز", "brain", "ct brain"] 
    },
    { 
      id: "chest_ct", 
      title: "📷 سی‌تی اسکن قفسه سینه", 
      icon: <ScannerIcon sx={{ fontSize: 40, color: "#22c55e" }} />, 
      testType: "chest_ct", 
      keywords: ["قفسه سینه", "chest ct", "ct chest"] 
    },
    { 
      id: "abdominal_ct", 
      title: "📷 سی‌تی اسکن شکم و لگن", 
      icon: <ScannerIcon sx={{ fontSize: 40, color: "#f59e0b" }} />, 
      testType: "abdominal_ct", 
      keywords: ["شکم", "لگن", "abdominal ct", "pelvic ct"] 
    },
    { 
      id: "spine_ct", 
      title: "📷 سی‌تی اسکن ستون فقرات", 
      icon: <ScannerIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "spine_ct", 
      keywords: ["ستون فقرات", "spine ct"] 
    },
    // ===== ام‌آرآی (MRI) =====
    { 
      id: "mri", 
      title: "📷 ام‌آرآی (MRI)", 
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "mri", 
      keywords: ["mri", "ام‌آرآی", "magnetic resonance"] 
    },
    { 
      id: "brain_mri", 
      title: "📷 ام‌آرآی مغز", 
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#3b82f6" }} />, 
      testType: "brain_mri", 
      keywords: ["مغز", "brain mri"] 
    },
    { 
      id: "spine_mri", 
      title: "📷 ام‌آرآی ستون فقرات", 
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "spine_mri", 
      keywords: ["ستون فقرات", "spine mri"] 
    },
    { 
      id: "joint_mri", 
      title: "📷 ام‌آرآی مفاصل", 
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#10b981" }} />, 
      testType: "joint_mri", 
      keywords: ["مفصل", "joint mri"] 
    },
    // ===== سونوگرافی (Ultrasound) =====
    { 
      id: "ultrasound", 
      title: "📷 سونوگرافی (اولتراسوند)", 
      icon: <WaterIcon sx={{ fontSize: 40, color: "#fcd34d" }} />, 
      testType: "ultrasound", 
      keywords: ["سونوگرافی", "ultrasound", "sonography"] 
    },
    { 
      id: "pelvic_ultrasound", 
      title: "📷 سونوگرافی لگن", 
      icon: <WaterIcon sx={{ fontSize: 40, color: "#fbbf24" }} />, 
      testType: "pelvic_ultrasound", 
      keywords: ["لگن", "pelvic ultrasound"] 
    },
    { 
      id: "abdominal_ultrasound", 
      title: "📷 سونوگرافی شکم", 
      icon: <WaterIcon sx={{ fontSize: 40, color: "#f59e0b" }} />, 
      testType: "abdominal_ultrasound", 
      keywords: ["شکم", "abdominal ultrasound"] 
    },
    { 
      id: "obstetric_ultrasound", 
      title: "📷 سونوگرافی مامایی", 
      icon: <WaterIcon sx={{ fontSize: 40, color: "#ec4899" }} />, 
      testType: "obstetric_ultrasound", 
      keywords: ["مامایی", "obstetric", "pregnancy"] 
    },
    { 
      id: "vascular_ultrasound", 
      title: "📷 سونوگرافی عروق", 
      icon: <WaterIcon sx={{ fontSize: 40, color: "#ef4444" }} />, 
      testType: "vascular_ultrasound", 
      keywords: ["عروق", "vascular", "doppler"] 
    },
    // ===== فلوروسکوپی =====
    { 
      id: "fluoroscopy", 
      title: "📷 فلوروسکوپی", 
      icon: <RadioIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "fluoroscopy", 
      keywords: ["فلوروسکوپی", "fluoroscopy"] 
    },
    // ===== ماموگرافی =====
    { 
      id: "mammography", 
      title: "📷 ماموگرافی", 
      icon: <RadioIcon sx={{ fontSize: 40, color: "#ec4899" }} />, 
      testType: "mammography", 
      keywords: ["ماموگرافی", "mammography"] 
    },
    // ===== آنژیوگرافی =====
    { 
      id: "angiography", 
      title: "📷 آنژیوگرافی", 
      icon: <MonitorHeartIcon sx={{ fontSize: 40, color: "#ef4444" }} />, 
      testType: "angiography", 
      keywords: ["آنژیوگرافی", "angiography"] 
    },
    // ===== اکوکاردیوگرافی =====
    { 
      id: "echocardiography", 
      title: "📷 اکوکاردیوگرافی", 
      icon: <MonitorHeartIcon sx={{ fontSize: 40, color: "#10b981" }} />, 
      testType: "echocardiography", 
      keywords: ["اکوکاردیوگرافی", "echocardiography"] 
    },
    // ===== PET Scan =====
    { 
      id: "pet_scan", 
      title: "📷 PET Scan", 
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#06b6d4" }} />, 
      testType: "pet_scan", 
      keywords: ["pet", "pet scan"] 
    },
    // ===== سنجش تراکم استخوان (DEXA) =====
    { 
      id: "bone_density", 
      title: "📷 سنجش تراکم استخوان (DEXA)", 
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />, 
      testType: "bone_density", 
      keywords: ["تراکم استخوان", "dexa", "bone density"] 
    },
    // ===== سایر =====
    { 
      id: "other", 
      title: "📋 سایر", 
      icon: <MedicalServicesIcon sx={{ fontSize: 40, color: "#6b7280" }} />, 
      testType: "other", 
      keywords: ["سایر", "other"] 
    },
    // ===== ثبت نتایج (Special) =====
    { 
      id: "results", 
      title: "📄 ثبت نتایج", 
      icon: <PreviewIcon sx={{ fontSize: 40, color: "#06b6d4" }} />, 
      testType: "", 
      keywords: [], 
      isSpecial: true 
    },
  ];

  // ============ دریافت نتیجه با جزئیات کامل از سرور ============
  const fetchResultDetails = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      console.log("🔍 دریافت نتیجه برای درخواست:", requestId);
      
      const response = await fetch(
        `http://localhost:8000/api/radiology-results/request/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 وضعیت پاسخ:", response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("⚠️ نتیجه‌ای برای این درخواست یافت نشد");
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("📋 نتیجه دریافت شد:", result);
      
      if (result.success) {
        return result.data;
      } else {
        return null;
      }
    } catch (err) {
      console.error("❌ خطا در دریافت نتیجه:", err);
      return null;
    }
  };

  // ============ دریافت درخواست‌ها ============
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        "http://localhost:8000/api/radiology-results/all",
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
        } else if (result.data?.all_radiology && Array.isArray(result.data.all_radiology)) {
          allRequests = result.data.all_radiology;
        }
      }

      const processedRequests = allRequests.map((req) => {
        let patientName = "نامشخص";
        let patientPhone = "";
        let patientEmail = "";
        let patientAge = "";
        let patientGender = "";
        let patientNationalId = "";

        if (req.patient) {
          const p = req.patient;
          const firstName = p.first_name || "";
          const lastName = p.last_name || "";
          patientName = `${firstName} ${lastName}`.trim() || "نامشخص";
          if (p.mobile) patientPhone = p.mobile;
          if (p.email) patientEmail = p.email;
          if (p.age) patientAge = p.age;
          if (p.gender) patientGender = p.gender;
          if (p.national_id) patientNationalId = p.national_id;
        }

        if (req.registration?.patient) {
          const regPatient = req.registration.patient;
          if (!patientName || patientName === "نامشخص") {
            const firstName = regPatient.first_name || "";
            const lastName = regPatient.last_name || "";
            patientName = `${firstName} ${lastName}`.trim() || "نامشخص";
          }
          if (!patientPhone && regPatient.mobile) patientPhone = regPatient.mobile;
          if (!patientEmail && regPatient.email) patientEmail = regPatient.email;
          if (!patientAge && regPatient.age) patientAge = regPatient.age;
          if (!patientGender && regPatient.gender) patientGender = regPatient.gender;
          if (!patientNationalId && regPatient.national_id) patientNationalId = regPatient.national_id;
        }

        // ✅ استخراج نتیجه از داده‌ها
        const resultData = req.result || req.radiology_result || null;

        return {
          ...req,
          patient_name: patientName,
          patient_phone: patientPhone,
          patient_email: patientEmail,
          patient_age: patientAge,
          patient_gender: patientGender,
          patient_national_id: patientNationalId,
          registration_id: req.registration_id || req.reg_id || null,
          visit_number: req.registration?.visit_number || null,
          doctor_name: req.doctor?.name || null,
          body_part: req.body_part || null,
          radiology_type: req.radiology_type || req.test_type || null,
          priority: req.priority || null,
          // ✅ اضافه کردن نتیجه به هر درخواست
          has_result: !!(resultData),
          result_details: resultData,
        };
      });

      const paidRequests = processedRequests.filter((r) => r.has_fee === true);
      setAllRequests(paidRequests);
      setError(null);
      return paidRequests;
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
  }, []);

  // ============ تشخیص درخواست‌های هر دسته ============
  const getCategoryRequests = (category) => {
    return allRequests.filter((r) => {
      if (category.isSpecial) return false;

      if (category.testType && r.radiology_type === category.testType) {
        return true;
      }

      if (category.keywords.length > 0) {
        const testName = (r.radiology_type_label || r.radiology_type || r.test_name || "").toLowerCase();
        const testTypeName = (r.radiology_type || r.test_type || "").toLowerCase();

        return category.keywords.some(
          (keyword) =>
            testName.includes(keyword.toLowerCase()) ||
            testTypeName.includes(keyword.toLowerCase())
        );
      }

      return false;
    });
  };

  const isRequestCompleted = (request) =>
    String(request?.status || "").toLowerCase().trim() === "completed";

  // ============ انتخاب دسته ============
  const handleCategoryClick = (category) => {
    if (category.isSpecial) {
      navigate("/material/radiology-results");
      return;
    }

    const categoryRequests = getCategoryRequests(category);
    const pendingRequests = categoryRequests.filter(
      (r) => !isRequestCompleted(r)
    );
    const completedRequests = categoryRequests.filter(isRequestCompleted);

    const shouldShowCompleted =
      pendingRequests.length === 0 && completedRequests.length > 0;

    setSelectedCategory(category);
    setShowCompletedOnly(shouldShowCompleted);
    setFilteredRequests(
      shouldShowCompleted ? completedRequests : pendingRequests
    );
  };

  // ============ بازگشت به لیست دسته‌ها ============
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setFilteredRequests([]);
    setShowCompletedOnly(false);
  };

  // ============ مشاهده جزئیات با دریافت نتیجه از سرور ============
  const handleViewDetails = async (request) => {
    console.log("📋 مشاهده جزئیات درخواست:", request.id);
    
    // ✅ اگر نتیجه قبلاً در درخواست وجود دارد، از آن استفاده کن
    if (request.result_details) {
      setSelectedRequest({
        ...request,
        result_value: request.result_details.result || "",
        normal_range: request.result_details.normal_range || "",
        result_remarks: request.result_details.remarks || "",
        result_date: request.result_details.analysis_completed_at || request.result_details.created_at,
        pdf_url: request.result_details.pdf_url,
        pdf_file_name: request.result_details.pdf_file_name,
        report_no: request.result_details.report_no,
        interpretation: request.result_details.interpretation || "",
        findings: request.result_details.findings || "",
      });
      setOpenDetailDialog(true);
      return;
    }

    setSelectedRequest(request);
    setOpenDetailDialog(true);
    
    if (request.status === "completed" || request.has_result) {
      const resultData = await fetchResultDetails(request.id);
      if (resultData) {
        console.log("✅ نتیجه دریافت شد:", resultData);
        
        setSelectedRequest(prev => ({
          ...prev,
          result_details: resultData,
          result_value: resultData.result || "",
          normal_range: resultData.normal_range || "",
          result_remarks: resultData.remarks || "",
          result_date: resultData.analysis_completed_at || resultData.created_at,
          pdf_url: resultData.pdf_url,
          pdf_file_name: resultData.pdf_file_name,
          report_no: resultData.report_no,
          interpretation: resultData.interpretation || "",
          findings: resultData.findings || "",
        }));
      }
    }
  };

  // ============ باز کردن دیالوگ ثبت/تصحیح نتیجه ============
  const handleOpenResultDialog = async (request, edit = false) => {
    setSelectedRequest(request);
    setEditingResult(edit);

    if (edit) {
      setResultData({
        result: request.result_value || request.result || request.radiology_result?.result || "",
        status: request.result_details?.status || request.radiology_result?.result_status || "Completed",
        notes: request.result_remarks || request.radiology_result?.remarks || "",
        normal_range: request.normal_range || request.radiology_result?.normal_range || "",
        pdf_file: null,
        pdf_file_name: request.pdf_file_name || request.radiology_result?.pdf_file_name || "",
        pdf_url: request.pdf_url || request.radiology_result?.pdf_url || "",
        interpretation: request.interpretation || request.radiology_result?.interpretation || "",
        findings: request.findings || request.radiology_result?.findings || "",
      });

      try {
        const resultDetails = await fetchResultDetails(request.id);
        if (resultDetails) {
          setResultData({
            result: resultDetails.result || "",
            status: resultDetails.status || resultDetails.result_status || "Completed",
            notes: resultDetails.remarks || resultDetails.notes || "",
            normal_range: resultDetails.normal_range || "",
            pdf_file: null,
            pdf_file_name: resultDetails.pdf_file_name || "",
            pdf_url: resultDetails.pdf_url || "",
            interpretation: resultDetails.interpretation || "",
            findings: resultDetails.findings || "",
          });
        }
      } catch (error) {
        console.warn("⚠️ دریافت جزئیات نتیجه برای تصحیح انجام نشد:", error);
      }
    } else {
      setResultData({
        result: "",
        status: "Completed",
        notes: "",
        normal_range: "",
        pdf_file: null,
        pdf_file_name: "",
        pdf_url: "",
        interpretation: "",
        findings: "",
      });
    }

    setOpenResultDialog(true);
  };

  // ============ تصحیح نتیجه ثبت‌شده ============
  const handleEditResult = async (request) => {
    setOpenDetailDialog(false);
    await handleOpenResultDialog(request, true);
  };

  // ============ حذف نتیجه ثبت‌شده ============
  const handleDeleteResult = async (request) => {
    const resultId =
      request.result_details?.id ||
      request.radiology_result?.id ||
      request.result_id;

    if (!resultId) {
      showToast("شناسه نتیجه برای حذف پیدا نشد", "error");
      return;
    }

    const confirmed = window.confirm(
      "آیا مطمئت هستید که می‌خواهید نتیجه ثبت‌شده این رادیولوژی را حذف کنید؟"
    );

    if (!confirmed) return;

    try {
      setDeletingResultId(resultId);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:8000/api/radiology-results/${resultId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const responseText = await response.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        // پاسخ غیر JSON را نادیده می‌گیریم
      }

      if (!response.ok) {
        throw new Error(
          result.message || result.error || `خطا در حذف نتیجه (${response.status})`
        );
      }

      showToast("✅ نتیجه با موفقیت حذف شد", "success");
      setOpenDetailDialog(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error("❌ خطا در حذف نتیجه:", error);
      showToast("❌ خطا در حذف نتیجه: " + error.message, "error");
    } finally {
      setDeletingResultId(null);
    }
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
        setError(null);
      } else {
        setError("لطفاً فقط فایل PDF انتخاب کنید");
      }
    }
  };

  // ============ نمایش Toast ============
  const showToast = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message: message,
      severity: severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
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

  // ============ دانلود فایل PDF با fetch و توکن ============
  const handleDownloadPdf = async (pdfUrl) => {
    if (!pdfUrl) {
      showToast("❌ آدرس فایل PDF موجود نیست", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      showToast("⏳ در حال دانلود فایل...", "info");
      
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`خطا در دانلود: ${response.status}`);
      }

      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfUrl.split('/').pop() || 'result.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast("✅ دانلود فایل با موفقیت انجام شد", "success");
      
    } catch (error) {
      console.error("❌ خطا در دانلود PDF:", error);
      showToast("❌ خطا در دانلود فایل: " + error.message, "error");
    }
  };

  // ============ پرینت نتیجه ============
  const handlePrintResult = async (request) => {
    console.log("🖨️ شروع پرینت نتیجه برای:", request.id);
    
    try {
      let resultData = await fetchResultDetails(request.id);
      
      if (!resultData) {
        resultData = request.result_details || {};
        console.log("📋 استفاده از داده‌های موجود در request");
      } else {
        console.log("📋 استفاده از داده‌های دریافت شده از سرور");
      }

      const patient = resultData.patient || {};
      const test = resultData.test || {};
      const doctor = resultData.doctor || {};
      const registration = resultData.registration || {};
      
      const patientName = patient.full_name || request.patient_full_name || request.patient_name || "نامشخص";
      const patientPhone = patient.mobile || request.patient_phone || "";
      const patientAge = patient.age || request.patient_age || "";
      const patientGender = patient.gender_label || request.patient_gender || "";
      const testName = test.test_name || request.radiology_type_label || request.radiology_type || request.test_name || "نامشخص";
      const resultValue = resultData.result || request.result_value || "نتیجه ثبت نشده";
      const normalRange = resultData.normal_range || request.normal_range || "-";
      const resultNotes = resultData.remarks || request.result_remarks || "";
      const resultDate = resultData.analysis_completed_at || resultData.created_at || request.result_date || request.created_at || new Date().toISOString();
      const pdfUrl = resultData.pdf_url || request.pdf_url || "";
      const pdfFileName = resultData.pdf_file_name || request.pdf_file_name || "";
      const doctorName = doctor.name || request.doctor_name || "نامشخص";
      const regId = registration.reg_id || request.registration_id || request.reg_id || "-";
      const reportNo = resultData.report_no || request.report_no || "";
      const interpretation = resultData.interpretation || request.interpretation || "";
      const findings = resultData.findings || request.findings || "";
      const bodyPart = request.body_part || "";
      const priority = request.priority || "";
      
      const hasResult = !!(resultData.result || request.result_value);
      const statusLabel = hasResult ? "ثبت شده" : "تکمیل شده";
      const statusColor = hasResult ? "#10b981" : "#3b82f6";
      
      const now = new Date();
      const printDate = now.toLocaleDateString('fa-IR');
      const printTime = now.toLocaleTimeString('fa-IR');
      
      const priorityLabels = {
        normal: "🟢 عادی",
        urgent: "🟡 فوری",
        emergency: "🔴 اورژانسی"
      };
      
      const printHtml = `<!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>نتیجه رادیولوژی - ${patientName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Tahoma', 'Arial', sans-serif; 
              padding: 20px; 
              direction: rtl;
              background: #ffffff;
              color: #1a1a2e;
            }
            .print-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #1a2a3a;
              border-radius: 12px;
              padding: 25px;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #1a2a3a;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }
            .header h1 {
              font-size: 22px;
              color: #1a2a3a;
              margin-bottom: 3px;
            }
            .header .subtitle {
              font-size: 13px;
              color: #6b7280;
            }
            .hospital-info {
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 15px;
            }
            .patient-info {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
              background: #f3f4f6;
              padding: 12px 15px;
              border-radius: 8px;
              margin-bottom: 18px;
            }
            .patient-info .item {
              display: flex;
              flex-direction: column;
            }
            .patient-info .label {
              font-size: 10px;
              color: #6b7280;
              font-weight: bold;
            }
            .patient-info .value {
              font-size: 13px;
              color: #1a2a3a;
              font-weight: bold;
            }
            .result-section {
              margin: 15px 0;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            .result-section .title {
              background: #1a2a3a;
              color: white;
              padding: 8px 15px;
              font-weight: bold;
              font-size: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .result-section .title .report-no {
              font-size: 11px;
              color: #9ca3af;
              font-weight: normal;
            }
            .result-section .body {
              padding: 12px 15px;
            }
            .result-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .result-row:last-child {
              border-bottom: none;
            }
            .result-row .label {
              color: #6b7280;
              font-weight: bold;
              font-size: 12px;
            }
            .result-row .value {
              color: #1a2a3a;
              font-weight: bold;
              font-size: 13px;
            }
            .result-row .value.normal {
              color: #10b981;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: bold;
              color: white;
              background: ${statusColor};
            }
            .footer {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 2px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #6b7280;
            }
            .signature {
              margin-top: 18px;
              display: flex;
              justify-content: space-between;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .signature .field {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .signature .field .label {
              font-size: 10px;
              color: #6b7280;
              margin-bottom: 3px;
            }
            .signature .field .line {
              width: 120px;
              border-bottom: 1px solid #1a2a3a;
              height: 18px;
            }
            .print-footer {
              text-align: center;
              font-size: 10px;
              color: #9ca3af;
              margin-top: 15px;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
            }
            @media print {
              body { padding: 10px; }
              .print-container { border: none; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <h1>🏥 نتیجه رادیولوژی</h1>
              <div class="subtitle">نتیجه تصویربرداری</div>
            </div>
            <div class="hospital-info">
              تاریخ چاپ: ${printDate} - ساعت: ${printTime}
            </div>

            <div class="patient-info">
              <div class="item">
                <span class="label">👤 نام بیمار</span>
                <span class="value">${patientName}</span>
              </div>
              <div class="item">
                <span class="label">📱 شماره تماس</span>
                <span class="value">${patientPhone || '-'}</span>
              </div>
              <div class="item">
                <span class="label">🎂 سن</span>
                <span class="value">${patientAge || '-'}</span>
              </div>
              <div class="item">
                <span class="label">⚧ جنسیت</span>
                <span class="value">${patientGender || '-'}</span>
              </div>
              <div class="item">
                <span class="label">📋 شماره مراجعه</span>
                <span class="value">${regId}</span>
              </div>
              <div class="item">
                <span class="label">👨‍⚕️ داکتر معالج</span>
                <span class="value">${doctorName}</span>
              </div>
            </div>

            <div class="result-section">
              <div class="title">
                <span>📷 ${testName}</span>
                <span class="report-no">شماره گزارش: ${reportNo || '-'}</span>
              </div>
              <div class="body">
                <div class="result-row">
                  <span class="label">نوع رادیولوژی</span>
                  <span class="value">${testName}</span>
                </div>
                ${bodyPart ? `<div class="result-row">
                  <span class="label">بخش مورد نظر</span>
                  <span class="value">${bodyPart}</span>
                </div>` : ''}
                ${priority ? `<div class="result-row">
                  <span class="label">اولویت</span>
                  <span class="value">${priorityLabels[priority] || priority}</span>
                </div>` : ''}
                <div class="result-row">
                  <span class="label">نتیجه</span>
                  <span class="value normal">${resultValue}</span>
                </div>
                ${findings ? `<div class="result-row">
                  <span class="label">یافته‌ها</span>
                  <span class="value">${findings}</span>
                </div>` : ''}
                ${interpretation ? `<div class="result-row">
                  <span class="label">تفسیر</span>
                  <span class="value">${interpretation}</span>
                </div>` : ''}
                <div class="result-row">
                  <span class="label">محدوده نرمال</span>
                  <span class="value">${normalRange}</span>
                </div>
                <div class="result-row">
                  <span class="label">وضعیت</span>
                  <span class="value"><span class="status-badge">${statusLabel}</span></span>
                </div>
                ${resultNotes ? `<div class="result-row">
                  <span class="label">یادداشت</span>
                  <span class="value">${resultNotes}</span>
                </div>` : ''}
                <div class="result-row">
                  <span class="label">تاریخ نتیجه</span>
                  <span class="value">${new Date(resultDate).toLocaleDateString('fa-IR')}</span>
                </div>
                ${pdfUrl ? `<div class="result-row">
                  <span class="label">فایل ضمیمه</span>
                  <span class="value">📎 ${pdfFileName || 'PDF'}</span>
                </div>` : ''}
              </div>
            </div>

            <div class="signature">
              <div class="field">
                <span class="label">امضاء داکتر</span>
                <div class="line"></div>
              </div>
              <div class="field">
                <span class="label">امضاء رادیولوژیست</span>
                <div class="line"></div>
              </div>
              <div class="field">
                <span class="label">تاریخ</span>
                <div class="line"></div>
              </div>
            </div>

            <div class="footer">
              <span>📷 ${testName}</span>
              <span>کد: ${regId}</span>
              <span>${printDate}</span>
            </div>
            
            <div class="print-footer">
              این نتیجه توسط سیستم مدیریت درمانگاه تهیه شده است
            </div>
          </div>
        </body>
        </html>`;

      const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      if (!printWindow) {
        showToast("❌ پنجره پرینت باز نشد. لطفاً pop-up را فعال کنید.", "error");
        return;
      }
      
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error("خطا در پرینت:", e);
          showToast("❌ خطا در پرینت. لطفاً مجدداً تلاش کنید.", "error");
        }
      }, 800);
      
    } catch (error) {
      console.error("❌ خطا در پرینت:", error);
      showToast("❌ خطا در پرینت: " + error.message, "error");
    }
  };

  // ============ ثبت یا تصحیح نتیجه با آپلود PDF ============
  const handleSaveResult = async () => {
    if (!resultData.result || resultData.result.trim() === "") {
      showToast("لطفاً نتیجه رادیولوژی را وارد کنید", "error");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const formData = new FormData();

      const resultId =
        selectedRequest?.result_details?.id ||
        selectedRequest?.radiology_result?.id ||
        selectedRequest?.result_id;

      formData.append("radiology_request_id", selectedRequest.id);
      formData.append(
        "registration_id",
        selectedRequest.registration_id || selectedRequest.reg_id || ""
      );
      formData.append("patient_id", selectedRequest.patient_id || "");
      formData.append("result_status", resultData.status);
      formData.append("result", resultData.result.trim());
      formData.append("normal_range", resultData.normal_range || "");
      formData.append("remarks", resultData.notes || "");
      formData.append("interpretation", resultData.interpretation || "");
      formData.append("findings", resultData.findings || "");

      if (resultData.pdf_file) {
        formData.append("pdf_file", resultData.pdf_file);
      }

      const isEdit = editingResult && !!resultId;
      const url = isEdit
        ? `http://localhost:8000/api/radiology-results/${resultId}`
        : "http://localhost:8000/api/radiology-results";

      if (isEdit) {
        formData.append("_method", "PUT");
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        showToast("پاسخ نامعتبر از سرور دریافت شد", "error");
        return;
      }

      if (!response.ok) {
        const errorMessage =
          result.message || result.error || (isEdit ? "خطا در تصحیح نتیجه" : "خطا در ثبت نتیجه");
        showToast(errorMessage, "error");
        return;
      }

      if (result.success) {
        showToast(
          isEdit ? "✅ نتیجه با موفقیت تصحیح شد" : "✅ نتیجه با موفقیت ثبت شد",
          "success"
        );

        setOpenResultDialog(false);
        setEditingResult(false);

        setResultData({
          result: "",
          status: "Completed",
          notes: "",
          normal_range: "",
          pdf_file: null,
          pdf_file_name: "",
          pdf_url: "",
          interpretation: "",
          findings: "",
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        const refreshedRequests = await fetchRequests();

        if (selectedCategory) {
          const sourceRequests = Array.isArray(refreshedRequests)
            ? refreshedRequests
            : allRequests;

          const filtered = sourceRequests.filter((r) => {
            if (selectedCategory.testType && r.radiology_type === selectedCategory.testType) {
              return true;
            }
            if (selectedCategory.keywords.length > 0) {
              const testName = (r.radiology_type_label || r.radiology_type || r.test_name || "").toLowerCase();
              const testTypeName = (r.radiology_type || r.test_type || "").toLowerCase();
              return selectedCategory.keywords.some(
                (keyword) =>
                  testName.includes(keyword.toLowerCase()) ||
                  testTypeName.includes(keyword.toLowerCase())
              );
            }
            return false;
          });

          setFilteredRequests(filtered);
        }
      } else {
        const errorMessage = result.message || (isEdit ? "خطا در تصحیح نتیجه" : "خطا در ثبت نتیجه");
        showToast(errorMessage, "error");
      }
    } catch (err) {
      console.error("❌ خطا در ثبت/تصحیح نتیجه:", err);
      showToast(err.message || "خطا در ثبت یا تصحیح نتیجه", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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

  // ============ دریافت رنگ برای Avatar ============
  const getAvatarColor = (name) => {
    const colors = [
      "#ef4444", "#f59e0b", "#10b981", "#3b82f6", 
      "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
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

  // ============ اولویت به فارسی ============
  const getPriorityLabel = (priority) => {
    const priorities = {
      normal: "🟢 عادی",
      urgent: "🟡 فوری",
      emergency: "🔴 اورژانسی",
    };
    return priorities[priority] || priority || "عادی";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      normal: "#10b981",
      urgent: "#f59e0b",
      emergency: "#ef4444",
    };
    return colors[priority] || "#6b7280";
  };

  // ============ رندر ============
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 5, minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: "100%",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: "#1a2a3a",
          borderRadius: "12px",
          border: "1px solid #374151",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {selectedCategory && (
            <IconButton
              onClick={handleBackToCategories}
              sx={{
                color: "#60a5fa",
                bgcolor: "rgba(96, 165, 250, 0.1)",
                "&:hover": { bgcolor: "rgba(96, 165, 250, 0.2)" },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <RadioIcon sx={{ fontSize: 35, color: "#ef4444" }} />
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "white" }}>
            {selectedCategory ? selectedCategory.title : "📷 رادیولوژی"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {(() => {
            const visibleRequests = selectedCategory ? filteredRequests : allRequests;
            const totalRequests = visibleRequests.length;
            const requestsWithResult = visibleRequests.filter(isRequestCompleted).length;
            const requestsWithoutResult = visibleRequests.filter(
              (r) => !isRequestCompleted(r)
            ).length;

            return (
              <>
                <Chip
                  label={
                    selectedCategory
                      ? showCompletedOnly
                        ? `درخواست‌های تکمیل‌شده: ${requestsWithResult}`
                        : `درخواست‌های بدون نتیجه: ${requestsWithoutResult}`
                      : `کل درخواست‌ها: ${totalRequests}`
                  }
                  color={selectedCategory && showCompletedOnly ? "success" : "info"}
                  size="medium"
                  sx={{ fontWeight: "bold" }}
                />
                {!selectedCategory && (
                  <>
                    <Chip
                      label={`بدون نتیجه: ${requestsWithoutResult}`}
                      color="warning"
                      size="medium"
                      sx={{ fontWeight: "bold" }}
                    />
                    <Chip
                      label={`دارای نتیجه: ${requestsWithResult}`}
                      color="success"
                      size="medium"
                      sx={{ fontWeight: "bold" }}
                    />
                  </>
                )}
              </>
            );
          })()}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!selectedCategory ? (
        <Grid container spacing={3}>
          {categories.map((category) => {
            const categoryRequests = getCategoryRequests(category);
            const pendingCount = categoryRequests.filter(
              (r) => !isRequestCompleted(r)
            ).length;
            const completedCount = categoryRequests.filter(
              isRequestCompleted
            ).length;

            const count = pendingCount;
            const hasRequests = categoryRequests.length > 0;
            const hasPendingRequests = pendingCount > 0;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                <Card
                  sx={{
                    bgcolor: hasRequests ? "#1a2a3a" : "#0d1520",
                    borderRadius: "12px",
                    border: hasRequests ? "1px solid #374151" : "1px solid #1f2a3a",
                    transition: "all 0.3s",
                    cursor: hasRequests || category.isSpecial ? "pointer" : "not-allowed",
                    opacity: hasRequests ? 1 : 0.6,
                    "&:hover": {
                      transform: hasRequests ? "translateY(-4px)" : "none",
                      borderColor: hasRequests ? "#60a5fa" : "#1f2a3a",
                      boxShadow: hasRequests ? "0 8px 25px rgba(0,0,0,0.3)" : "none",
                      opacity: hasRequests ? 1 : 0.7,
                    },
                  }}
                  onClick={() => {
                    if (hasRequests || category.isSpecial) {
                      handleCategoryClick(category);
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Box sx={{ 
                      display: "flex", 
                      justifyContent: "center", 
                      mb: 2,
                      opacity: hasRequests ? 1 : 0.5,
                    }}>
                      {category.icon}
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: hasRequests ? "white" : "#6b7280",
                        fontWeight: hasRequests ? "bold" : "normal",
                        fontSize: "13px",
                        lineHeight: 1.3,
                        minHeight: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {category.title}
                    </Typography>
                    {category.isSpecial ? (
                      <Typography variant="body2" sx={{ color: "#60a5fa", mt: 1, fontSize: "12px" }}>
                        کلیک کنید →
                      </Typography>
                    ) : hasRequests ? (
                      <>
                        {hasPendingRequests ? (
                          <Badge
                            badgeContent={count}
                            color="error"
                            sx={{
                              mt: 1,
                              "& .MuiBadge-badge": {
                                fontSize: "14px",
                                fontWeight: "bold",
                                backgroundColor: "#ef4444",
                                color: "white",
                                padding: "0 8px",
                              },
                            }}
                          >
                            <Typography variant="body2" sx={{ color: "#9ca3af", visibility: "hidden" }}>
                              -
                            </Typography>
                          </Badge>
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#22c55e",
                              mt: 1,
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            ✅ بدون درخواست بدون نتیجه
                          </Typography>
                        )}

                        <Typography
                          variant="body2"
                          sx={{
                            color: hasPendingRequests ? "#f59e0b" : "#22c55e",
                            mt: 1,
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {hasPendingRequests
                            ? `${pendingCount} درخواست بدون نتیجه • ${completedCount} تکمیل‌شده`
                            : `همه ${completedCount} درخواست تکمیل شده‌اند • کلیک برای مشاهده`}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "#4b5563", mt: 1, fontSize: "12px" }}>
                        ◻️ بدون درخواست
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        filteredRequests.length === 0 ? (
          <Paper
            sx={{
              p: 5,
              textAlign: "center",
              bgcolor: "#1a2a3a",
              borderRadius: "12px",
              border: "1px solid #374151",
            }}
          >
            <RadioIcon sx={{ fontSize: 60, color: "#6b7280", mb: 2 }} />
            <Typography variant="h6" sx={{ color: "#9ca3af" }}>
              هیچ درخواستی برای {selectedCategory.title} یافت نشد
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", mt: 1 }}>
              درخواست‌های جدید پس از پرداخت فیس در اینجا نمایش داده می‌شوند
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              bgcolor: "#1a2a3a",
              borderRadius: "12px",
              border: "1px solid #374151",
              overflowX: "auto",
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#0d1b2a" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>#</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>اطلاعات بیمار</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>نوع رادیولوژی</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>بخش</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>اولویت</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>تاریخ درخواست</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>وضعیت</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>📄 نتیجه</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>PDF</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((req, index) => {
                  const patientName = req.patient_name || "نامشخص";
                  const patientPhone = req.patient_phone || "";
                  const isCompleted = req.status === "completed";
                  const hasResult = !!(req.radiology_result?.result || req.result || req.result_details);
                  
                  return (
                    <TableRow
                      key={req.id}
                      sx={{
                        "&:hover": { bgcolor: "#243647" },
                        borderBottom: "1px solid #374151",
                        opacity: isCompleted ? 0.7 : 1,
                      }}
                    >
                      <TableCell sx={{ color: "#9ca3af" }}>{index + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(patientName),
                              width: 45,
                              height: 45,
                              fontSize: 18,
                              fontWeight: "bold",
                            }}
                          >
                            {getInitials(patientName)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ color: "white", fontWeight: "bold", fontSize: "15px" }}>
                              {patientName}
                            </Typography>
                            {patientPhone && (
                              <Typography sx={{ color: "#9ca3af", fontSize: "12px" }}>
                                <PhoneIcon sx={{ fontSize: 12, verticalAlign: "middle" }} />
                                {patientPhone}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={req.radiology_type_label || req.radiology_type || req.test_name || "نامشخص"}
                          size="small"
                          sx={{
                            bgcolor: isCompleted ? "rgba(34, 197, 94, 0.2)" : "rgba(96, 165, 250, 0.2)",
                            color: isCompleted ? "#22c55e" : "#60a5fa",
                            fontWeight: "bold",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#9ca3af" }}>
                        {req.body_part || "-"}
                      </TableCell>
                      <TableCell>
                        {req.priority && (
                          <Chip
                            label={getPriorityLabel(req.priority)}
                            size="small"
                            sx={{
                              bgcolor: `${getPriorityColor(req.priority)}20`,
                              color: getPriorityColor(req.priority),
                              fontWeight: "bold",
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: "#9ca3af" }}>
                        {new Date(req.created_at).toLocaleDateString("fa-IR")}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isCompleted && hasResult ? "✅ ثبت شده" : isCompleted ? "✅ تکمیل شده" : "⏳ در انتظار"}
                          color={isCompleted && hasResult ? "success" : isCompleted ? "primary" : "warning"}
                          size="small"
                          sx={{ fontWeight: "bold" }}
                        />
                      </TableCell>
                      {/* ✅ ستون نتیجه - جدید */}
                      <TableCell sx={{ color: "#9ca3af", fontSize: "12px" }}>
                        {hasResult && req.result_details ? (
                          <Box>
                            <Typography sx={{ color: "#22c55e", fontWeight: "bold", fontSize: "12px" }}>
                              {req.result_details.result || "ثبت شده"}
                            </Typography>
                            {req.result_details.pdf_url && (
                              <a 
                                href={req.result_details.pdf_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: "#3b82f6", fontSize: "10px", textDecoration: "none", display: "block" }}
                              >
                                📎 PDF
                              </a>
                            )}
                          </Box>
                        ) : (
                          <Typography sx={{ color: "#6b7280", fontSize: "12px" }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.pdf_url ? (
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="دانلود PDF">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadPdf(req.pdf_url)}
                                sx={{ color: "#22c55e" }}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Typography sx={{ color: "#6b7280", fontSize: "12px" }}>
                            ندارد
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                          <Tooltip title="مشاهده جزئیات">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleViewDetails(req)}
                              sx={{
                                color: "#60a5fa",
                                borderColor: "#60a5fa",
                                "&:hover": {
                                  borderColor: "#93c5fd",
                                  backgroundColor: "rgba(96, 165, 250, 0.1)",
                                },
                              }}
                            >
                              جزئیات
                            </Button>
                          </Tooltip>
                          {!isCompleted && (
                            <Tooltip title="ثبت نتیجه">
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenResultDialog(req)}
                                sx={{
                                  bgcolor: "#22c55e",
                                  "&:hover": { bgcolor: "#16a34a" },
                                }}
                              >
                                ثبت نتیجه
                              </Button>
                            </Tooltip>
                          )}
                          {isCompleted && (
                            <>
                              <Tooltip title="تصحیح نتیجه">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<EditIcon />}
                                  onClick={() => handleEditResult(req)}
                                  disabled={!hasResult}
                                  sx={{
                                    color: "#f59e0b",
                                    borderColor: "#f59e0b",
                                    "&:hover": {
                                      borderColor: "#fbbf24",
                                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                                    },
                                  }}
                                >
                                  تصحیح
                                </Button>
                              </Tooltip>

                              <Tooltip title="حذف نتیجه">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={
                                    deletingResultId ? (
                                      <CircularProgress size={14} color="inherit" />
                                    ) : (
                                      <DeleteIcon />
                                    )
                                  }
                                  onClick={() => handleDeleteResult(req)}
                                  disabled={!hasResult || deletingResultId === (req.result_details?.id || req.radiology_result?.id || req.result_id)}
                                  sx={{
                                    color: "#ef4444",
                                    borderColor: "#ef4444",
                                    "&:hover": {
                                      borderColor: "#f87171",
                                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                                    },
                                  }}
                                >
                                  حذف
                                </Button>
                              </Tooltip>

                              <Tooltip title="پرینت نتیجه">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<PrintIcon />}
                                  onClick={() => handlePrintResult(req)}
                                  sx={{
                                    color: "#8b5cf6",
                                    borderColor: "#8b5cf6",
                                    "&:hover": {
                                      borderColor: "#a78bfa",
                                      backgroundColor: "rgba(139, 92, 246, 0.1)",
                                    },
                                  }}
                                >
                                  پرینت
                                </Button>
                              </Tooltip>

                              <Chip
                                label={hasResult ? "نتیجه ثبت شده" : "تکمیل شده"}
                                size="small"
                                sx={{
                                  bgcolor: hasResult ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.2)",
                                  color: hasResult ? "#22c55e" : "#3b82f6",
                                  fontWeight: "bold",
                                }}
                              />
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {/* ============ دیالوگ جزئیات ============ */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1a2a3a",
            color: "white",
            borderRadius: "16px",
            border: "1px solid #374151",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid #374151", pb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
              <RadioIcon sx={{ color: "#60a5fa" }} />
              جزئیات درخواست رادیولوژی
            </Typography>
            <IconButton onClick={() => setOpenDetailDialog(false)} sx={{ color: "#9ca3af" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedRequest && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: "#0d1b2a", border: "1px solid #374151" }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#9ca3af", mb: 1 }}>
                      <PersonIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
                      اطلاعات بیمار
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#374151" }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: getAvatarColor(selectedRequest.patient_full_name || selectedRequest.patient_name || "User"),
                          width: 60,
                          height: 60,
                          fontSize: 24,
                          fontWeight: "bold",
                        }}
                      >
                        {getInitials(selectedRequest.patient_full_name || selectedRequest.patient_name || "کاربر")}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
                          {selectedRequest.patient_full_name || selectedRequest.patient_name || "نامشخص"}
                        </Typography>
                        {selectedRequest.patient_phone && (
                          <Typography sx={{ color: "#9ca3af", fontSize: "14px" }}>
                            <PhoneIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                            {selectedRequest.patient_phone}
                          </Typography>
                        )}
                        {selectedRequest.patient_age && (
                          <Typography sx={{ color: "#9ca3af", fontSize: "14px" }}>
                            <AccessTimeIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                            سن: {selectedRequest.patient_age} سال
                          </Typography>
                        )}
                        {selectedRequest.patient_gender && (
                          <Typography sx={{ color: "#9ca3af", fontSize: "14px" }}>
                            <BadgeIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                            جنسیت: {getGenderLabel(selectedRequest.patient_gender)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card sx={{ bgcolor: "#0d1b2a", border: "1px solid #374151" }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#9ca3af", mb: 1 }}>
                      <RadioIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
                      اطلاعات رادیولوژی
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#374151" }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>نوع رادیولوژی:</Typography>
                        <Typography sx={{ color: "white", fontWeight: "bold" }}>
                          {selectedRequest.radiology_type_label || selectedRequest.radiology_type || selectedRequest.test_name || "نامشخص"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>بخش مورد نظر:</Typography>
                        <Typography sx={{ color: "white", fontWeight: "bold" }}>
                          {selectedRequest.body_part || "-"}
                        </Typography>
                      </Box>
                      {selectedRequest.priority && (
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography sx={{ color: "#9ca3af" }}>اولویت:</Typography>
                          <Chip
                            label={getPriorityLabel(selectedRequest.priority)}
                            size="small"
                            sx={{
                              bgcolor: `${getPriorityColor(selectedRequest.priority)}20`,
                              color: getPriorityColor(selectedRequest.priority),
                              fontWeight: "bold",
                            }}
                          />
                        </Box>
                      )}
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>وضعیت:</Typography>
                        <Chip
                          label={selectedRequest.status === "completed" ? "تکمیل شده" : "در انتظار"}
                          color={selectedRequest.status === "completed" ? "success" : "warning"}
                          size="small"
                        />
                      </Box>
                      {selectedRequest.status === "completed" && (
                        <>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography sx={{ color: "#9ca3af" }}>شماره گزارش:</Typography>
                            <Typography sx={{ color: "#fcd34d", fontWeight: "bold" }}>
                              {selectedRequest.report_no || "-"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography sx={{ color: "#9ca3af" }}>نتیجه:</Typography>
                            <Typography sx={{ color: "#22c55e", fontWeight: "bold" }}>
                              {selectedRequest.result_value || selectedRequest.result || selectedRequest.radiology_result?.result || "ثبت شده"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography sx={{ color: "#9ca3af" }}>محدوده نرمال:</Typography>
                            <Typography sx={{ color: "white", fontWeight: "bold" }}>
                              {selectedRequest.normal_range || "-"}
                            </Typography>
                          </Box>
                          {selectedRequest.findings && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#9ca3af" }}>یافته‌ها:</Typography>
                              <Typography sx={{ color: "white" }}>
                                {selectedRequest.findings}
                              </Typography>
                            </Box>
                          )}
                          {selectedRequest.interpretation && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#9ca3af" }}>تفسیر:</Typography>
                              <Typography sx={{ color: "white" }}>
                                {selectedRequest.interpretation}
                              </Typography>
                            </Box>
                          )}
                          {selectedRequest.result_remarks && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#9ca3af" }}>یادداشت:</Typography>
                              <Typography sx={{ color: "white" }}>
                                {selectedRequest.result_remarks}
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography sx={{ color: "#9ca3af" }}>تاریخ نتیجه:</Typography>
                            <Typography sx={{ color: "white" }}>
                              {selectedRequest.result_date ? new Date(selectedRequest.result_date).toLocaleDateString("fa-IR") : "-"}
                            </Typography>
                          </Box>
                          {selectedRequest.pdf_url && (
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Typography sx={{ color: "#9ca3af" }}>فایل PDF:</Typography>
                              <Stack direction="row" spacing={1}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => handleDownloadPdf(selectedRequest.pdf_url)}
                                  sx={{
                                    color: "#22c55e",
                                    borderColor: "#22c55e",
                                    "&:hover": {
                                      borderColor: "#4ade80",
                                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                                    },
                                  }}
                                >
                                  دانلود
                                </Button>
                              </Stack>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #374151", p: 2 }}>
          <Button onClick={() => setOpenDetailDialog(false)} sx={{ color: "#9ca3af" }}>
            بستن
          </Button>
          {selectedRequest?.status !== "completed" && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setOpenDetailDialog(false);
                handleOpenResultDialog(selectedRequest);
              }}
              sx={{
                bgcolor: "#22c55e",
                "&:hover": { bgcolor: "#16a34a" },
              }}
            >
              ثبت نتیجه
            </Button>
          )}
          {selectedRequest?.status === "completed" && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditResult(selectedRequest)}
                sx={{
                  color: "#f59e0b",
                  borderColor: "#f59e0b",
                  "&:hover": {
                    borderColor: "#fbbf24",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                  },
                }}
              >
                تصحیح نتیجه
              </Button>

              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteResult(selectedRequest)}
                disabled={!!deletingResultId}
                sx={{
                  color: "#ef4444",
                  borderColor: "#ef4444",
                  "&:hover": {
                    borderColor: "#f87171",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                  },
                }}
              >
                حذف نتیجه
              </Button>

              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => handlePrintResult(selectedRequest)}
                sx={{
                  color: "#8b5cf6",
                  borderColor: "#8b5cf6",
                  "&:hover": {
                    borderColor: "#a78bfa",
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                  },
                }}
              >
                پرینت نتیجه
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ============ دیالوگ ثبت نتیجه ============ */}
      <Dialog
        open={openResultDialog}
        onClose={() => !uploading && setOpenResultDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1a2a3a",
            color: "white",
            borderRadius: "16px",
            border: "1px solid #374151",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid #374151", pb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
              <EditIcon sx={{ color: "#22c55e" }} />
              {editingResult ? "تصحیح نتیجه رادیولوژی" : "ثبت نتیجه رادیولوژی"}
            </Typography>
            <IconButton 
              onClick={() => !uploading && setOpenResultDialog(false)} 
              sx={{ color: "#9ca3af" }}
              disabled={uploading}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#9ca3af", mb: 1 }}>
                در حال آپلود فایل...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: "#374151",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "#22c55e",
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: "#6b7280", mt: 0.5 }}>
                {uploadProgress}%
              </Typography>
            </Box>
          )}
          
          {selectedRequest && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: "#0d1b2a", border: "1px solid #374151", p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                        نام بیمار:
                      </Typography>
                      <Typography sx={{ color: "white", fontWeight: "bold", mt: 0.5 }}>
                        {selectedRequest.patient_name || "نامشخص"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                        نوع رادیولوژی:
                      </Typography>
                      <Typography sx={{ color: "white", fontWeight: "bold", mt: 0.5 }}>
                        {selectedRequest.radiology_type_label || selectedRequest.radiology_type || selectedRequest.test_name || "نامشخص"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                        بخش مورد نظر:
                      </Typography>
                      <Typography sx={{ color: "white", fontWeight: "bold", mt: 0.5 }}>
                        {selectedRequest.body_part || "-"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="نتیجه رادیولوژی"
                  multiline
                  rows={3}
                  value={resultData.result}
                  onChange={(e) =>
                    setResultData({ ...resultData, result: e.target.value })
                  }
                  placeholder="نتیجه رادیولوژی را وارد کنید..."
                  disabled={uploading}
                  sx={{
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "#374151" },
                      "&:hover fieldset": { borderColor: "#60a5fa" },
                      "&.Mui-focused fieldset": { borderColor: "#60a5fa" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="محدوده نرمال"
                  value={resultData.normal_range}
                  onChange={(e) =>
                    setResultData({ ...resultData, normal_range: e.target.value })
                  }
                  placeholder="مثلاً: 10-20"
                  disabled={uploading}
                  sx={{
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "#374151" },
                      "&:hover fieldset": { borderColor: "#60a5fa" },
                      "&.Mui-focused fieldset": { borderColor: "#60a5fa" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                  }}
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
                  sx={{
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "#374151" },
                      "&:hover fieldset": { borderColor: "#60a5fa" },
                      "&.Mui-focused fieldset": { borderColor: "#60a5fa" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                  }}
                >
                  <MenuItem value="Draft" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    پیش‌نویس
                  </MenuItem>
                  <MenuItem value="Completed" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    تکمیل شده
                  </MenuItem>
                  <MenuItem value="Verified" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    تأیید شده
                  </MenuItem>
                  <MenuItem value="Cancelled" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    لغو شده
                  </MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="یافته‌ها"
                  multiline
                  rows={2}
                  value={resultData.findings}
                  onChange={(e) =>
                    setResultData({ ...resultData, findings: e.target.value })
                  }
                  placeholder="یافته‌های رادیولوژی را وارد کنید..."
                  disabled={uploading}
                  sx={{
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "#374151" },
                      "&:hover fieldset": { borderColor: "#60a5fa" },
                      "&.Mui-focused fieldset": { borderColor: "#60a5fa" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="تفسیر"
                  multiline
                  rows={2}
                  value={resultData.interpretation}
                  onChange={(e) =>
                    setResultData({ ...resultData, interpretation: e.target.value })
                  }
                  placeholder="تفسیر نتیجه رادیولوژی را وارد کنید..."
                  disabled={uploading}
                  sx={{
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "#374151" },
                      "&:hover fieldset": { borderColor: "#60a5fa" },
                      "&.Mui-focused fieldset": { borderColor: "#60a5fa" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: "#0d1b2a",
                    border: "2px dashed #374151",
                    borderRadius: "8px",
                    textAlign: "center",
                    "&:hover": {
                      borderColor: "#60a5fa",
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
                            bgcolor: "#1a2a3a",
                            borderRadius: "8px",
                            mb: 1,
                          }}
                        >
                          <ListItemIcon>
                            <PdfIcon sx={{ color: "#ef4444" }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={resultData.pdf_file_name || "فایل PDF"}
                            sx={{ color: "white" }}
                          />
                          <IconButton
                            onClick={handleRemoveFile}
                            disabled={uploading}
                            sx={{ color: "#ef4444" }}
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
                          color: "#60a5fa",
                          borderColor: "#60a5fa",
                          "&:hover": {
                            borderColor: "#93c5fd",
                            backgroundColor: "rgba(96, 165, 250, 0.1)",
                          },
                        }}
                      >
                        تغییر فایل
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <AttachFileIcon sx={{ fontSize: 48, color: "#6b7280", mb: 1 }} />
                      <Typography variant="body1" sx={{ color: "#9ca3af", mb: 1 }}>
                        برای آپلود فایل PDF کلیک کنید
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6b7280" }}>
                        فقط فایل‌های PDF پذیرفته می‌شوند (حداکثر 10 مگابایت)
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<UploadIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          sx={{
                            bgcolor: "#3b82f6",
                            "&:hover": { bgcolor: "#2563eb" },
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
                  sx={{
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "#374151" },
                      "&:hover fieldset": { borderColor: "#60a5fa" },
                      "&.Mui-focused fieldset": { borderColor: "#60a5fa" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #374151", p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenResultDialog(false)}
            disabled={uploading}
            sx={{ color: "#9ca3af" }}
          >
            لغو
          </Button>
          <Button
            onClick={handleSaveResult}
            variant="contained"
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            disabled={uploading}
            sx={{
              bgcolor: "#22c55e",
              "&:hover": { bgcolor: "#16a34a" },
              "&.Mui-disabled": {
                bgcolor: "#4b5563",
                color: "#9ca3af",
              },
            }}
          >
            {uploading ? "در حال ذخیره..." : editingResult ? "ذخیره تغییرات" : "ذخیره نتیجه"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}