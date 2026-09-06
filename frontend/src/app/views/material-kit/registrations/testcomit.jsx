// src/app/pages/registration/RegistrationForm.jsx

import { useState, useEffect, useMemo, useRef } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
// ============ ایمپورت تب‌های فیس ============
import LaboratoryFeeTab from "./LabFeesRequest/LaboratoryFeeTab";
import PrescriptionFeeTab from "./pharmacyFeesRequest/PrescriptionFeeTab";
import RadiologyFeeTab from "./radiologyFeesRequest/RadiologyFeeTab";
import OperationFeeTab from "./operationFeesRequest/OperationFeeTab";
import AdmissionFeeTab from "./admissionFeesRequest/AdmissionFeeTab";

export default function RegistrationForm() {
  const { api } = useAuth();
  const printRef = useRef();
  const [printData, setPrintData] = useState(null);

  // ============ تب اصلی ============
  const [activeMainTab, setActiveMainTab] = useState("registration");
  
  // ============ state برای regId جاری ============
  const [currentRegId, setCurrentRegId] = useState(null);

  const departmentNames = {
    Emergency: "اورژانس",
    "Out Patient Department": "مریضان سرپایی",
    OPD: "مریضان سرپایی",
    "In Patient Department": "بخش بستر",
    IPD: "بخش بستر",
    Laboratory: "لابراتوار",
    "Clinical Laboratory": "لابراتوار کلینیکی",
    "Pathology Laboratory": "لابراتوار پتالوژی",
    Radiology: "رادیولوژی",
    Imaging: "تصویربرداری",
    Pharmacy: "فارماسی",
    "Inpatient Pharmacy": "فارماسی بستر",
    "Outpatient Pharmacy": "فارماسی سرپایی",
    Surgery: "جراحی",
    "General Surgery": "جراحی عمومی",
    "Orthopedic Surgery": "جراحی ارتوپیدی",
    "Neurosurgery": "جراحی اعصاب",
    "Cardiac Surgery": "جراحی قلب",
    Internal: "داخله",
    "Internal Medicine": "داخله عمومی",
    Pediatrics: "اطفال",
    Pediatric: "اطفال",
    "Obstetrics": "نسایی ولادی",
    Gynecology: "نسایی",
    "Obstetrics and Gynecology": "نسایی ولادی",
    Cardiology: "قلب",
    Neurology: "اعصاب",
    Neuroscience: "علوم عصبی",
    Dermatology: "جلدی",
    "Skin Department": "بخش جلدی",
    "ENT": "گوش، حلق و بینی",
    Otolaryngology: "گوش، حلق و بینی",
    Ophthalmology: "چشم",
    "Eye Department": "بخش چشم",
    Urology: "ارولوژی",
    Nephrology: "امراض کلیه",
    Oncology: "سرطان شناسی",
    Hematology: "خون شناسی",
    Psychiatry: "روان پزشکی",
    "Mental Health": "صحت روان",
    Dentistry: "دندان",
    Dental: "دندان پزشکی",
    Physiotherapy: "فیزیوتراپی",
    Rehabilitation: "توانبخشی",
    "Nutrition": "تغذیه",
    Dietetics: "رژیم غذایی",
    "Anesthesia": "بیهوشی",
    Anesthesiology: "بیهوشی",
    ICU: "بخش مراقبت‌های ویژه",
    "Intensive Care Unit": "بخش مراقبت‌های ویژه",
    NICU: "مراقبت ویژه نوزادان",
    "Neonatal ICU": "مراقبت ویژه نوزادان",
    "CCU": "بخش مراقبت قلبی",
    "Operation Theater": "اتاق عملیات",
    "Operating Room": "اتاق عملیات",
    "Blood Bank": "بانک خون",
    "Emergency Room": "اتاق عاجل",
    "Medical Records": "آرشیف و ثبت اسناد طبی",
    "Registration": "پذیرش و ثبت مریضان",
    "Billing": "حسابداری",
    "Admission": "پذیرش بستر",
    "Discharge": "ترخیص",
    "Mortuary": "مرده‌شوی‌خانه",
    "House Keeping": "خدمات تنظیف",
    "Security": "امنیت",
    "Administration": "اداره",
    "Human Resource": "منابع بشری",
    "Finance": "مالی",
    "Store": "گدام مرکزی",
    "CSSD": "مرکز سترون‌سازی وسایل طبی",
    "Ambulance": "آمبولانس"
  };

  const [form, setForm] = useState({
    patient_id: "",
    department_id: "",
    doctor_id: "",
    visit_type: "",
    registration_fee: "",
    visit_status: "Waiting",
    diagnosis: "",
    weight: "",
    blood_pressure: "",
    temperature: "",
    oxygen: "",
    visit_date: "",
    note: "",
    search_tazkira: "",
    search_name: "",
    search_phone: "",
    new_first_name: "",
    new_last_name: "",
    new_father_name: "",
    new_mobile: "",
    new_national_id: "",
    new_gender: "",
    new_age: "",
    new_blood_group: "",
    new_address: "",
  });

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [statistics, setStatistics] = useState({
    total_patients: 0,
    today_patients: 0,
    waiting_patients: 0,
    completed_patients: 0,
    total_fees: 0,
    today_fees: 0,
    doctor_patients: 0,
    laboratory_patients: 0,
    radiology_patients: 0,
    pharmacy_patients: 0,
    billing_patients: 0,
    cancelled_patients: 0,
    examining_patients: 0,
    admission_patients: 0,
    ward_patients: 0,
    operation_patients: 0
  });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const ROWS_PER_PAGE = 10;

  // تابع پرینت با استفاده از useReactToPrint
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "receipt",
    onAfterPrint: () => {
      setPrintData(null);
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      toast.error("خطا در چاپ رسید");
      setPrintData(null);
    }
  });

  const openPrintModal = (registration) => {
    setPrintData(registration);
  };

  useEffect(() => {
    if (printData && printRef.current) {
      handlePrint();
    }
  }, [printData, handlePrint]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deptRes, docRes, patientRes] = await Promise.all([
          api.get("/departments"),
          api.get("/users?role=doctor"),
          api.get("/patients")
        ]);
        
        const deptData = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.data || []);
        setDepartments(deptData);
        
        let doctorsData = [];
        if (Array.isArray(docRes.data)) {
          doctorsData = docRes.data;
        } else if (docRes.data?.data && Array.isArray(docRes.data.data)) {
          doctorsData = docRes.data.data;
        }
        
        if (doctorsData.length > 0) {
          doctorsData = doctorsData.filter(user =>
            user.roles?.some(role => 
              role.name?.toLowerCase() === 'doctor'
            ) || user.role?.toLowerCase() === 'doctor'
          );
        }
        setDoctors(doctorsData);
        
        let patientsData = [];
        if (Array.isArray(patientRes.data)) {
          patientsData = patientRes.data;
        } else if (patientRes.data?.data && Array.isArray(patientRes.data.data)) {
          patientsData = patientRes.data.data;
        }
        setPatients(patientsData);
        
      } catch (err) {
        console.error("خطا در بارگذاری داده‌ها:", err);
        setDepartments([]);
        setDoctors([]);
        setPatients([]);
      }
    };
    fetchInitialData();
    fetchRegistrations();
    fetchStatistics();
  }, [api]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/registrations");
      let regs = [];
      if (Array.isArray(res.data)) {
        regs = res.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        regs = res.data.data;
      } else if (res.data?.data && typeof res.data.data === 'object') {
        regs = res.data.data.data || [];
      }
      setRegistrations(regs);
      setCurrentPage(1);
      calculateStatisticsFromData(regs);
      
      if (!currentRegId && regs.length > 0) {
        setCurrentRegId(regs[0].reg_id);
      } else if (currentRegId && !regs.some(r => r.reg_id === currentRegId)) {
        setCurrentRegId(regs.length > 0 ? regs[0].reg_id : null);
      }
    } catch (err) {
      console.error("خطا در دریافت مریض‌ها:", err);
      setRegistrations([]);
      toast.error("خطا در دریافت لیست مریض‌ها");
    } finally {
      setLoading(false);
    }
  };

  const calculateStatisticsFromData = (regs) => {
    const today = new Date().toISOString().split('T')[0];
    const total = regs.length;
    const todayRegs = regs.filter(r => {
      const visitDate = r.visit_date ? new Date(r.visit_date).toISOString().split('T')[0] : null;
      const createdDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : null;
      return visitDate === today || createdDate === today;
    });
    
    const waiting = regs.filter(r => r.visit_status === 'Waiting').length;
    const completed = regs.filter(r => r.visit_status === 'Completed').length;
    const doctor = regs.filter(r => r.visit_status === 'Doctor').length;
    const laboratory = regs.filter(r => r.visit_status === 'Laboratory').length;
    const radiology = regs.filter(r => r.visit_status === 'Radiology').length;
    const pharmacy = regs.filter(r => r.visit_status === 'Pharmacy').length;
    const billing = regs.filter(r => r.visit_status === 'Billing').length;
    const cancelled = regs.filter(r => r.visit_status === 'Cancelled').length;
    const examining = regs.filter(r => r.visit_status === 'Examining').length;
    const admission = regs.filter(r => r.visit_status === 'Admission').length;
    const ward = regs.filter(r => r.visit_status === 'Ward').length;
    const operation = regs.filter(r => r.visit_status === 'Operation').length;
    
    const totalFees = regs.reduce((sum, r) => sum + (parseFloat(r.registration_fee) || 0), 0);
    const todayFees = todayRegs.reduce((sum, r) => sum + (parseFloat(r.registration_fee) || 0), 0);
    
    setStatistics({
      total_patients: total,
      today_patients: todayRegs.length,
      waiting_patients: waiting,
      completed_patients: completed,
      total_fees: totalFees,
      today_fees: todayFees,
      doctor_patients: doctor,
      laboratory_patients: laboratory,
      radiology_patients: radiology,
      pharmacy_patients: pharmacy,
      billing_patients: billing,
      cancelled_patients: cancelled,
      examining_patients: examining,
      admission_patients: admission,
      ward_patients: ward,
      operation_patients: operation
    });
  };

  const fetchStatistics = async () => {
    try {
      const res = await api.get("/registrations/statistics");
      if (res.data) {
        setStatistics(prev => ({
          ...prev,
          ...res.data
        }));
      }
    } catch (err) {
      console.error("خطا در دریافت آمار:", err);
      if (registrations.length > 0) {
        calculateStatisticsFromData(registrations);
      }
    }
  };

  const searchExistingPatients = async () => {
    const { search_tazkira, search_name, search_phone } = form;

    if (!search_tazkira && !search_name && !search_phone) {
      toast.warning("⚠️ لطفاً حداقل یکی از فیلدهای جستجو را پر کنید");
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);

    try {
      const params = new URLSearchParams();
      if (search_tazkira) params.append('q', search_tazkira);
      if (search_name) params.append('q', search_name);
      if (search_phone) params.append('q', search_phone);
      params.append('type', 'all');

      const response = await api.get(`/patients/search?${params.toString()}`);
      
      let results = [];
      if (Array.isArray(response.data)) {
        results = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        results = response.data.data;
      }

      setSearchResults(results);
      setShowSearchResults(results.length > 0);

      if (results.length === 0) {
        toast.info("ℹ️ هیچ مریضی با این مشخصات یافت نشد");
      } else {
        toast.success(`✅ ${results.length} مریض پیدا شد`);
      }

    } catch (err) {
      console.error("خطا در جستجو:", err);
      setSearchResults([]);
      setShowSearchResults(false);
      toast.error("❌ خطا در جستجوی مریض");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const { search_tazkira, search_name, search_phone } = form;
      if (search_tazkira || search_name || search_phone) {
        searchExistingPatients();
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [form.search_tazkira, form.search_name, form.search_phone]);

  const selectExistingPatient = (patient) => {
    setSelectedPatient(patient);
    setForm(prev => ({
      ...prev,
      patient_id: patient.id,
      search_tazkira: patient.national_id || '',
      search_name: (patient.first_name || '') + ' ' + (patient.last_name || ''),
      search_phone: patient.mobile || '',
      new_first_name: patient.first_name || '',
      new_last_name: patient.last_name || '',
      new_father_name: patient.father_name || '',
      new_mobile: patient.mobile || '',
      new_national_id: patient.national_id || '',
      new_gender: patient.gender || '',
      new_age: patient.age || '',
      new_blood_group: patient.blood_group || '',
      new_address: patient.address || '',
    }));
    
    setSearchResults([]);
    setShowSearchResults(false);
    setShowNewPatientForm(false);
    
    const fullName = (patient.first_name || '') + ' ' + (patient.last_name || '');
    toast.success(`✅ مریض ${fullName} انتخاب شد`);
  };

  const clearSearchFields = () => {
    setForm(prev => ({
      ...prev,
      search_tazkira: "",
      search_name: "",
      search_phone: "",
    }));
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedPatient(null);
    setShowNewPatientForm(false);
  };

  const clearForm = () => {
    setForm({
      patient_id: "",
      department_id: "",
      doctor_id: "",
      visit_type: "",
      registration_fee: "",
      visit_status: "Waiting",
      diagnosis: "",
      weight: "",
      blood_pressure: "",
      temperature: "",
      oxygen: "",
      visit_date: "",
      note: "",
      search_tazkira: "",
      search_name: "",
      search_phone: "",
      new_first_name: "",
      new_last_name: "",
      new_father_name: "",
      new_mobile: "",
      new_national_id: "",
      new_gender: "",
      new_age: "",
      new_blood_group: "",
      new_address: "",
    });
    setSelectedPatient(null);
    setSearchResults([]);
    setShowSearchResults(false);
    setShowNewPatientForm(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!form.patient_id && !showNewPatientForm) {
        toast.error("❌ لطفاً یک مریض را انتخاب کنید یا مریض جدید ثبت کنید");
        setIsSubmitting(false);
        return;
      }

      if (showNewPatientForm) {
        if (!form.new_first_name || !form.new_last_name) {
          toast.error("❌ نام و نام خانوادگی مریض جدید الزامی است");
          setIsSubmitting(false);
          return;
        }
      }

      if (!form.registration_fee || parseFloat(form.registration_fee) < 0) {
        toast.error("❌ لطفاً مبلغ فیس مراجعه را وارد کنید");
        setIsSubmitting(false);
        return;
      }

      if (form.weight && (parseFloat(form.weight) < 0 || parseFloat(form.weight) > 300)) {
        toast.error("❌ وزن باید بین 0 تا 300 کیلوگرم باشد");
        setIsSubmitting(false);
        return;
      }

      if (form.temperature && (parseFloat(form.temperature) < 30 || parseFloat(form.temperature) > 45)) {
        toast.error("❌ حرارت باید بین 30 تا 45 درجه سانتی‌گراد باشد");
        setIsSubmitting(false);
        return;
      }

      if (form.oxygen && (parseInt(form.oxygen) < 0 || parseInt(form.oxygen) > 100)) {
        toast.error("❌ اکسیجن باید بین 0 تا 100 درصد باشد");
        setIsSubmitting(false);
        return;
      }

      const submitData = { ...form };
      delete submitData.search_tazkira;
      delete submitData.search_name;
      delete submitData.search_phone;
      
      if (showNewPatientForm) {
        delete submitData.patient_id;
        submitData.first_name = submitData.new_first_name;
        submitData.last_name = submitData.new_last_name;
        submitData.father_name = submitData.new_father_name || null;
        submitData.mobile = submitData.new_mobile || null;
        submitData.national_id = submitData.new_national_id || null;
        submitData.gender = submitData.new_gender || null;
        submitData.age = submitData.new_age || null;
        submitData.blood_group = submitData.new_blood_group || null;
        submitData.address = submitData.new_address || null;
        delete submitData.new_first_name;
        delete submitData.new_last_name;
        delete submitData.new_father_name;
        delete submitData.new_mobile;
        delete submitData.new_national_id;
        delete submitData.new_gender;
        delete submitData.new_age;
        delete submitData.new_blood_group;
        delete submitData.new_address;
        submitData.is_new_patient = true;
      } else {
        delete submitData.new_first_name;
        delete submitData.new_last_name;
        delete submitData.new_father_name;
        delete submitData.new_mobile;
        delete submitData.new_national_id;
        delete submitData.new_gender;
        delete submitData.new_age;
        delete submitData.new_blood_group;
        delete submitData.new_address;
        submitData.is_new_patient = false;
      }
      
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      let response;
      let newRegistration = null;

      if (editingId) {
        response = await api.put(`/registrations/${editingId}`, submitData);
        toast.success("✅ معلومات مراجعه و مریض با موفقیت تصحیح شد");
        newRegistration = response.data?.data || response.data;
        
        if (newRegistration?.patient) {
          setPatients(prev => {
            const index = prev.findIndex(p => p.id === newRegistration.patient.id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = newRegistration.patient;
              return updated;
            }
            return prev;
          });
          setSelectedPatient(newRegistration.patient);
          setForm(prev => ({
            ...prev,
            search_tazkira: newRegistration.patient.national_id || '',
            search_name: (newRegistration.patient.first_name || '') + ' ' + (newRegistration.patient.last_name || ''),
            search_phone: newRegistration.patient.mobile || '',
            new_first_name: newRegistration.patient.first_name || '',
            new_last_name: newRegistration.patient.last_name || '',
            new_father_name: newRegistration.patient.father_name || '',
            new_mobile: newRegistration.patient.mobile || '',
            new_national_id: newRegistration.patient.national_id || '',
            new_gender: newRegistration.patient.gender || '',
            new_age: newRegistration.patient.age || '',
            new_blood_group: newRegistration.patient.blood_group || '',
            new_address: newRegistration.patient.address || '',
          }));
        }
        setCurrentRegId(editingId);
      } else {
        console.log("FINAL DATA SEND:", submitData);
        response = await api.post("/registrations", submitData);
        toast.success("✅ مراجعه با موفقیت ثبت شد");
        newRegistration = response.data?.data || response.data;

        if (showNewPatientForm && newRegistration?.patient) {
          setPatients(prev => {
            const exists = prev.some(p => p.id === newRegistration.patient.id);
            if (exists) return prev;
            return [newRegistration.patient, ...prev];
          });
          setSelectedPatient(newRegistration.patient);
          setForm(prev => ({
            ...prev,
            patient_id: newRegistration.patient.id,
            search_tazkira: newRegistration.patient.national_id || '',
            search_name: (newRegistration.patient.first_name || '') + ' ' + (newRegistration.patient.last_name || ''),
            search_phone: newRegistration.patient.mobile || '',
          }));
          toast.success(`✅ مریض جدید ${newRegistration.patient.first_name} ${newRegistration.patient.last_name} با موفقیت ثبت شد`);
        }

        if (newRegistration?.registration_fee > 0) {
          toast.info(`💰 فیس مراجعه به مبلغ ${parseFloat(newRegistration.registration_fee).toFixed(2)} افغانی در ژورنال ثبت شد`);
        }

        if (newRegistration?.reg_id) {
          setCurrentRegId(newRegistration.reg_id);
        }

        if (form.doctor_id) {
          const regRes = await api.get(`/registrations/${newRegistration.reg_id}`);
          const fullReg = regRes.data?.data || regRes.data;
          setSelectedRegistration(fullReg);
          setShowSendModal(true);
        }
      }

      await fetchRegistrations();
      await fetchStatistics();
      clearForm();
      
    } catch (err) {
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", err.response?.data);

      if (err.response?.status === 422 && err.response?.data?.errors) {
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          toast.error(`❌ ${messages[0]}`);
        });
      } else {
        toast.error(err.response?.data?.message || "❌ خطا در ذخیره معلومات");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToDoctor = async () => {
    if (!selectedRegistration) return;

    try {
      await api.put(`/registrations/${selectedRegistration.reg_id}/status`, {
        visit_status: 'Doctor'
      });

      await api.post('/notifications', {
        user_id: selectedRegistration.doctor_id,
        title: 'مریض جدید',
        message: `مریض جدید با نام ${selectedRegistration.patient?.first_name || ''} ${selectedRegistration.patient?.last_name || ''} به شما ارجاع داده شد`,
        type: 'new_patient',
        registration_id: selectedRegistration.reg_id
      });

      toast.success(`✅ معلومات به داکتر ارسال شد`);
      setShowSendModal(false);
      setSelectedRegistration(null);
      
      await fetchRegistrations();
      await fetchStatistics();
      
    } catch (err) {
      console.error("خطا در ارسال به داکتر:", err);
      if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error("❌ خطا در ارسال به داکتر");
      }
    }
  };

  const handleSendToDoctorFromList = async (registration) => {
    if (!registration.doctor_id) {
      toast.warning("⚠️ لطفاً ابتدا داکتر معالج را انتخاب کنید");
      return;
    }

    try {
      await api.put(`/registrations/${registration.reg_id}/status`, {
        visit_status: 'Doctor'
      });

      await api.post('/notifications', {
        user_id: registration.doctor_id,
        title: 'مریض جدید',
        message: `مریض با نام ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''} به شما ارجاع داده شد`,
        type: 'new_patient',
        registration_id: registration.reg_id
      });

      toast.success(`✅ معلومات به داکتر ارسال شد`);
      
      await fetchRegistrations();
      await fetchStatistics();
      
    } catch (err) {
      console.error("خطا در ارسال به داکتر:", err);
      if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error("❌ خطا در ارسال به داکتر");
      }
    }
  };

  const handleDelete = async (reg_id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این مراجعه را حذف کنید؟")) return;

    try {
      const regToDelete = registrations.find(r => r.reg_id === reg_id);
      await api.delete(`/registrations/${reg_id}`);
      toast.success("✅ مراجعه با موفقیت حذف شد");
      
      if (regToDelete?.patient_id) {
        const hasOtherRegistrations = registrations.some(r => 
          r.patient_id === regToDelete.patient_id && r.reg_id !== reg_id
        );
        
        if (!hasOtherRegistrations) {
          try {
            await api.delete(`/patients/${regToDelete.patient_id}`);
            toast.info(`ℹ️ مریض ${getPatientFullName(regToDelete.patient)} نیز حذف شد زیرا هیچ مراجعه دیگری ندارد`);
            setPatients(prev => prev.filter(p => p.id !== regToDelete.patient_id));
            
            if (selectedPatient?.id === regToDelete.patient_id) {
              setSelectedPatient(null);
              setForm(prev => ({ 
                ...prev, 
                patient_id: "",
                search_tazkira: "",
                search_name: "",
                search_phone: "",
                new_first_name: "",
                new_last_name: "",
                new_father_name: "",
                new_mobile: "",
                new_national_id: "",
                new_gender: "",
                new_age: "",
                new_blood_group: "",
                new_address: "",
              }));
            }
          } catch (patientErr) {
            console.error("خطا در حذف مریض:", patientErr);
            toast.warning("⚠️ مراجعه حذف شد اما مریض به دلیل محدودیت‌های سیستمی حذف نشد");
          }
        } else {
          toast.info(`ℹ️ مریض ${getPatientFullName(regToDelete.patient)} همچنان دارای مراجعات دیگر است و حذف نشد`);
        }
      }
      
      if (currentRegId === reg_id) {
        const remainingRegs = registrations.filter(r => r.reg_id !== reg_id);
        setCurrentRegId(remainingRegs.length > 0 ? remainingRegs[0].reg_id : null);
      }
      
      fetchRegistrations();
      fetchStatistics();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در حذف مراجعه");
    }
  };

  const handleEdit = (reg) => {
    const patient = reg.patient || null;
    
    setForm({ 
      patient_id: reg.patient_id || "",
      department_id: reg.department_id || "",
      doctor_id: reg.doctor_id || "",
      visit_type: reg.visit_type || "",
      registration_fee: reg.registration_fee || "",
      visit_status: reg.visit_status || "Waiting",
      diagnosis: reg.diagnosis || "",
      weight: reg.weight || "",
      blood_pressure: reg.blood_pressure || "",
      temperature: reg.temperature || "",
      oxygen: reg.oxygen || "",
      visit_date: reg.visit_date || "",
      note: reg.note || "",
      search_tazkira: patient?.national_id || "",
      search_name: patient ? (patient.first_name || '') + ' ' + (patient.last_name || '') : "",
      search_phone: patient?.mobile || "",
      new_first_name: patient?.first_name || "",
      new_last_name: patient?.last_name || "",
      new_father_name: patient?.father_name || "",
      new_mobile: patient?.mobile || "",
      new_national_id: patient?.national_id || "",
      new_gender: patient?.gender || "",
      new_age: patient?.age || "",
      new_blood_group: patient?.blood_group || "",
      new_address: patient?.address || "",
    });
    
    setSelectedPatient(patient);
    setEditingId(reg.reg_id);
    setSearchResults([]);
    setShowSearchResults(false);
    setShowNewPatientForm(true);
    
    setCurrentRegId(reg.reg_id);
    
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    toast.info(`✏️ در حال ویرایش مراجعه ${reg.visit_number} و اطلاعات مریض ${getPatientFullName(patient)}`);
  };

  const handleCancelEdit = () => {
    clearForm();
    toast.info("✏️ ویرایش لغو شد");
  };

  const getDoctorName = (doctorId) => {
    if (!doctorId) return "-";
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? (doctor.name || doctor.full_name || `داکتر ${doctor.id}`) : "-";
  };

  const getPatientFullName = (patient) => {
    if (!patient) return "-";
    return (patient.first_name || '') + ' ' + (patient.last_name || '');
  };

  const getPaymentStatus = (registration) => {
    const fee = parseFloat(registration.registration_fee) || 0;
    if (fee === 0) return <span style={{ color: '#9ca3af' }}>رایگان</span>;
    
    const journalAmount = registration.journals?.reduce((sum, j) => {
      if (j.entry_type === 'credit' || j.entry_type === 'debit') {
        return sum + parseFloat(j.amount || 0);
      }
      return sum;
    }, 0) || 0;
    
    if (journalAmount >= fee) {
      return <span style={{ color: '#22c55e' }}>پرداخت شده</span>;
    } else if (journalAmount > 0 && journalAmount < fee) {
      return <span style={{ color: '#f59e0b' }}>ناقص ({(fee - journalAmount).toFixed(2)} باقیمانده)</span>;
    } else {
      return <span style={{ color: '#dc2626' }}>پرداخت نشده</span>;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'Waiting': 'در انتظار',
      'Doctor': 'نزد داکتر',
      'Examining': 'در حال معاینه',
      'Laboratory': 'لابراتوار',
      'Radiology': 'رادیولوژی',
      'Admission': 'بستری',
      'Ward': 'بخش بستری',
      'Operation': 'اتاق عمل',
      'Pharmacy': 'دواخانه',
      'Billing': 'حسابداری',
      'Completed': 'تکمیل شده',
      'Cancelled': 'لغو شده'
    };
    return statusMap[status] || status || '-';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'Waiting': '#f59e0b',
      'Doctor': '#8b5cf6',
      'Examining': '#3b82f6',
      'Laboratory': '#ec4899',
      'Radiology': '#06b6d4',
      'Admission': '#ef4444',
      'Ward': '#f97316',
      'Operation': '#dc2626',
      'Pharmacy': '#10b981',
      'Billing': '#6366f1',
      'Completed': '#22c55e',
      'Cancelled': '#6b7280'
    };
    return colorMap[status] || '#6b7280';
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return registrations;
    const term = searchTerm.toLowerCase();
    return registrations.filter(
      (r) => {
        const fullName = getPatientFullName(r.patient).toLowerCase();
        const mobile = r.patient?.mobile?.toLowerCase() || '';
        const visitNum = r.visit_number?.toLowerCase() || '';
        return fullName.includes(term) || mobile.includes(term) || visitNum.includes(term);
      }
    );
  }, [registrations, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const currentRows = filteredRows.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const PrintContent = () => {
    if (!printData) return null;
    const patient = printData.patient || {};
    const department = departments.find(d => d.id === printData.department_id);
    const doctorName = printData.doctor_id ? getDoctorName(printData.doctor_id) : "-";
    
    return (
      <div ref={printRef} style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        direction: 'rtl',
        backgroundColor: '#ffffff',
        color: '#1a1a2e',
        width: '280px',
        fontSize: '11px',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(37, 99, 235, 0.1)',
        border: '2px solid #2563eb',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          textAlign: 'center',
          borderBottom: '3px solid #2563eb',
          paddingBottom: '12px',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          margin: '-20px -20px 12px -20px',
          padding: '16px 20px 12px 20px',
          borderRadius: '10px 10px 0 0',
          color: 'white'
        }}>
          <h3 style={{
            margin: '0',
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            🏥 رسید مراجعه
          </h3>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: '500'
          }}>
            شماره: {printData.visit_number || '-'}
          </p>
          {printData.queue_number && (
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '11px',
              color: '#fcd34d',
              fontWeight: 'bold',
              backgroundColor: 'rgba(0,0,0,0.2)',
              display: 'inline-block',
              padding: '2px 12px',
              borderRadius: '12px'
            }}>
              🎫 شماره صف: {printData.queue_number}
            </p>
          )}
        </div>
        
        <div style={{
          marginBottom: '10px',
          padding: '10px 12px',
          backgroundColor: '#f0f5ff',
          borderRadius: '8px',
          border: '1px solid #dbeafe'
        }}>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>نام مریض:</strong>
            <span style={{ color: '#1a1a2e' }}>{getPatientFullName(patient)}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>نام پدر:</strong>
            <span>{patient.father_name || '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>شماره تماس:</strong>
            <span dir="ltr">{patient.mobile || '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>شماره تذکره:</strong>
            <span>{patient.national_id || '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>جنسیت:</strong>
            <span>{patient.gender === 'Male' ? 'مرد' : patient.gender === 'Female' ? 'زن' : patient.gender || '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>سن:</strong>
            <span>{patient.age || '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>گروه خون:</strong>
            <span>{patient.blood_group || '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>آدرس:</strong>
            <span style={{ textAlign: 'left' }}>{patient.address || '-'}</span>
          </p>
        </div>
        
        <div style={{
          borderTop: '2px dashed #2563eb',
          paddingTop: '10px',
          marginTop: '8px',
          padding: '10px 12px',
          backgroundColor: '#f8faff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>بخش:</strong>
            <span>{department ? (departmentNames[department.name] || department.name) : '-'}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>داکتر معالج:</strong>
            <span>{doctorName}</span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>نوع مراجعه:</strong>
            <span>{printData.visit_type || '-'}</span>
          </p>
          {printData.queue_number && (
            <p style={{ 
              margin: '3px 0', 
              display: 'flex', 
              justifyContent: 'space-between',
              backgroundColor: '#fef3c7',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #f59e0b'
            }}>
              <strong style={{ color: '#92400e' }}>🎫 شماره صف:</strong>
              <span style={{ color: '#92400e', fontWeight: 'bold', fontSize: '13px' }}>
                {printData.queue_number}
              </span>
            </p>
          )}
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>وضعیت:</strong>
            <span style={{
              backgroundColor: getStatusColor(printData.visit_status),
              color: 'white',
              padding: '1px 10px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '600'
            }}>
              {getStatusText(printData.visit_status)}
            </span>
          </p>
          <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#2563eb' }}>تاریخ مراجعه:</strong>
            <span>{printData.visit_date ? new Date(printData.visit_date).toLocaleDateString('fa-IR') : '-'}</span>
          </p>
          <p style={{
            margin: '6px 0 3px 0',
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: '#dbeafe',
            padding: '6px 10px',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            <strong style={{ color: '#1d4ed8' }}>💰 فیس مراجعه:</strong>
            <span style={{ color: '#1d4ed8', fontSize: '13px' }}>
              {Number(printData.registration_fee || 0).toFixed(2)} افغانی
            </span>
          </p>
          {printData.diagnosis && (
            <p style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: '#2563eb' }}>تشخیص:</strong>
              <span style={{ textAlign: 'left' }}>{printData.diagnosis}</span>
            </p>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3px 10px',
            marginTop: '4px'
          }}>
            {printData.weight && (
              <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#2563eb' }}>وزن:</strong>
                <span>{printData.weight} کیلوگرم</span>
              </p>
            )}
            {printData.blood_pressure && (
              <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#2563eb' }}>فشار خون:</strong>
                <span>{printData.blood_pressure}</span>
              </p>
            )}
            {printData.temperature && (
              <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#2563eb' }}>حرارت:</strong>
                <span>{printData.temperature}°</span>
              </p>
            )}
            {printData.oxygen && (
              <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#2563eb' }}>اکسیجن:</strong>
                <span>{printData.oxygen}%</span>
              </p>
            )}
          </div>
          {printData.note && (
            <p style={{ margin: '4px 0 0 0', display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: '#2563eb' }}>یادداشت:</strong>
              <span style={{ textAlign: 'left' }}>{printData.note}</span>
            </p>
          )}
        </div>
        
        <div style={{
          textAlign: 'center',
          borderTop: '2px solid #2563eb',
          paddingTop: '8px',
          marginTop: '10px',
          fontSize: '8px',
          color: '#64748b'
        }}>
          <p style={{ margin: '0' }}>
            🖨️ تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} - {new Date().toLocaleTimeString('fa-IR')}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '7px', color: '#94a3b8' }}>
            سیستم مدیریت بهداشت و درمان
          </p>
        </div>
      </div>
    );
  };

  // ============ رندر تب‌های اصلی ============
  const renderMainTabs = () => {
    const tabs = [
      { key: 'registration', label: '📋 ثبت مراجعه', icon: '📋' },
      { key: 'laboratory', label: '🔬 فیس لابراتوار', icon: '🔬' },
      { key: 'radiology', label: '📷 فیس رادیولوژی', icon: '📷' },
      { key: 'operation', label: '🔪 فیس عملیات', icon: '🔪' },
      { key: 'admission', label: '🏥 فیس بستری', icon: '🏥' },
      { key: 'prescription', label: '💊 فیس نسخه', icon: '💊' }
    ];

    return (
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        borderBottom: '2px solid #374151',
        paddingBottom: '10px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveMainTab(tab.key)}
            style={{
              padding: '10px 25px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeMainTab === tab.key ? '#2563eb' : '#1f2937',
              color: activeMainTab === tab.key ? 'white' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeMainTab === tab.key ? 'bold' : 'normal',
              transition: 'all 0.3s',
              borderBottom: activeMainTab === tab.key ? '3px solid #60a5fa' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    );
  };

  // ============ رندر محتوای تب‌ها ============
  const renderMainContent = () => {
    switch (activeMainTab) {
      case 'registration':
        return renderRegistrationTab();
      case 'laboratory':
        return <LaboratoryFeeTab api={api} regId={currentRegId} />;
      case 'radiology':
        return <RadiologyFeeTab api={api} regId={currentRegId} />;
      case 'operation':
        return <OperationFeeTab api={api} regId={currentRegId} />;
      case 'admission':
        return <AdmissionFeeTab api={api} regId={currentRegId} />;
      case 'prescription':
        return <PrescriptionFeeTab api={api} regId={currentRegId} />;
      default:
        return null;
    }
  };

  // ============ رندر تب ثبت مراجعه ============
  const renderRegistrationTab = () => {
    return (
      <>
        {/* آمار */}
        {statistics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#1f2937',
            borderRadius: '8px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{statistics.total_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>مجموع مراجعات</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{statistics.today_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>مراجعات امروز</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{statistics.waiting_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>در انتظار</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{statistics.doctor_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>نزد داکتر</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{statistics.examining_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>در حال معاینه</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ec4899' }}>{statistics.laboratory_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>لابراتوار</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#06b6d4' }}>{statistics.radiology_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>رادیولوژی</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{statistics.admission_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>بستری</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>{statistics.ward_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>بخش بستری</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>{statistics.operation_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>اتاق عمل</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{statistics.pharmacy_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>دواخانه</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366f1' }}>{statistics.billing_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>حسابداری</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{statistics.completed_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>تکمیل شده</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>{statistics.cancelled_patients || 0}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>لغو شده</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ec4899' }}>{statistics.total_fees?.toFixed(2) || '0'}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>مجموع فیس</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{statistics.today_fees?.toFixed(2) || '0'}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>فیس امروز</div>
            </div>
          </div>
        )}

        {/* فرم ثبت مراجعه */}
        <div className="form-container">
          <h2 style={{ textAlign: "center" }}>
            {editingId ? "ویرایش مراجعه و اطلاعات مریض" : "ثبت مراجعه جدید"}
          </h2>

          <form onSubmit={handleSubmit} className="form-grid">
            {/* بخش جستجوی مریض */}
            <div style={{ 
              gridColumn: '1 / -1', 
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ color: '#60a5fa' }}>🔍 جستجوی مریض از سیستم</h4>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingId) {
                      setShowNewPatientForm(!showNewPatientForm);
                      setSearchResults([]);
                      setShowSearchResults(false);
                    } else {
                      toast.warning("⚠️ در حالت ویرایش نمی‌توان مریض جدید ثبت کرد");
                    }
                  }}
                  style={{
                    backgroundColor: showNewPatientForm ? '#dc2626' : '#22c55e',
                    color: 'white',
                    padding: '5px 15px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: editingId ? 'not-allowed' : 'pointer',
                    opacity: editingId ? 0.5 : 1,
                    fontSize: '13px'
                  }}
                  disabled={editingId}
                >
                  {showNewPatientForm ? '✕ بستن' : '+ ثبت مریض جدید'}
                </button>
              </div>

              {showNewPatientForm && (
                <div style={{
                  marginBottom: '15px',
                  padding: '15px',
                  backgroundColor: '#1a2a3a',
                  borderRadius: '8px',
                  border: '1px solid #374151'
                }}>
                  <h5 style={{ color: '#34d399', marginBottom: '10px' }}>
                    {editingId ? "✏️ ویرایش اطلاعات مریض" : "📝 ثبت مریض جدید"}
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>نام *</label>
                      <input
                        type="text"
                        name="new_first_name"
                        value={form.new_first_name}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="نام..."
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>نام خانوادگی *</label>
                      <input
                        type="text"
                        name="new_last_name"
                        value={form.new_last_name}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="نام خانوادگی..."
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>نام پدر</label>
                      <input
                        type="text"
                        name="new_father_name"
                        value={form.new_father_name}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="نام پدر..."
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>شماره تماس</label>
                      <input
                        type="text"
                        name="new_mobile"
                        value={form.new_mobile}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="شماره تماس..."
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>شماره تذکره</label>
                      <input
                        type="text"
                        name="new_national_id"
                        value={form.new_national_id}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="شماره تذکره..."
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>جنسیت</label>
                      <select
                        name="new_gender"
                        value={form.new_gender}
                        onChange={handleChange}
                        className="form-control"
                        style={{ fontSize: '14px' }}
                      >
                        <option value="">-- انتخاب --</option>
                        <option value="Male">مرد</option>
                        <option value="Female">زن</option>
                        <option value="other">دیگر</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>سن</label>
                      <input
                        type="number"
                        name="new_age"
                        value={form.new_age}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="سن..."
                        style={{ fontSize: '14px' }}
                        min="0"
                        max="150"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>گروه خون</label>
                      <select
                        name="new_blood_group"
                        value={form.new_blood_group}
                        onChange={handleChange}
                        className="form-control"
                        style={{ fontSize: '14px' }}
                      >
                        <option value="">-- انتخاب --</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>آدرس</label>
                      <textarea
                        name="new_address"
                        value={form.new_address}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="آدرس کامل..."
                        style={{ fontSize: '14px' }}
                        rows="2"
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '8px' }}>
                    {editingId ? 
                      "✏️ با کلیک روی دکمه \"تصحیح\"، اطلاعات مریض و مراجعه هر دو بروزرسانی می‌شوند" :
                      "⚠️ با کلیک روی دکمه \"ثبت مراجعه\"، هم مریض جدید و هم مراجعه در یک تراکنش ثبت می‌شود"
                    }
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#9ca3af' }}>شماره تذکره</label>
                  <input
                    type="text"
                    name="search_tazkira"
                    value={form.search_tazkira}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="شماره تذکره..."
                    style={{ fontSize: '14px' }}
                    disabled={editingId}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#9ca3af' }}>نام کامل</label>
                  <input
                    type="text"
                    name="search_name"
                    value={form.search_name}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="نام کامل..."
                    style={{ fontSize: '14px' }}
                    disabled={editingId}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#9ca3af' }}>شماره تماس</label>
                  <input
                    type="text"
                    name="search_phone"
                    value={form.search_phone}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="شماره تماس..."
                    style={{ fontSize: '14px' }}
                    disabled={editingId}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={searchExistingPatients}
                  disabled={searching || editingId}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: (searching || editingId) ? 'not-allowed' : 'pointer',
                    opacity: (searching || editingId) ? 0.6 : 1
                  }}
                >
                  {searching ? 'در حال جستجو...' : 'جستجو'}
                </button>
                <button
                  type="button"
                  onClick={clearSearchFields}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  disabled={editingId}
                >
                  پاک کردن
                </button>
              </div>

              {showSearchResults && searchResults.length > 0 && !editingId && (
                <div style={{
                  marginTop: '10px',
                  backgroundColor: '#ffffff',
                  borderRadius: '5px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  border: '1px solid #d1d5db'
                }}>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#1f2937' }}>نام</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#1f2937' }}>شماره تذکره</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#1f2937' }}>شماره تماس</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#1f2937' }}>عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((patient) => (
                        <tr key={patient.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px', color: '#1f2937' }}>
                            {patient.first_name} {patient.last_name}
                          </td>
                          <td style={{ padding: '8px', color: '#1f2937' }}>{patient.national_id || '-'}</td>
                          <td style={{ padding: '8px', color: '#1f2937' }}>{patient.mobile || '-'}</td>
                          <td style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() => selectExistingPatient(patient)}
                              style={{
                                backgroundColor: '#22c55e',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              انتخاب
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {showSearchResults && searchResults.length === 0 && !editingId && (
                <div style={{ marginTop: '10px', color: '#9ca3af', textAlign: 'center' }}>
                  هیچ مریضی یافت نشد
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                {editingId ? 
                  "✏️ در حالت ویرایش، اطلاعات مریض از فیلدهای زیر قابل تغییر است" :
                  "💡 جستجو در هر دو جدول مریض‌ها و رجستریشن‌ها انجام می‌شود"
                }
              </div>
              
              {selectedPatient && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#065f46',
                  borderRadius: '5px',
                  border: '1px solid #22c55e'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#22c55e' }}>مریض انتخاب شده:</strong>
                      <span style={{ color: 'white', marginRight: '10px' }}>
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        {selectedPatient.national_id && `| تذکره: ${selectedPatient.national_id}`}
                        {selectedPatient.mobile && `| تماس: ${selectedPatient.mobile}`}
                      </span>
                    </div>
                    {!editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setForm(prev => ({ ...prev, patient_id: "" }));
                        }}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '2px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
              <hr style={{ borderColor: '#374151' }} />
              <h4 style={{ margin: '10px 0', color: '#60a5fa' }}>🔄 اطلاعات مراجعه</h4>
            </div>

            <div>
              <label>بخش</label>
              <select
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">-- انتخاب بخش --</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {departmentNames[dep.name] || dep.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>داکتر معالج</label>
              <select
                name="doctor_id"
                value={form.doctor_id}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">-- انتخاب داکتر --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name || doc.full_name || `داکتر ${doc.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>نوع مراجعه</label>
              <select
                name="visit_type"
                value={form.visit_type}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">-- انتخاب --</option>
                <option value="OPD">OPD</option>
                <option value="IPD">IPD</option>
                <option value="Emergency">Emergency</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Pharmacy">Pharmacy</option>
              </select>
            </div>

            <div>
              <label>وضعیت مراجعه</label>
              <select
                name="visit_status"
                value={form.visit_status}
                onChange={handleChange}
                className="form-control"
              >
                <option value="Waiting">در انتظار</option>
                <option value="Doctor">نزد داکتر</option>
                <option value="Examining">در حال معاینه</option>
                <option value="Laboratory">لابراتوار</option>
                <option value="Radiology">رادیولوژی</option>
                <option value="Admission">بستری</option>
                <option value="Ward">بخش بستری</option>
                <option value="Operation">اتاق عمل</option>
                <option value="Pharmacy">دواخانه</option>
                <option value="Billing">حسابداری</option>
                <option value="Completed">تکمیل شده</option>
                <option value="Cancelled">لغو شده</option>
              </select>
            </div>

            <div>
              <label>تاریخ مراجعه</label>
              <input
                type="date"
                name="visit_date"
                value={form.visit_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div>
              <label>فیس مراجعه (افغانی) *</label>
              <input
                type="number"
                step="0.01"
                name="registration_fee"
                value={form.registration_fee}
                onChange={handleChange}
                className="form-control"
                placeholder="مبلغ فیس مراجعه"
                min="0"
                required
              />
            </div>

            <div>
              <label>تشخیص</label>
              <textarea
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="تشخیص اولیه"
              />
            </div>

            <div>
              <label>وزن (کیلوگرم)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={form.weight}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 70.5"
                min="0"
                max="300"
              />
            </div>

            <div>
              <label>فشار خون</label>
              <input
                type="text"
                name="blood_pressure"
                value={form.blood_pressure}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 120/80"
              />
            </div>

            <div>
              <label>حرارت (درجه سانتی‌گراد)</label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                value={form.temperature}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 36.5"
                min="30"
                max="45"
              />
            </div>

            <div>
              <label>اکسیجن (%)</label>
              <input
                type="number"
                name="oxygen"
                value={form.oxygen}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 98"
                min="0"
                max="100"
              />
            </div>

            <div className="full-width">
              <label>یادداشت</label>
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="یادداشت‌های اضافی"
              />
            </div>

            <div className="full-width center" style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button 
                type="submit" 
                className="edit" 
                style={{ backgroundColor: editingId ? "#ffc107" : "#2563eb" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "در حال ثبت..." : (editingId ? "تصحیح مراجعه و مریض" : "ثبت مراجعه")}
              </button>

              {editingId && (
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  style={{
                    backgroundColor: "#6c757d",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  انصراف
                </button>
              )}
            </div>

            <div style={{ 
              gridColumn: '1 / -1', 
              fontSize: '13px', 
              color: '#9ca3af', 
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#1e293b',
              borderRadius: '5px',
              marginTop: '5px'
            }}>
              {editingId ? 
                "✏️ با کلیک روی دکمه \"تصحیح مراجعه و مریض\"، هم اطلاعات مراجعه و هم اطلاعات مریض بروزرسانی می‌شوند" :
                "ℹ️ تمام اطلاعات (مریض جدید و مراجعه) در یک تراکنش از طریق دکمه \"ثبت مراجعه\" ارسال می‌شود"
              }
            </div>
          </form>
        </div>

        {/* لیست مراجعات */}
        <div className="form-container mt-10">
          <h3 style={{ textAlign: "center" }}>لیست مراجعات ثبت شده</h3>
          <div className="mb-3">
            <input
              type="text"
              placeholder="جستجو بر اساس نام مریض، شماره تماس یا شماره مراجعه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-white border-collapse" style={{ minWidth: '1200px' }}>
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-3 py-2 text-right" style={{ minWidth: '80px' }}>شناسه</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '150px' }}>نام مریض</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>نام پدر</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>شماره تماس</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>شماره مراجعه</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>بخش</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>داکتر معالج</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '100px' }}>وضعیت</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '100px' }}>نوع مراجعه</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '100px' }}>فیس (افغانی)</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>وضعیت پرداخت</th>
                  <th className="px-3 py-2 text-right" style={{ minWidth: '240px' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '20px' }}>
                      در حال بارگذاری...
                    </td>
                  </tr>
                ) : currentRows.length > 0 ? (
                  currentRows.map((r) => {
                    const patient = r.patient || {};
                    const department = departments.find((d) => d.id === r.department_id);
                    const doctorName = r.doctor_id ? getDoctorName(r.doctor_id) : "-";
                    
                    const isFinalStatus = ['Doctor', 'Completed', 'Cancelled', 'Admission', 'Ward', 'Operation'].includes(r.visit_status);
                    
                    return (
                      <tr key={r.reg_id} className="hover:bg-gray-800 transition-colors border-t border-gray-700">
                        <td className="px-3 py-2 text-center">{r.reg_id}</td>
                        <td className="px-3 py-2">{getPatientFullName(patient)}</td>
                        <td className="px-3 py-2">{patient.father_name || "-"}</td>
                        <td className="px-3 py-2 dir-ltr">{patient.mobile || "-"}</td>
                        <td className="px-3 py-2 text-center">{r.visit_number || "-"}</td>
                        <td className="px-3 py-2">{department?.name || "-"}</td>
                        <td className="px-3 py-2">{doctorName}</td>
                        <td className="px-3 py-2">
                          <span style={{
                            backgroundColor: getStatusColor(r.visit_status),
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {getStatusText(r.visit_status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">{r.visit_type || "-"}</td>
                        <td className="px-3 py-2 text-center">{Number(r.registration_fee || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">{getPaymentStatus(r)}</td>
                        <td className="px-3 py-2">
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            <button
                              onClick={() => handleEdit(r)}
                              style={{
                                backgroundColor: "#cba81b",
                                color: "#000",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              تصحیح
                            </button>

                            <button
                              onClick={() => handleDelete(r.reg_id)}
                              style={{
                                backgroundColor: "#dc2626",
                                color: "#fff",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              حذف
                            </button>

                            <button
                              onClick={() => openPrintModal(r)}
                              style={{
                                backgroundColor: "#059669",
                                color: "#fff",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              🖨️ پرینت
                            </button>

                            {!isFinalStatus && (
                              <button
                                onClick={() => handleSendToDoctorFromList(r)}
                                style={{
                                  backgroundColor: "#8b5cf6",
                                  color: "#fff",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                ارسال به داکتر
                              </button>
                            )}

                            {r.visit_status === 'Doctor' && (
                              <span style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                opacity: 0.7
                              }}>
                                ✅ ارسال شد
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '20px' }}>
                      هیچ مراجعه‌ای ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
              >
                قبلی
              </button>
              <span className="px-4 py-2">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
              >
                بعدی
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <MainLayoutjur>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        limit={5}
        style={{ 
          zIndex: 9999999,
          position: 'fixed',
          top: '20px',
          right: '20px',
          left: 'auto',
          width: 'auto',
          maxWidth: '350px',
          transform: 'none'
        }}
      />

      <PrintContent />

      {showSendModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '90%',
            color: 'white'
          }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>ارسال به داکتر</h3>
            <p style={{ marginBottom: '20px', textAlign: 'center' }}>
              آیا می‌خواهید اطلاعات {selectedRegistration?.patient ? getPatientFullName(selectedRegistration.patient) : ''} را به داکتر مربوطه ارسال کنید؟
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleSendToDoctor}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '10px 30px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                بله، ارسال کن
              </button>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedRegistration(null);
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '10px 30px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-container">
        <h2 style={{ textAlign: "center", marginBottom: "25px", color: "#fff" }}>
          🏥 مدیریت مراجعات و فیس
        </h2>

        {renderMainTabs()}

        {renderMainContent()}
      </div>
    </MainLayoutjur>
  );
}