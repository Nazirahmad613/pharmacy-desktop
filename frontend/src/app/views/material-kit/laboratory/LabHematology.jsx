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
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  BugReport as BugReportIcon,
  Psychology as PsychologyIcon,
  Image as ImageIcon,
  LocalHospital as LocalHospitalIcon,
  Coronavirus as CoronavirusIcon,
} from "@mui/icons-material";

export default function LabHematology() {
  const navigate = useNavigate();
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  const [resultData, setResultData] = useState({
    result: "",
    status: "completed",
    notes: "",
    normal_range: "",
    pdf_file: null,
    pdf_file_name: "",
    pdf_url: "",
  });

  // ============ دسته‌بندی تست‌ها (مطابق با LaboratoryRequest.jsx) ============
  const categories = [
    // 🩸 آزمایش خون
    {
      id: "blood",
      title: "🩸 آزمایش خون (هماتولوژی)",
      icon: <BloodtypeIcon sx={{ fontSize: 40, color: "#ef4444" }} />,
      testType: "blood",
      keywords: ["خون", "blood", "هماتولوژی", "hematology", "cbc", "CBC"],
    },
    {
      id: "cbc",
      title: "🩸 شمارش کامل خون (CBC)",
      icon: <BloodtypeIcon sx={{ fontSize: 40, color: "#dc2626" }} />,
      testType: "cbc",
      keywords: ["cbc", "شمارش خون", "complete blood count"],
    },
    {
      id: "blood_sugar",
      title: "🩸 قند خون (FBS / BS)",
      icon: <MonitorHeartIcon sx={{ fontSize: 40, color: "#ec4899" }} />,
      testType: "blood_sugar",
      keywords: ["قند", "blood sugar", "گلوکز", "glucose", "FBS", "BS"],
    },
    {
      id: "blood_group",
      title: "🩸 گروپ خون",
      icon: <BloodtypeIcon sx={{ fontSize: 40, color: "#3b82f6" }} />,
      testType: "blood_group",
      keywords: ["گروپ خون", "blood group", "ABO", "Rh"],
    },

    // 🧪 بیوشیمی
    {
      id: "biochemistry",
      title: "🧪 بیوشیمی خون",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "biochemistry",
      keywords: ["بیوشیمی", "biochemistry", "شیمیایی"],
    },
    {
      id: "lipid_profile",
      title: "🧪 پروفایل چربی (Lipid Profile)",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#7c3aed" }} />,
      testType: "lipid_profile",
      keywords: ["چربی", "lipid", "کلسترول", "cholesterol", "triglyceride"],
    },
    {
      id: "liver_function",
      title: "🧪 عملکرد کبد (LFT)",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#f59e0b" }} />,
      testType: "liver_function",
      keywords: ["کبد", "liver", "LFT", "ALT", "AST", "ALP"],
    },
    {
      id: "kidney_function",
      title: "🧪 عملکرد کلیه (RFT)",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#10b981" }} />,
      testType: "kidney_function",
      keywords: ["کلیه", "kidney", "RFT", "BUN", "Creatinine"],
    },
    {
      id: "thyroid",
      title: "🧪 هورمون‌های تیروئید (T3/T4/TSH)",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#f472b6" }} />,
      testType: "thyroid",
      keywords: ["تیروئید", "thyroid", "T3", "T4", "TSH"],
    },

    // 🧬 هورمونی
    {
      id: "hormonal",
      title: "🧬 هورمون‌ها",
      icon: <PsychologyIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "hormonal",
      keywords: ["هورمون", "hormonal", "هورمونی"],
    },
    {
      id: "reproductive_hormones",
      title: "🧬 هورمون‌های تولیدمثل",
      icon: <PsychologyIcon sx={{ fontSize: 40, color: "#ec4899" }} />,
      testType: "reproductive_hormones",
      keywords: ["تولیدمثل", "reproductive", "FSH", "LH", "استروژن", "تستوسترون"],
    },
    {
      id: "adrenal_hormones",
      title: "🧬 هورمون‌های آدرنال",
      icon: <PsychologyIcon sx={{ fontSize: 40, color: "#f59e0b" }} />,
      testType: "adrenal_hormones",
      keywords: ["آدرنال", "adrenal", "کورتیزول", "cortisol"],
    },

    // 🦠 میکروبی
    {
      id: "microbial",
      title: "🦠 آزمایش میکروبی",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#22c55e" }} />,
      testType: "microbial",
      keywords: ["میکروبی", "microbial", "باکتری"],
    },
    {
      id: "bacterial_culture",
      title: "🦠 کشت باکتری",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#16a34a" }} />,
      testType: "bacterial_culture",
      keywords: ["کشت باکتری", "bacterial culture", "باکتری"],
    },
    {
      id: "fungal_culture",
      title: "🦠 کشت قارچ",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "fungal_culture",
      keywords: ["کشت قارچ", "fungal culture", "قارچ"],
    },
    {
      id: "antibiotic_sensitivity",
      title: "🦠 آنتی‌بیوگرام",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#dc2626" }} />,
      testType: "antibiotic_sensitivity",
      keywords: ["آنتی‌بیوگرام", "antibiotic", "حساسیت"],
    },

    // 🧫 سرولوژی
    {
      id: "serology",
      title: "🧫 سرولوژی",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "serology",
      keywords: ["سرولوژی", "serology"],
    },
    {
      id: "hepatitis_b",
      title: "🧪 تست هپاتیت B (HBsAg)",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#f97316" }} />,
      testType: "hepatitis_b",
      keywords: ["هپاتیت b", "hepatitis b", "hbsag", "HBsAg", "HBV"],
    },
    {
      id: "hepatitis_c",
      title: "🧪 تست هپاتیت C (Anti-HCV)",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#f59e0b" }} />,
      testType: "hepatitis_c",
      keywords: ["هپاتیت c", "hepatitis c", "hcv", "HCV"],
    },
    {
      id: "hiv",
      title: "🧫 تست HIV / AIDS",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#ef4444" }} />,
      testType: "hiv",
      keywords: ["hiv", "ایدز", "aids", "HIV", "AIDS"],
    },
    {
      id: "syphilis",
      title: "🧫 تست سیفلیس (VDRL)",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#ec4899" }} />,
      testType: "syphilis",
      keywords: ["سیفلیس", "syphilis", "VDRL"],
    },
    {
      id: "rubella",
      title: "🧫 تست روبلا",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#f472b6" }} />,
      testType: "rubella",
      keywords: ["روبلا", "rubella"],
    },
    {
      id: "toxoplasmosis",
      title: "🧫 تست توکسوپلاسموز",
      icon: <HealingIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "toxoplasmosis",
      keywords: ["توکسوپلاسموز", "toxoplasmosis"],
    },

    // 💧 ادرار
    {
      id: "urine",
      title: "💧 آنالیز ادرار",
      icon: <WaterIcon sx={{ fontSize: 40, color: "#fcd34d" }} />,
      testType: "urine",
      keywords: ["ادرار", "urine", "آنالیز ادرار", "U/A"],
    },
    {
      id: "urine_culture",
      title: "💧 کشت ادرار",
      icon: <WaterIcon sx={{ fontSize: 40, color: "#fbbf24" }} />,
      testType: "urine_culture",
      keywords: ["کشت ادرار", "urine culture"],
    },

    // 💩 مدفوع
    {
      id: "stool",
      title: "💩 آزمایش مدفوع",
      icon: <LocalHospitalIcon sx={{ fontSize: 40, color: "#92400e" }} />,
      testType: "stool",
      keywords: ["مدفوع", "stool"],
    },
    {
      id: "stool_culture",
      title: "💩 کشت مدفوع",
      icon: <LocalHospitalIcon sx={{ fontSize: 40, color: "#78350f" }} />,
      testType: "stool_culture",
      keywords: ["کشت مدفوع", "stool culture"],
    },
    {
      id: "occult_blood",
      title: "💩 خون مخفی مدفوع",
      icon: <LocalHospitalIcon sx={{ fontSize: 40, color: "#dc2626" }} />,
      testType: "occult_blood",
      keywords: ["خون مخفی", "occult blood", "FOBT"],
    },

    // 🔬 پاتولوژی
    {
      id: "pathology",
      title: "🔬 پاتولوژی",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#ef4444" }} />,
      testType: "pathology",
      keywords: ["پاتولوژی", "pathology"],
    },
    {
      id: "biopsy",
      title: "🔬 بیوپسی",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#dc2626" }} />,
      testType: "biopsy",
      keywords: ["بیوپسی", "biopsy"],
    },
    {
      id: "cytology",
      title: "🔬 سیتولوژی",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "cytology",
      keywords: ["سیتولوژی", "cytology"],
    },

    // 🧬 ژنتیک
    {
      id: "genetic",
      title: "🧬 آزمایش ژنتیک",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "genetic",
      keywords: ["ژنتیک", "genetic"],
    },
    {
      id: "pcr",
      title: "🧬 PCR",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#3b82f6" }} />,
      testType: "pcr",
      keywords: ["PCR", "pcr"],
    },
    {
      id: "karyotyping",
      title: "🧬 کاریوتایپینگ",
      icon: <BiotechIcon sx={{ fontSize: 40, color: "#7c3aed" }} />,
      testType: "karyotyping",
      keywords: ["کاریوتایپ", "karyotyping"],
    },

    // 🦟 انگل‌شناسی
    {
      id: "malaria",
      title: "🦟 تست مالاریا",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#22c55e" }} />,
      testType: "malaria",
      keywords: ["مالاریا", "malaria", "پلاسمودیوم", "plasmodium"],
    },
    {
      id: "parasitology",
      title: "🦟 انگل‌شناسی",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#f59e0b" }} />,
      testType: "parasitology",
      keywords: ["انگل", "parasitology", "parasite"],
    },
    {
      id: "kala_azar",
      title: "🦟 کالا آزار (لیشمانیوز احشایی)",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#dc2626" }} />,
      testType: "kala_azar",
      keywords: ["کالا آزار", "kala azar", "لیشمانیوز"],
    },
    {
      id: "leishmaniasis",
      title: "🦟 لیشمانیوز",
      icon: <BugReportIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "leishmaniasis",
      keywords: ["لیشمانیوز", "leishmaniasis"],
    },

    // 📷 تصویربرداری
    {
      id: "imaging",
      title: "📷 تصویربرداری",
      icon: <ImageIcon sx={{ fontSize: 40, color: "#3b82f6" }} />,
      testType: "imaging",
      keywords: ["تصویربرداری", "imaging"],
    },
    {
      id: "ultrasound",
      title: "📷 سونوگرافی",
      icon: <ImageIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "ultrasound",
      keywords: ["سونوگرافی", "ultrasound"],
    },
    {
      id: "xray",
      title: "📷 رادیوگرافی (X-Ray)",
      icon: <ImageIcon sx={{ fontSize: 40, color: "#6b7280" }} />,
      testType: "xray",
      keywords: ["رادیوگرافی", "xray", "X-Ray"],
    },
    {
      id: "ct_scan",
      title: "📷 سی‌تی اسکن (CT Scan)",
      icon: <ImageIcon sx={{ fontSize: 40, color: "#3b82f6" }} />,
      testType: "ct_scan",
      keywords: ["سی‌تی اسکن", "ct scan", "CT"],
    },
    {
      id: "mri",
      title: "📷 ام‌آرآی (MRI)",
      icon: <ImageIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />,
      testType: "mri",
      keywords: ["ام‌آرآی", "mri", "MRI"],
    },

    // 📋 سایر
    {
      id: "other",
      title: "📋 سایر آزمایشات",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#6b7280" }} />,
      testType: "other",
      keywords: ["سایر", "other", "عمومی"],
    },
    {
      id: "general",
      title: "📋 عمومی",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#9ca3af" }} />,
      testType: "general",
      keywords: ["عمومی", "general"],
    },

    // 📄 ثبت نتایج
    {
      id: "results",
      title: "📄 ثبت نتایج",
      icon: <ScienceIcon sx={{ fontSize: 40, color: "#06b6d4" }} />,
      testType: "",
      keywords: [],
      isSpecial: true,
    },
  ];

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

      console.log("📋 همه درخواست‌ها از API:", allRequests);

      // پردازش اطلاعات بیمار
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

        if (!patientName || patientName === "نامشخص") {
          if (req.patient_name) patientName = req.patient_name;
          else if (req.patientName) patientName = req.patientName;
          else if (req.name) patientName = req.name;
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

      // فقط درخواست‌های دارای فیس
      const paidRequests = processedRequests.filter((r) => r.has_fee === true);
      console.log("✅ درخواست‌های دارای فیس:", paidRequests.length);
      setAllRequests(paidRequests);
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
  }, []);

  // ============ انتخاب دسته ============
  const handleCategoryClick = (category) => {
    if (category.isSpecial) {
      navigate("/material/lab-results");
      return;
    }

    setSelectedCategory(category);

    const filtered = allRequests.filter((r) => {
      if (category.testType && r.test_type === category.testType) {
        return true;
      }
      if (category.keywords.length > 0) {
        const testName = (r.test_name || "").toLowerCase();
        const testTypeName = (r.test_type || "").toLowerCase();
        return category.keywords.some((keyword) =>
          testName.includes(keyword.toLowerCase()) ||
          testTypeName.includes(keyword.toLowerCase())
        );
      }
      return false;
    });

    console.log(`✅ درخواست‌های فیلتر شده برای ${category.title}:`, filtered.length);
    setFilteredRequests(filtered);
  };

  // ============ بازگشت به لیست دسته‌ها ============
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setFilteredRequests([]);
  };

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
        xhr.open("POST", "http://localhost:8000/api/laboratory-requests/upload-pdf", true);
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
        if (selectedCategory) {
          handleCategoryClick(selectedCategory);
        }
        setError(null);
      }
    } catch (err) {
      console.error("❌ خطا در ثبت نتیجه:", err);
      setError("خطا در ثبت نتیجه یا آپلود فایل");
      setUploading(false);
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
      {/* Header */}
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
          <BloodtypeIcon sx={{ fontSize: 35, color: "#ef4444" }} />
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "white" }}>
            {selectedCategory ? selectedCategory.title : "🧪 لابراتوار"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            label={`${selectedCategory ? filteredRequests.length : allRequests.length} درخواست`}
            color="info"
            size="medium"
            sx={{ fontWeight: "bold" }}
          />
          {selectedCategory && (
            <Chip
              label={`${filteredRequests.filter(r => r.status !== "completed").length} در انتظار`}
              color="warning"
              size="medium"
              sx={{ fontWeight: "bold" }}
            />
          )}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* نمایش کارت‌های دسته‌بندی یا لیست درخواست‌ها */}
      {!selectedCategory ? (
        <Grid container spacing={3}>
          {categories.map((category) => {
            const count = allRequests.filter((r) => {
              if (category.isSpecial) return 0;
              if (category.testType && r.test_type === category.testType) {
                return true;
              }
              if (category.keywords.length > 0) {
                const testName = (r.test_name || "").toLowerCase();
                const testTypeName = (r.test_type || "").toLowerCase();
                return category.keywords.some((keyword) =>
                  testName.includes(keyword.toLowerCase()) ||
                  testTypeName.includes(keyword.toLowerCase())
                );
              }
              return false;
            }).length;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                <Card
                  sx={{
                    bgcolor: "#1a2a3a",
                    borderRadius: "12px",
                    border: "1px solid #374151",
                    transition: "all 0.3s",
                    cursor: "pointer",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      borderColor: "#60a5fa",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                    },
                  }}
                  onClick={() => handleCategoryClick(category)}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                      {category.icon}
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: "white", 
                        fontWeight: "bold", 
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
                    ) : count > 0 ? (
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
                      <Typography variant="body2" sx={{ color: "#6b7280", mt: 1 }}>
                        هیچ درخواستی
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        // ============ نمایش لیست درخواست‌های فیلتر شده ============
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
            <ScienceIcon sx={{ fontSize: 60, color: "#6b7280", mb: 2 }} />
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
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>نوع تست</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>تاریخ درخواست</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>وضعیت</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>PDF</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((req, index) => {
                  const patientName = req.patient_name || "نامشخص";
                  const patientPhone = req.patient_phone || "";
                  const patientAge = req.patient_age || "";
                  const patientGender = req.patient_gender || "";
                  const patientNationalId = req.patient_national_id || "";
                  const registrationId = req.registration_id || req.reg_id || "";
                  const doctorName = req.doctor_name || "";
                  
                  const initials = getInitials(patientName);
                  const avatarColor = getAvatarColor(patientName);
                  const genderLabel = getGenderLabel(patientGender);
                  
                  return (
                    <TableRow
                      key={req.id}
                      sx={{
                        "&:hover": { bgcolor: "#243647" },
                        borderBottom: "1px solid #374151",
                      }}
                    >
                      <TableCell sx={{ color: "#9ca3af" }}>{index + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: avatarColor,
                              width: 45,
                              height: 45,
                              fontSize: 18,
                              fontWeight: "bold",
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography sx={{ color: "white", fontWeight: "bold", fontSize: "15px" }}>
                              {patientName}
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
                              {patientPhone && (
                                <Typography sx={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <PhoneIcon sx={{ fontSize: 12 }} />
                                  {patientPhone}
                                </Typography>
                              )}
                              {patientAge && (
                                <Typography sx={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <AccessTimeIcon sx={{ fontSize: 12 }} />
                                  {patientAge} سال
                                </Typography>
                              )}
                              {patientGender && (
                                <Typography sx={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <BadgeIcon sx={{ fontSize: 12 }} />
                                  {genderLabel}
                                </Typography>
                              )}
                            </Box>
                            {patientNationalId && (
                              <Typography sx={{ color: "#6b7280", fontSize: "11px" }}>
                                تذکره: {patientNationalId}
                              </Typography>
                            )}
                            <Typography sx={{ color: "#4b5563", fontSize: "10px" }}>
                              مراجعه: {registrationId || "N/A"}
                              {doctorName && ` | داکتر: ${doctorName}`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={req.test_name || req.test_type || "نامشخص"}
                          size="small"
                          sx={{
                            bgcolor: "rgba(96, 165, 250, 0.2)",
                            color: "#60a5fa",
                            fontWeight: "bold",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#9ca3af" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CalendarIcon sx={{ fontSize: 16, color: "#6b7280" }} />
                          {new Date(req.created_at).toLocaleDateString("fa-IR")}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={req.status === "completed" ? "✅ تکمیل شده" : "⏳ در انتظار"}
                          color={req.status === "completed" ? "success" : "warning"}
                          size="small"
                          sx={{ fontWeight: "bold" }}
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
                              color: "#ef4444",
                              borderColor: "#ef4444",
                              "&:hover": {
                                borderColor: "#f87171",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                              },
                            }}
                          >
                            PDF
                          </Button>
                        ) : (
                          <Typography sx={{ color: "#6b7280", fontSize: "12px" }}>
                            ندارد
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
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
                          {req.status !== "completed" && (
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
                          {req.status === "completed" && (
                            <Tooltip title="چاپ نتیجه">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={() => window.print()}
                                sx={{
                                  color: "#f59e0b",
                                  borderColor: "#f59e0b",
                                  "&:hover": {
                                    borderColor: "#fbbf24",
                                    backgroundColor: "rgba(245, 158, 11, 0.1)",
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
              <PersonIcon sx={{ color: "#60a5fa" }} />
              جزئیات درخواست
            </Typography>
            <IconButton onClick={() => setOpenDetailDialog(false)} sx={{ color: "#9ca3af" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedRequest && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: "#0d1b2a", border: "1px solid #374151" }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#9ca3af", mb: 1 }}>
                      <PersonIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
                      اطلاعات بیمار
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#374151" }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: getAvatarColor(selectedRequest.patient_name || "User"),
                            width: 60,
                            height: 60,
                            fontSize: 24,
                            fontWeight: "bold",
                          }}
                        >
                          {getInitials(selectedRequest.patient_name || "کاربر")}
                        </Avatar>
                        <Box>
                          <Typography sx={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
                            {selectedRequest.patient_name || "نامشخص"}
                          </Typography>
                          {selectedRequest.patient_phone && (
                            <Typography sx={{ color: "#9ca3af", fontSize: "14px" }}>
                              <PhoneIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                              {selectedRequest.patient_phone}
                            </Typography>
                          )}
                          {selectedRequest.patient_email && (
                            <Typography sx={{ color: "#9ca3af", fontSize: "14px" }}>
                              <EmailIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                              {selectedRequest.patient_email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: "#6b7280" }}>سن:</Typography>
                          <Typography sx={{ color: "white" }}>
                            {selectedRequest.patient_age || "ندارد"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: "#6b7280" }}>جنسیت:</Typography>
                          <Typography sx={{ color: "white" }}>
                            {getGenderLabel(selectedRequest.patient_gender)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: "#6b7280" }}>تذکره:</Typography>
                          <Typography sx={{ color: "white" }}>
                            {selectedRequest.patient_national_id || "ندارد"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: "#0d1b2a", border: "1px solid #374151" }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#9ca3af", mb: 1 }}>
                      <ScienceIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
                      اطلاعات آزمایش
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: "#374151" }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>نوع تست:</Typography>
                        <Typography sx={{ color: "white", fontWeight: "bold" }}>
                          {selectedRequest.test_name || selectedRequest.test_type || "نامشخص"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>شماره مراجعه:</Typography>
                        <Typography sx={{ color: "white" }}>
                          {selectedRequest.registration_id || selectedRequest.reg_id || "N/A"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>داکتر:</Typography>
                        <Typography sx={{ color: "white" }}>
                          {selectedRequest.doctor_name || "نامشخص"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>تاریخ درخواست:</Typography>
                        <Typography sx={{ color: "white" }}>
                          {new Date(selectedRequest.created_at).toLocaleDateString("fa-IR")}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#9ca3af" }}>وضعیت:</Typography>
                        <Chip
                          label={selectedRequest.status === "completed" ? "تکمیل شده" : "در انتظار"}
                          color={selectedRequest.status === "completed" ? "success" : "warning"}
                          size="small"
                        />
                      </Box>
                      {selectedRequest.result && (
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography sx={{ color: "#9ca3af" }}>نتیجه:</Typography>
                          <Typography sx={{ color: "#22c55e", fontWeight: "bold" }}>
                            {selectedRequest.result}
                          </Typography>
                        </Box>
                      )}
                      {selectedRequest.pdf_url && (
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography sx={{ color: "#9ca3af" }}>فایل PDF:</Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PdfIcon />}
                            onClick={() => handleDownloadPdf(selectedRequest.pdf_url)}
                            sx={{
                              color: "#ef4444",
                              borderColor: "#ef4444",
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
                  <Card sx={{ bgcolor: "#0d1b2a", border: "1px solid #374151" }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: "#9ca3af", mb: 1 }}>
                        یادداشت‌ها
                      </Typography>
                      <Divider sx={{ mb: 2, borderColor: "#374151" }} />
                      <Typography sx={{ color: "white" }}>
                        {selectedRequest.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #374151", p: 2 }}>
          <Button
            onClick={() => setOpenDetailDialog(false)}
            sx={{ color: "#9ca3af" }}
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
                bgcolor: "#22c55e",
                "&:hover": { bgcolor: "#16a34a" },
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
              ثبت نتیجه آزمایش
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
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                        نام بیمار:
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: getAvatarColor(selectedRequest.patient_name || "User"),
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            fontWeight: "bold",
                          }}
                        >
                          {getInitials(selectedRequest.patient_name || "کاربر")}
                        </Avatar>
                        <Typography sx={{ color: "white", fontWeight: "bold", fontSize: "16px" }}>
                          {selectedRequest.patient_name || "نامشخص"}
                        </Typography>
                        {selectedRequest.patient_phone && (
                          <Typography sx={{ color: "#9ca3af", fontSize: "12px", ml: 1 }}>
                            <PhoneIcon sx={{ fontSize: 12, verticalAlign: "middle" }} />
                            {selectedRequest.patient_phone}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                        {selectedRequest.patient_age && (
                          <Typography sx={{ color: "#6b7280", fontSize: "12px" }}>
                            سن: {selectedRequest.patient_age} سال
                          </Typography>
                        )}
                        {selectedRequest.patient_gender && (
                          <Typography sx={{ color: "#6b7280", fontSize: "12px" }}>
                            جنسیت: {getGenderLabel(selectedRequest.patient_gender)}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                        نوع تست:
                      </Typography>
                      <Typography sx={{ color: "white", fontWeight: "bold", mt: 0.5, fontSize: "16px" }}>
                        {selectedRequest.test_name || selectedRequest.test_type || "نامشخص"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.5 }}>
                        شماره مراجعه: {selectedRequest.registration_id || selectedRequest.reg_id || "N/A"}
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
                  <MenuItem value="pending" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    در انتظار
                  </MenuItem>
                  <MenuItem value="completed" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    تکمیل شده
                  </MenuItem>
                  <MenuItem value="cancelled" sx={{ color: "white", bgcolor: "#1a2a3a" }}>
                    لغو شده
                  </MenuItem>
                </TextField>
              </Grid>

              {/* بخش آپلود PDF */}
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
                        فقط فایل‌های PDF پذیرفته می‌شوند
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
            {uploading ? "در حال ذخیره..." : "ذخیره نتیجه"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}