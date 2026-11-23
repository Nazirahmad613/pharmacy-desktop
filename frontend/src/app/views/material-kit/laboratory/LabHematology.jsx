// src/app/pages/laboratory/LabHematology.jsx
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
  Bloodtype as BloodtypeIcon,
  Water as WaterIcon,
  Biotech as BiotechIcon,
  MonitorHeart as MonitorHeartIcon,
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
  CheckCircleOutline as CheckCircleOutlineIcon,
  ArrowBack as ArrowBackIcon,
  BugReport as BugReportIcon,
  Psychology as PsychologyIcon,
  LocalHospital as LocalHospitalIcon,
  Download as DownloadIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
} from "@mui/icons-material";

export default function LabHematology() {
  const navigate = useNavigate();
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredRequests, setFilteredRequests] = useState([]);
  // اگر یک بخش درخواست بدون نتیجه نداشته باشد، با کلیک روی کارت
  // درخواست‌های تکمیل‌شده همان بخش نمایش داده می‌شوند.
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // ============ State برای Toast/Snackbar ============
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
  });
  const [editingResult, setEditingResult] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState(null);

  // ============ دسته‌بندی تست‌ها با تم رنگی پاستلی مطابق تصویر ============
  const categories = [
    { id: "blood", title: "آزمایش خون (هماتولوژی)", icon: <BloodtypeIcon sx={{ fontSize: 24, color: "#e11d48" }} />, iconBg: "#ffe4e6", testType: "blood", keywords: ["خون", "blood", "هماتولوژی", "hematology"] },
    { id: "cbc", title: "شمارش کامل خون CBC", icon: <MonitorHeartIcon sx={{ fontSize: 24, color: "#2563eb" }} />, iconBg: "#dbeafe", testType: "cbc", keywords: ["cbc", "شمارش خون", "complete blood count"] },
    { id: "blood_sugar", title: "قند خون", icon: <MonitorHeartIcon sx={{ fontSize: 24, color: "#db2777" }} />, iconBg: "#fce7f3", testType: "blood_sugar", keywords: ["قند", "blood sugar", "گلوکز", "glucose", "FBS", "BS"] },
    { id: "blood_group", title: "گروپ خون", icon: <BloodtypeIcon sx={{ fontSize: 24, color: "#2563eb" }} />, iconBg: "#dbeafe", testType: "blood_group", keywords: ["گروپ خون", "blood group", "ABO", "Rh"] },
    { id: "biochemistry", title: "بیوشیمی خون", icon: <ScienceIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "biochemistry", keywords: ["بیوشیمی", "biochemistry"] },
    { id: "lipid_profile", title: "پروفایل چربی (Lipid Profile)", icon: <BiotechIcon sx={{ fontSize: 24, color: "#6d28d9" }} />, iconBg: "#ede9fe", testType: "lipid_profile", keywords: ["چربی", "lipid", "کلسترول", "cholesterol", "triglyceride"] },
    { id: "liver_function", title: "عملکرد کبد (LFT)", icon: <BiotechIcon sx={{ fontSize: 24, color: "#d97706" }} />, iconBg: "#fef3c7", testType: "liver_function", keywords: ["کبد", "liver", "LFT", "ALT", "AST", "ALP"] },
    { id: "kidney_function", title: "عملکرد کلیه (RFT)", icon: <BiotechIcon sx={{ fontSize: 24, color: "#059669" }} />, iconBg: "#d1fae5", testType: "kidney_function", keywords: ["کلیه", "kidney", "RFT", "BUN", "Creatinine"] },
    { id: "thyroid", title: "هورمون‌های تیروئید (T3/T4/TSH)", icon: <BiotechIcon sx={{ fontSize: 24, color: "#db2777" }} />, iconBg: "#fce7f3", testType: "thyroid", keywords: ["تیروئید", "thyroid", "T3", "T4", "TSH"] },
    { id: "hormonal", title: "هورمون‌ها", icon: <BiotechIcon sx={{ fontSize: 24, color: "#9333ea" }} />, iconBg: "#f3e8ff", testType: "hormonal", keywords: ["هورمون", "hormonal"] },
    { id: "reproductive_hormones", title: "هورمون‌های تولیدمثل", icon: <PsychologyIcon sx={{ fontSize: 24, color: "#db2777" }} />, iconBg: "#fce7f3", testType: "reproductive_hormones", keywords: ["تولیدمثل", "reproductive", "FSH", "LH", "استروژن", "تستوسترون"] },
    { id: "adrenal_hormones", title: "هورمون‌های آدرنال", icon: <PsychologyIcon sx={{ fontSize: 24, color: "#d97706" }} />, iconBg: "#fef3c7", testType: "adrenal_hormones", keywords: ["آدرنال", "adrenal", "کورتیزول", "cortisol"] },
    { id: "microbial", title: "آزمایش میکروبی", icon: <BugReportIcon sx={{ fontSize: 24, color: "#16a34a" }} />, iconBg: "#dcfce7", testType: "microbial", keywords: ["میکروبی", "microbial"] },
    { id: "bacterial_culture", title: "کشت باکتری", icon: <BugReportIcon sx={{ fontSize: 24, color: "#15803d" }} />, iconBg: "#dcfce7", testType: "bacterial_culture", keywords: ["کشت باکتری", "bacterial culture"] },
    { id: "fungal_culture", title: "کشت قارچ", icon: <BugReportIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "fungal_culture", keywords: ["کشت قارچ", "fungal culture"] },
    { id: "antibiotic_sensitivity", title: "آنتی‌بیوگرام", icon: <BugReportIcon sx={{ fontSize: 24, color: "#dc2626" }} />, iconBg: "#fee2e2", testType: "antibiotic_sensitivity", keywords: ["آنتی‌بیوگرام", "antibiotic", "حساسیت"] },
    { id: "serology", title: "سرولوژی", icon: <HealingIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "serology", keywords: ["سرولوژی", "serology"] },
    { id: "hepatitis_b", title: "تست هپاتیت B (HBsAg)", icon: <HealingIcon sx={{ fontSize: 24, color: "#ea580c" }} />, iconBg: "#ffedd5", testType: "hepatitis_b", keywords: ["هپاتیت b", "hepatitis b", "hbsag", "HBsAg", "HBV"] },
    { id: "hepatitis_c", title: "تست هپاتیت C (Anti-HCV)", icon: <HealingIcon sx={{ fontSize: 24, color: "#d97706" }} />, iconBg: "#fef3c7", testType: "hepatitis_c", keywords: ["هپاتیت c", "hepatitis c", "hcv", "HCV"] },
    { id: "hiv", title: "تست HIV / AIDS", icon: <HealingIcon sx={{ fontSize: 24, color: "#dc2626" }} />, iconBg: "#fee2e2", testType: "hiv", keywords: ["hiv", "ایدز", "aids", "HIV", "AIDS"] },
    { id: "syphilis", title: "تست سیفلیس (VDRL)", icon: <HealingIcon sx={{ fontSize: 24, color: "#db2777" }} />, iconBg: "#fce7f3", testType: "syphilis", keywords: ["سیفلیس", "syphilis", "VDRL"] },
    { id: "rubella", title: "تست روبلا", icon: <HealingIcon sx={{ fontSize: 24, color: "#e11d48" }} />, iconBg: "#ffe4e6", testType: "rubella", keywords: ["روبلا", "rubella"] },
    { id: "toxoplasmosis", title: "تست توکسوپلاسموز", icon: <HealingIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "toxoplasmosis", keywords: ["توکسوپلاسموز", "toxoplasmosis"] },
    { id: "urine", title: "آنالیز ادرار", icon: <WaterIcon sx={{ fontSize: 24, color: "#ca8a04" }} />, iconBg: "#fef9c3", testType: "urine", keywords: ["ادرار", "urine", "آنالیز ادرار"] },
    { id: "urine_culture", title: "کشت ادرار", icon: <WaterIcon sx={{ fontSize: 24, color: "#d97706" }} />, iconBg: "#fef3c7", testType: "urine_culture", keywords: ["کشت ادرار", "urine culture"] },
    { id: "stool", title: "آزمایش مدفوع", icon: <LocalHospitalIcon sx={{ fontSize: 24, color: "#92400e" }} />, iconBg: "#fef3c7", testType: "stool", keywords: ["مدفوع", "stool"] },
    { id: "stool_culture", title: "کشت مدفوع", icon: <LocalHospitalIcon sx={{ fontSize: 24, color: "#78350f" }} />, iconBg: "#ffedd5", testType: "stool_culture", keywords: ["کشت مدفوع", "stool culture"] },
    { id: "occult_blood", title: "خون مخفی مدفوع", icon: <LocalHospitalIcon sx={{ fontSize: 24, color: "#dc2626" }} />, iconBg: "#fee2e2", testType: "occult_blood", keywords: ["خون مخفی", "occult blood", "FOBT"] },
    { id: "pathology", title: "پاتولوژی", icon: <ScienceIcon sx={{ fontSize: 24, color: "#e11d48" }} />, iconBg: "#ffe4e6", testType: "pathology", keywords: ["پاتولوژی", "pathology"] },
    { id: "biopsy", title: "بیوپسی", icon: <ScienceIcon sx={{ fontSize: 24, color: "#dc2626" }} />, iconBg: "#fee2e2", testType: "biopsy", keywords: ["بیوپسی", "biopsy"] },
    { id: "cytology", title: "سیتولوژی", icon: <ScienceIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "cytology", keywords: ["سیتولوژی", "cytology"] },
    { id: "genetic", title: "آزمایش ژنتیک", icon: <BiotechIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "genetic", keywords: ["ژنتیک", "genetic"] },
    { id: "pcr", title: "PCR", icon: <BiotechIcon sx={{ fontSize: 24, color: "#2563eb" }} />, iconBg: "#dbeafe", testType: "pcr", keywords: ["PCR", "pcr"] },
    { id: "karyotyping", title: "کاریوتایپینگ", icon: <BiotechIcon sx={{ fontSize: 24, color: "#6d28d9" }} />, iconBg: "#ede9fe", testType: "karyotyping", keywords: ["کاریوتایپ", "karyotyping"] },
    { id: "malaria", title: "تست مالاریا", icon: <BugReportIcon sx={{ fontSize: 24, color: "#16a34a" }} />, iconBg: "#dcfce7", testType: "malaria", keywords: ["مالاریا", "malaria", "پلاسمودیوم"] },
    { id: "parasitology", title: "انگل‌شناسی", icon: <BugReportIcon sx={{ fontSize: 24, color: "#d97706" }} />, iconBg: "#fef3c7", testType: "parasitology", keywords: ["انگل", "parasitology", "parasite"] },
    { id: "kala_azar", title: "کالا آزار (لیشمانیوز احشایی)", icon: <BugReportIcon sx={{ fontSize: 24, color: "#dc2626" }} />, iconBg: "#fee2e2", testType: "kala_azar", keywords: ["کالا آزار", "kala azar", "لیشمانیوز"] },
    { id: "leishmaniasis", title: "لیشمانیوز", icon: <BugReportIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "leishmaniasis", keywords: ["لیشمانیوز", "leishmaniasis"] },
    { id: "imaging", title: "تصویربرداری", icon: <ScienceIcon sx={{ fontSize: 24, color: "#2563eb" }} />, iconBg: "#dbeafe", testType: "imaging", keywords: ["تصویربرداری", "imaging"] },
    { id: "ultrasound", title: "سونوگرافی", icon: <ScienceIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "ultrasound", keywords: ["سونوگرافی", "ultrasound"] },
    { id: "xray", title: "رادیوگرافی (X-Ray)", icon: <ScienceIcon sx={{ fontSize: 24, color: "#475569" }} />, iconBg: "#f1f5f9", testType: "xray", keywords: ["رادیوگرافی", "xray", "X-Ray"] },
    { id: "ct_scan", title: "سی‌تی اسکن (CT Scan)", icon: <ScienceIcon sx={{ fontSize: 24, color: "#2563eb" }} />, iconBg: "#dbeafe", testType: "ct_scan", keywords: ["سی‌تی اسکن", "ct scan", "CT"] },
    { id: "mri", title: "ام‌آرآی (MRI)", icon: <ScienceIcon sx={{ fontSize: 24, color: "#7c3aed" }} />, iconBg: "#ede9fe", testType: "mri", keywords: ["ام‌آرآی", "mri", "MRI"] },
    { id: "other", title: "سایر آزمایشات", icon: <ScienceIcon sx={{ fontSize: 24, color: "#475569" }} />, iconBg: "#f1f5f9", testType: "other", keywords: ["سایر", "other"] },
    { id: "general", title: "عمومی", icon: <ScienceIcon sx={{ fontSize: 24, color: "#64748b" }} />, iconBg: "#f1f5f9", testType: "general", keywords: ["عمومی", "general"] },
    { id: "results", title: "ثبت نتایج", icon: <ScienceIcon sx={{ fontSize: 24, color: "#0284c7" }} />, iconBg: "#e0f2fe", testType: "", keywords: [], isSpecial: true },
  ];

  // ============ دریافت نتیجه با جزئیات کامل از سرور ============
  const fetchResultDetails = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      console.log("🔍 دریافت نتیجه برای درخواست:", requestId);

      const response = await fetch(
        `http://localhost:8000/api/laboratory-results/request/${requestId}`,
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
        } else if (result.data?.all_requests && Array.isArray(result.data.all_requests)) {
          allRequests = result.data.all_requests;
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

        return {
          ...req,
          patient_name: patientName,
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

      if (category.testType && r.test_type === category.testType) {
        return true;
      }

      if (category.keywords.length > 0) {
        const testName = (r.test_name || "").toLowerCase();
        const testTypeName = (r.test_type || "").toLowerCase();

        return category.keywords.some(
          (keyword) =>
            testName.includes(keyword.toLowerCase()) ||
            testTypeName.includes(keyword.toLowerCase())
        );
      }

      return false;
    });
  };

  // وضعیت تکمیل فقط بر اساس status تعیین می‌شود.
  const isRequestCompleted = (request) =>
    String(request?.status || "").toLowerCase().trim() === "completed";

  // ============ انتخاب دسته ============
  const handleCategoryClick = (category) => {
    if (category.isSpecial) {
      navigate("/material/lab-results");
      return;
    }

    const categoryRequests = getCategoryRequests(category);
    const pendingRequests = categoryRequests.filter(
      (r) => !isRequestCompleted(r)
    );
    const completedRequests = categoryRequests.filter(isRequestCompleted);

    // اول درخواست‌های بدون نتیجه نمایش داده می‌شوند.
    // اگر هیچ درخواست بدون نتیجه نبود، نتایج تکمیل‌شده نمایش داده می‌شوند.
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
    setSelectedRequest(request);
    setOpenDetailDialog(true);

    if (request.status === "completed") {
      const resultData = await fetchResultDetails(request.id);
      if (resultData) {
        console.log("✅ نتیجه دریافت شد:", resultData);
        console.log("✅ normal_range دریافت شده:", resultData.normal_range);

        setSelectedRequest((prev) => ({
          ...prev,
          result_details: resultData,
          result_value: resultData.result || "",
          normal_range: resultData.normal_range || "",
          result_remarks: resultData.remarks || "",
          result_date: resultData.analysis_completed_at || resultData.created_at,
          pdf_url: resultData.pdf_url,
          pdf_file_name: resultData.pdf_file_name,
          report_no: resultData.report_no,
          doctor_name: resultData.doctor?.name || prev.doctor_name,
          patient_gender: resultData.patient?.gender_label || prev.patient_gender,
          patient_full_name: resultData.patient?.full_name || prev.patient_name,
          patient_age: resultData.patient?.age || prev.patient_age,
          patient_phone: resultData.patient?.mobile || prev.patient_phone,
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
        result: request.result_value || request.result || request.laboratory_result?.result || "",
        status: request.result_details?.status || request.laboratory_result?.result_status || "Completed",
        notes: request.result_remarks || request.laboratory_result?.remarks || "",
        normal_range: request.normal_range || request.laboratory_result?.normal_range || "",
        pdf_file: null,
        pdf_file_name: request.pdf_file_name || request.laboratory_result?.pdf_file_name || "",
        pdf_url: request.pdf_url || request.laboratory_result?.pdf_url || "",
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
      request.laboratory_result?.id ||
      request.result_id;

    if (!resultId) {
      showToast("شناسه نتیجه برای حذف پیدا نشد", "error");
      return;
    }

    const confirmed = window.confirm(
      "آیا مطمئن هستید که می‌خواهید نتیجه ثبت‌شده این آزمایش را حذف کنید؟"
    );

    if (!confirmed) return;

    try {
      setDeletingResultId(resultId);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:8000/api/laboratory-results/${resultId}`,
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
        // پاسخ غیر JSON را نادیده می‌گیریم و از status استفاده می‌کنیم.
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
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`خطا در دانلود: ${response.status}`);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfUrl.split("/").pop() || "result.pdf";
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

  // ============ پرینت نتیجه با دریافت اطلاعات کامل از سرور ============
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
      const testName = test.test_name || request.test_name || request.test_type || "نامشخص";
      const resultValue = resultData.result || request.result_value || "نتیجه ثبت نشده";
      const normalRange = resultData.normal_range || request.normal_range || "-";
      const resultNotes = resultData.remarks || request.result_remarks || "";
      const resultDate = resultData.analysis_completed_at || resultData.created_at || request.result_date || request.created_at || new Date().toISOString();
      const pdfUrl = resultData.pdf_url || request.pdf_url || "";
      const pdfFileName = resultData.pdf_file_name || request.pdf_file_name || "";
      const doctorName = doctor.name || request.doctor_name || "نامشخص";
      const regId = registration.reg_id || request.registration_id || request.reg_id || "-";
      const reportNo = resultData.report_no || request.report_no || "";

      const hasResult = !!(resultData.result || request.result_value);
      const statusLabel = hasResult ? "ثبت شده" : "تکمیل شده";
      const statusColor = hasResult ? "#10b981" : "#3b82f6";

      const now = new Date();
      const printDate = now.toLocaleDateString("fa-IR");
      const printTime = now.toLocaleTimeString("fa-IR");

      const printHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>نتیجه آزمایش - ${patientName}</title>
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
              <h1>🏥 نتیجه لابراتوار</h1>
              <div class="subtitle">نتیجه لابراتواری</div>
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
                <span class="value">${patientPhone || "-"}</span>
              </div>
              <div class="item">
                <span class="label">🎂 سن</span>
                <span class="value">${patientAge || "-"}</span>
              </div>
              <div class="item">
                <span class="label">⚧ جنسیت</span>
                <span class="value">${patientGender || "-"}</span>
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
                <span>🔬 ${testName}</span>
                <span class="report-no">شماره گزارش: ${reportNo || "-"}</span>
              </div>
              <div class="body">
                <div class="result-row">
                  <span class="label">نوع تست</span>
                  <span class="value">${testName}</span>
                </div>
                <div class="result-row">
                  <span class="label">نتیجه</span>
                  <span class="value normal">${resultValue}</span>
                </div>
                <div class="result-row">
                  <span class="label">محدوده نرمال</span>
                  <span class="value">${normalRange}</span>
                </div>
                <div class="result-row">
                  <span class="label">وضعیت</span>
                  <span class="value"><span class="status-badge">${statusLabel}</span></span>
                </div>
                ${resultNotes ? `
                <div class="result-row">
                  <span class="label">یادداشت</span>
                  <span class="value">${resultNotes}</span>
                </div>
                ` : ""}
                <div class="result-row">
                  <span class="label">تاریخ نتیجه</span>
                  <span class="value">${new Date(resultDate).toLocaleDateString("fa-IR")}</span>
                </div>
                ${pdfUrl ? `
                <div class="result-row">
                  <span class="label">فایل ضمیمه</span>
                  <span class="value">📎 ${pdfFileName || "PDF"}</span>
                </div>
                ` : ""}
              </div>
            </div>

            <div class="signature">
              <div class="field">
                <span class="label">امضاء داکتر</span>
                <div class="line"></div>
              </div>
              <div class="field">
                <span class="label">امضاء مسئول لابراتوار</span>
                <div class="line"></div>
              </div>
              <div class="field">
                <span class="label">تاریخ</span>
                <div class="line"></div>
              </div>
            </div>

            <div class="footer">
              <span>🔬 ${testName}</span>
              <span>کد: ${regId}</span>
              <span>${printDate}</span>
            </div>
            
            <div class="print-footer">
              این نتیجه توسط سیستم مدیریت درمانگاه تهیه شده است
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
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
      showToast("لطفاً نتیجه آزمایش را وارد کنید", "error");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const formData = new FormData();

      const resultId =
        selectedRequest?.result_details?.id ||
        selectedRequest?.laboratory_result?.id ||
        selectedRequest?.result_id;

      formData.append("laboratory_request_id", selectedRequest.id);
      formData.append(
        "registration_id",
        selectedRequest.reg_id || selectedRequest.registration_id || ""
      );
      formData.append("patient_id", selectedRequest.patient_id || "");
      formData.append("result_status", resultData.status);
      formData.append("result", resultData.result.trim());
      formData.append("normal_range", resultData.normal_range || "");
      formData.append("remarks", resultData.notes || "");

      if (resultData.pdf_file) {
        formData.append("pdf_file", resultData.pdf_file);
      }

      const isEdit = editingResult && !!resultId;
      const url = isEdit
        ? `http://localhost:8000/api/laboratory-results/${resultId}`
        : "http://localhost:8000/api/laboratory-results";

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
            if (selectedCategory.testType && r.test_type === selectedCategory.testType) {
              return true;
            }
            if (selectedCategory.keywords.length > 0) {
              const testName = (r.test_name || "").toLowerCase();
              const testTypeName = (r.test_type || "").toLowerCase();
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
      "#ef4444", "#f59e0b", "#10b981", "#2563eb",
      "#7c3aed", "#db2777", "#0d9488", "#ea580c",
    ];
    if (!name || name === "نامشخص") return colors[0];
    const index = name.length % colors.length;
    return colors[index];
  };

  // ============ دریافت جنسیت به فارسی/دری ============
  const getGenderLabel = (gender) => {
    const genders = {
      male: "مرد",
      female: "زن",
      other: "سایر",
    };
    return genders[gender] || gender || "نامشخص";
  };

  // ============ استایل مشترک فیلدهای متنی در پس‌زمینه سفید ============
  const lightTextFieldSx = {
    "& .MuiInputLabel-root": { color: "#475569", fontWeight: 600 },
    "& .MuiOutlinedInput-root": {
      color: "#0f172a",
      bgcolor: "#ffffff",
      borderRadius: 2.5,
      "& fieldset": { borderColor: "#e2e8f0" },
      "&:hover fieldset": { borderColor: "#3b82f6" },
      "&.Mui-focused fieldset": { borderColor: "#2563eb", borderWidth: "2px" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#2563eb" },
  };

  // ============ محاسبات آماری هدر ============
  const visibleRequests = selectedCategory ? filteredRequests : allRequests;
  const totalRequestsCount = visibleRequests.length;
  const requestsWithResultCount = visibleRequests.filter(isRequestCompleted).length;
  const requestsWithoutResultCount = visibleRequests.filter(
    (r) => !isRequestCompleted(r)
  ).length;

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
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        width: "100%",
        minHeight: "100%",
        boxSizing: "border-box",
        p: { xs: 2, sm: 3, md: 4 },
        overflowX: "hidden",
        bgcolor: "#f8fafc",
        color: "#0f172a",
        "& .MuiPaper-root": {
          backgroundImage: "none",
        },
        "& .MuiTableContainer-root": {
          maxWidth: "100%",
          overflowX: "auto",
          borderRadius: "16px",
        },
        "& .MuiTableCell-root": {
          whiteSpace: "nowrap",
        },
        "& .MuiDialog-paper": {
          width: { xs: "calc(100% - 20px)", sm: "100%" },
          maxWidth: "900px",
          margin: { xs: 1, sm: 2 },
          borderRadius: "20px",
        },
        "& .MuiButton-root": {
          borderRadius: "10px",
          fontWeight: 700,
          textTransform: "none",
        },
        "& .MuiChip-root": {
          fontWeight: 700,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "& *": { transition: "none !important", animation: "none !important" },
        },
      }}
    >
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
            fontSize: "15px",
            fontWeight: "bold",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ============ هدر صفحه مطابق تصویر ============ */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {selectedCategory && (
            <IconButton
              onClick={handleBackToCategories}
              sx={{
                color: "#0284c7",
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                lineHeight: 1.3,
              }}
            >
              {selectedCategory ? selectedCategory.title : "لابراتوار طبی"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                fontSize: "0.875rem",
                mt: 0.25,
              }}
            >
              {selectedCategory
                ? showCompletedOnly
                  ? "لیست درخواست‌های تکمیل‌شده این بخش"
                  : "لیست درخواست‌های در انتظار انجام نتیجه"
                : "سیستم مدیریت آزمایشات طبی"}
            </Typography>
          </Box>
        </Box>

        {/* آیکون سمت چپ مطابق تصویر */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: "#e0f2fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ScienceIcon sx={{ fontSize: 24, color: "#0284c7" }} />
        </Box>
      </Box>

      {/* ============ سه کارت آماری افقی مطابق تصویر ============ */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
              textAlign: "center",
            }}
          >
            <AssignmentOutlinedIcon sx={{ fontSize: 22, color: "#0284c7", mb: 0.75 }} />
            <Typography
              sx={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              {totalRequestsCount}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#64748b",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              کل درخواست‌ها
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
              textAlign: "center",
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 22, color: "#d97706", mb: 0.75 }} />
            <Typography
              sx={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              {requestsWithoutResultCount}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#64748b",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              در انتظار
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
              textAlign: "center",
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 22, color: "#16a34a", mb: 0.75 }} />
            <Typography
              sx={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              {requestsWithResultCount}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#64748b",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              تکمیل‌شده
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "12px" }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: "12px" }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* ============ بخش دسته‌بندی آزمایشات یا جدول درخواست‌ها ============ */}
      {!selectedCategory ? (
        <>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "#0f172a",
              fontSize: "1.1rem",
              mb: 2,
            }}
          >
            دسته‌بندی آزمایشات
          </Typography>

          <Grid container spacing={2}>
            {categories.map((category) => {
              const categoryRequests = getCategoryRequests(category);
              const pendingCount = categoryRequests.filter(
                (r) => !isRequestCompleted(r)
              ).length;
              const completedCount = categoryRequests.filter(
                isRequestCompleted
              ).length;

              const hasRequests = categoryRequests.length > 0;
              const hasPendingRequests = pendingCount > 0;
              const isInteractive = hasRequests || category.isSpecial;

              return (
                <Grid item xs={12} md={6} key={category.id}>
                  <Card
                    elevation={0}
                    sx={{
                      bgcolor: "#ffffff",
                      borderRadius: "16px",
                      border: hasPendingRequests
                        ? "1px solid #bfdbfe"
                        : "1px solid #f1f5f9",
                      boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
                      transition: "all 0.2s ease",
                      cursor: isInteractive ? "pointer" : "not-allowed",
                      opacity: isInteractive ? 1 : 0.62,
                      "&:hover": {
                        transform: isInteractive ? "translateY(-2px)" : "none",
                        borderColor: isInteractive ? "#93c5fd" : "#f1f5f9",
                        boxShadow: isInteractive
                          ? "0 8px 20px rgba(15, 23, 42, 0.06)"
                          : "0 2px 10px rgba(15, 23, 42, 0.03)",
                      },
                    }}
                    onClick={() => {
                      if (isInteractive) {
                        handleCategoryClick(category);
                      }
                    }}
                  >
                    <CardContent
                      sx={{
                        p: "16px 20px !important",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      {/* سمت راست: باکس آیکون + عنوان و زیرعنوان */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            bgcolor: category.iconBg || "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {category.icon}
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              lineHeight: 1.4,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {category.title}
                          </Typography>

                          <Typography
                            sx={{
                              color: category.isSpecial
                                ? "#0284c7"
                                : hasPendingRequests
                                ? "#d97706"
                                : hasRequests
                                ? "#16a34a"
                                : "#64748b",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              mt: 0.35,
                            }}
                          >
                            {category.isSpecial
                              ? "مشاهده و ثبت نتایج"
                              : hasPendingRequests
                              ? `${pendingCount} در انتظار • ${completedCount} تکمیل‌شده`
                              : hasRequests
                              ? `مشاهده درخواست‌ها (${completedCount} تکمیل‌شده)`
                              : "مشاهده درخواست‌ها"}
                          </Typography>
                        </Box>
                      </Box>

                      {/* سمت چپ: نشانگر تعداد درخواست‌های در انتظار یا وضعیت */}
                      {!category.isSpecial && hasPendingRequests && (
                        <Chip
                          label={pendingCount}
                          size="small"
                          sx={{
                            bgcolor: "#fee2e2",
                            color: "#dc2626",
                            fontWeight: 800,
                            fontSize: "0.8rem",
                            height: 26,
                            minWidth: 28,
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      ) : filteredRequests.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: "center",
            bgcolor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
          }}
        >
          <ScienceIcon sx={{ fontSize: 56, color: "#94a3b8", mb: 1.5 }} />
          <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 700 }}>
            هیچ درخواستی برای {selectedCategory.title} یافت نشد
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75 }}>
            درخواست‌های جدید پس از پرداخت فیس در اینجا نمایش داده می‌شوند
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            bgcolor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            overflowX: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                  #
                </TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                  اطلاعات بیمار
                </TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                  نوع تست
                </TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                  تاریخ درخواست
                </TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                  وضعیت
                </TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                  PDF
                </TableCell>
                <TableCell
                  sx={{ color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}
                  align="center"
                >
                  عملیات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((req, index) => {
                const patientName = req.patient_name || "نامشخص";
                const patientPhone = req.patient_phone || "";
                const isCompleted = req.status === "completed";
                const hasResult = !!(req.laboratory_result?.result || req.result);

                return (
                  <TableRow
                    key={req.id}
                    sx={{
                      bgcolor: "#ffffff",
                      "&:hover": { bgcolor: "#f8fafc" },
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <TableCell sx={{ color: "#64748b", fontWeight: 600 }}>{index + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
                        <Avatar
                          sx={{
                            bgcolor: getAvatarColor(patientName),
                            width: 42,
                            height: 42,
                            fontSize: 16,
                            fontWeight: "bold",
                            color: "#ffffff",
                          }}
                        >
                          {getInitials(patientName)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: "14.5px" }}>
                            {patientName}
                          </Typography>
                          {patientPhone && (
                            <Typography sx={{ color: "#64748b", fontSize: "12px", mt: 0.25 }}>
                              <PhoneIcon sx={{ fontSize: 12, verticalAlign: "middle", ml: 0.5 }} />
                              {patientPhone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.test_name || req.test_type || "نامشخص"}
                        size="small"
                        sx={{
                          bgcolor: isCompleted ? "#dcfce7" : "#e0f2fe",
                          color: isCompleted ? "#166534" : "#0369a1",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "#475569", fontWeight: 500 }}>
                      {new Date(req.created_at).toLocaleDateString("fa-IR")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isCompleted && hasResult ? "✅ ثبت شده" : isCompleted ? "✅ تکمیل شده" : "⏳ در انتظار"}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: isCompleted && hasResult ? "#dcfce7" : isCompleted ? "#dbeafe" : "#fef3c7",
                          color: isCompleted && hasResult ? "#166534" : isCompleted ? "#1e40af" : "#92400e",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {req.pdf_url ? (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="دانلود PDF">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadPdf(req.pdf_url)}
                              sx={{
                                color: "#16a34a",
                                bgcolor: "#dcfce7",
                                "&:hover": { bgcolor: "#bbf7d0" },
                              }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
                          ندارد
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
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
                              "&:hover": {
                                borderColor: "#0284c7",
                                backgroundColor: "#e0f2fe",
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
                                bgcolor: "#16a34a",
                                color: "#ffffff",
                                boxShadow: "none",
                                "&:hover": { bgcolor: "#15803d", boxShadow: "none" },
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
                                  color: "#d97706",
                                  borderColor: "#fde68a",
                                  bgcolor: "#fffbeb",
                                  "&:hover": {
                                    borderColor: "#d97706",
                                    backgroundColor: "#fef3c7",
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
                                disabled={
                                  !hasResult ||
                                  deletingResultId ===
                                    (req.result_details?.id || req.laboratory_result?.id || req.result_id)
                                }
                                sx={{
                                  color: "#dc2626",
                                  borderColor: "#fecaca",
                                  bgcolor: "#fef2f2",
                                  "&:hover": {
                                    borderColor: "#dc2626",
                                    backgroundColor: "#fee2e2",
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
                                  color: "#7c3aed",
                                  borderColor: "#ddd6fe",
                                  bgcolor: "#f5f3ff",
                                  "&:hover": {
                                    borderColor: "#7c3aed",
                                    backgroundColor: "#ede9fe",
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
                                bgcolor: hasResult ? "#dcfce7" : "#dbeafe",
                                color: hasResult ? "#166534" : "#1e40af",
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
      )}

      {/* ============ دیالوگ جزئیات با نمایش کامل نتیجه ============ */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#ffffff",
            color: "#0f172a",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid #f1f5f9", bgcolor: "#ffffff", pb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonIcon sx={{ color: "#0284c7" }} />
              جزئیات درخواست
            </Typography>
            <IconButton
              onClick={() => setOpenDetailDialog(false)}
              sx={{ color: "#64748b", "&:hover": { bgcolor: "#f1f5f9" } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedRequest && (
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Card
                  elevation={0}
                  sx={{ bgcolor: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "16px" }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#475569", fontWeight: 700, mb: 1 }}>
                      <PersonIcon sx={{ fontSize: 16, verticalAlign: "middle", ml: 0.5, color: "#0284c7" }} />
                      اطلاعات بیمار
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#e2e8f0" }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: getAvatarColor(
                            selectedRequest.patient_full_name || selectedRequest.patient_name || "User"
                          ),
                          width: 58,
                          height: 58,
                          fontSize: 22,
                          fontWeight: "bold",
                          color: "#ffffff",
                        }}
                      >
                        {getInitials(
                          selectedRequest.patient_full_name || selectedRequest.patient_name || "کاربر"
                        )}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "17px" }}>
                          {selectedRequest.patient_full_name || selectedRequest.patient_name || "نامشخص"}
                        </Typography>
                        {selectedRequest.patient_phone && (
                          <Typography sx={{ color: "#475569", fontSize: "13.5px", mt: 0.25 }}>
                            <PhoneIcon sx={{ fontSize: 14, verticalAlign: "middle", ml: 0.5 }} />
                            {selectedRequest.patient_phone}
                          </Typography>
                        )}
                        {selectedRequest.patient_age && (
                          <Typography sx={{ color: "#475569", fontSize: "13.5px", mt: 0.25 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, verticalAlign: "middle", ml: 0.5 }} />
                            سن: {selectedRequest.patient_age} سال
                          </Typography>
                        )}
                        {selectedRequest.patient_gender && (
                          <Typography sx={{ color: "#475569", fontSize: "13.5px", mt: 0.25 }}>
                            <BadgeIcon sx={{ fontSize: 14, verticalAlign: "middle", ml: 0.5 }} />
                            جنسیت: {getGenderLabel(selectedRequest.patient_gender)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card
                  elevation={0}
                  sx={{ bgcolor: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "16px" }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#475569", fontWeight: 700, mb: 1 }}>
                      <ScienceIcon sx={{ fontSize: 16, verticalAlign: "middle", ml: 0.5, color: "#7c3aed" }} />
                      اطلاعات آزمایش
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#e2e8f0" }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography sx={{ color: "#64748b", fontWeight: 600 }}>نوع تست:</Typography>
                        <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>
                          {selectedRequest.test_name || selectedRequest.test_type || "نامشخص"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography sx={{ color: "#64748b", fontWeight: 600 }}>وضعیت:</Typography>
                        <Chip
                          label={selectedRequest.status === "completed" ? "تکمیل شده" : "در انتظار"}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: selectedRequest.status === "completed" ? "#dcfce7" : "#fef3c7",
                            color: selectedRequest.status === "completed" ? "#166534" : "#92400e",
                          }}
                        />
                      </Box>
                      {selectedRequest.status === "completed" && (
                        <>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ color: "#64748b", fontWeight: 600 }}>شماره گزارش:</Typography>
                            <Typography sx={{ color: "#b45309", fontWeight: 700 }}>
                              {selectedRequest.report_no || "-"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ color: "#64748b", fontWeight: 600 }}>نتیجه:</Typography>
                            <Typography sx={{ color: "#16a34a", fontWeight: 800 }}>
                              {selectedRequest.result_value ||
                                selectedRequest.result ||
                                selectedRequest.laboratory_result?.result ||
                                "ثبت شده"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ color: "#64748b", fontWeight: 600 }}>محدوده نرمال:</Typography>
                            <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>
                              {selectedRequest.normal_range || "-"}
                            </Typography>
                          </Box>
                          {selectedRequest.result_remarks && (
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Typography sx={{ color: "#64748b", fontWeight: 600 }}>یادداشت:</Typography>
                              <Typography sx={{ color: "#1e293b" }}>
                                {selectedRequest.result_remarks}
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ color: "#64748b", fontWeight: 600 }}>تاریخ نتیجه:</Typography>
                            <Typography sx={{ color: "#1e293b", fontWeight: 600 }}>
                              {selectedRequest.result_date
                                ? new Date(selectedRequest.result_date).toLocaleDateString("fa-IR")
                                : "-"}
                            </Typography>
                          </Box>
                          {selectedRequest.pdf_url && (
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Typography sx={{ color: "#64748b", fontWeight: 600 }}>فایل PDF:</Typography>
                              <Stack direction="row" spacing={1}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => handleDownloadPdf(selectedRequest.pdf_url)}
                                  sx={{
                                    color: "#16a34a",
                                    borderColor: "#bbf7d0",
                                    bgcolor: "#f0fdf4",
                                    "&:hover": {
                                      borderColor: "#16a34a",
                                      backgroundColor: "#dcfce7",
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
        <DialogActions sx={{ borderTop: "1px solid #f1f5f9", bgcolor: "#ffffff", p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenDetailDialog(false)}
            sx={{ color: "#475569", "&:hover": { bgcolor: "#f1f5f9" } }}
          >
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
                bgcolor: "#16a34a",
                color: "#ffffff",
                boxShadow: "none",
                "&:hover": { bgcolor: "#15803d", boxShadow: "none" },
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
                  color: "#d97706",
                  borderColor: "#fde68a",
                  bgcolor: "#fffbeb",
                  "&:hover": {
                    borderColor: "#d97706",
                    backgroundColor: "#fef3c7",
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
                  color: "#dc2626",
                  borderColor: "#fecaca",
                  bgcolor: "#fef2f2",
                  "&:hover": {
                    borderColor: "#dc2626",
                    backgroundColor: "#fee2e2",
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
                  color: "#7c3aed",
                  borderColor: "#ddd6fe",
                  bgcolor: "#f5f3ff",
                  "&:hover": {
                    borderColor: "#7c3aed",
                    backgroundColor: "#ede9fe",
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
            bgcolor: "#ffffff",
            color: "#0f172a",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid #f1f5f9", bgcolor: "#ffffff", pb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 1 }}
            >
              <EditIcon sx={{ color: "#16a34a" }} />
              {editingResult ? "تصحیح نتیجه آزمایش" : "ثبت نتیجه آزمایش"}
            </Typography>
            <IconButton
              onClick={() => !uploading && setOpenResultDialog(false)}
              sx={{ color: "#64748b", "&:hover": { bgcolor: "#f1f5f9" } }}
              disabled={uploading}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#475569", mb: 1, fontWeight: 600 }}>
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
                  sx={{ bgcolor: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "16px", p: 2 }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                        نام بیمار:
                      </Typography>
                      <Typography sx={{ color: "#0f172a", fontWeight: 800, mt: 0.5 }}>
                        {selectedRequest.patient_name || "نامشخص"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                        نوع تست:
                      </Typography>
                      <Typography sx={{ color: "#0f172a", fontWeight: 800, mt: 0.5 }}>
                        {selectedRequest.test_name || selectedRequest.test_type || "نامشخص"}
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
                  onChange={(e) => setResultData({ ...resultData, result: e.target.value })}
                  placeholder="مقدار نتیجه آزمایش را وارد کنید..."
                  disabled={uploading}
                  sx={lightTextFieldSx}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="محدوده نرمال"
                  value={resultData.normal_range}
                  onChange={(e) => setResultData({ ...resultData, normal_range: e.target.value })}
                  placeholder="مثلاً: 10-20"
                  disabled={uploading}
                  sx={lightTextFieldSx}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="وضعیت"
                  value={resultData.status}
                  onChange={(e) => setResultData({ ...resultData, status: e.target.value })}
                  disabled={uploading}
                  sx={lightTextFieldSx}
                >
                  <MenuItem value="Draft">پیش‌نویس</MenuItem>
                  <MenuItem value="Completed">تکمیل شده</MenuItem>
                  <MenuItem value="Verified">تأیید شده</MenuItem>
                  <MenuItem value="Cancelled">لغو شده</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "16px",
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
                            borderRadius: "12px",
                            mb: 1,
                          }}
                        >
                          <ListItemIcon>
                            <PdfIcon sx={{ color: "#e11d48" }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={resultData.pdf_file_name || "فایل PDF"}
                            sx={{ color: "#0f172a", "& .MuiTypography-root": { fontWeight: 700 } }}
                          />
                          <IconButton
                            onClick={handleRemoveFile}
                            disabled={uploading}
                            sx={{ color: "#dc2626", "&:hover": { bgcolor: "#fef2f2" } }}
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
                          borderColor: "#bae6fd",
                          bgcolor: "#ffffff",
                          "&:hover": {
                            borderColor: "#0284c7",
                            backgroundColor: "#f0f9ff",
                          },
                        }}
                      >
                        تغییر فایل
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <AttachFileIcon sx={{ fontSize: 42, color: "#64748b", mb: 1 }} />
                      <Typography variant="body1" sx={{ color: "#0f172a", fontWeight: 700, mb: 0.5 }}>
                        برای آپلود فایل PDF کلیک کنید
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                        فقط فایل‌های PDF پذیرفته می‌شوند (حداکثر 10 مگابایت)
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<UploadIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          sx={{
                            bgcolor: "#0284c7",
                            color: "#ffffff",
                            boxShadow: "none",
                            "&:hover": { bgcolor: "#0369a1", boxShadow: "none" },
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
                  onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                  placeholder="یادداشت اضافی..."
                  disabled={uploading}
                  sx={lightTextFieldSx}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #f1f5f9", bgcolor: "#ffffff", p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenResultDialog(false)}
            disabled={uploading}
            sx={{ color: "#475569", "&:hover": { bgcolor: "#f1f5f9" } }}
          >
            لغو
          </Button>
          <Button
            onClick={handleSaveResult}
            variant="contained"
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            disabled={uploading}
            sx={{
              bgcolor: "#16a34a",
              color: "#ffffff",
              boxShadow: "none",
              "&:hover": { bgcolor: "#15803d", boxShadow: "none" },
              "&.Mui-disabled": {
                bgcolor: "#cbd5e1",
                color: "#64748b",
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