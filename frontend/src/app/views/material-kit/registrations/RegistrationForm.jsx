import { useState, useEffect, useMemo } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";

export default function RegistrationForm() {
  const { api } = useAuth();

  const [form, setForm] = useState({
    patient_id: "",
    department_id: "",
    doctor_id: "",
    visit_number: "",
    visit_type: "",
    queue_number: "",
    registration_fee: "",
    visit_status: "Waiting",
    diagnosis: "",
    weight: "",
    blood_pressure: "",
    temperature: "",
    oxygen: "",
    visit_date: "",
    note: "",
    // فیلدهای جستجو
    search_tazkira: "",
    search_name: "",
    search_phone: "",
    // فیلدهای ثبت مریض جدید - اینها برای ارسال به بک‌اند هستند
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

  // اطلاعات مریض انتخاب شده برای نمایش در فرم
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
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const ROWS_PER_PAGE = 10;

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
    } catch (err) {
      console.error("خطا در دریافت مریض‌ها:", err);
      setRegistrations([]);
      toast.error("خطا در دریافت لیست مریض‌ها");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await api.get("/registrations/statistics");
      setStatistics(res.data);
    } catch (err) {
      console.error("خطا در دریافت آمار:", err);
    }
  };

  const searchExistingPatients = () => {
    const { search_tazkira, search_name, search_phone } = form;

    if (!search_tazkira && !search_name && !search_phone) {
      toast.warning("⚠️ لطفاً حداقل یکی از فیلدهای جستجو را پر کنید");
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);

    try {
      const resultPatients = [];
      const seenPatientIds = new Set();

      patients.forEach((patient) => {
        let match = true;

        if (search_tazkira) {
          const tazkiraMatch = patient.national_id?.toLowerCase().includes(search_tazkira.toLowerCase());
          if (!tazkiraMatch) match = false;
        }

        if (search_name && match) {
          const fullName = (patient.first_name || '') + ' ' + (patient.last_name || '');
          const nameMatch = fullName.toLowerCase().includes(search_name.toLowerCase()) ||
                           patient.first_name?.toLowerCase().includes(search_name.toLowerCase()) ||
                           patient.last_name?.toLowerCase().includes(search_name.toLowerCase());
          if (!nameMatch) match = false;
        }

        if (search_phone && match) {
          const phoneMatch = patient.mobile?.toLowerCase().includes(search_phone.toLowerCase());
          if (!phoneMatch) match = false;
        }

        if (match && !seenPatientIds.has(patient.id)) {
          resultPatients.push(patient);
          seenPatientIds.add(patient.id);
        }
      });

      const regSearchFields = ['visit_number', 'visit_type', 'queue_number', 'diagnosis', 'note'];

      registrations.forEach((reg) => {
        const patient = reg.patient;
        if (!patient) return;

        let match = false;

        if (search_tazkira) {
          for (const field of regSearchFields) {
            const value = reg[field] || '';
            if (value.toLowerCase().includes(search_tazkira.toLowerCase())) {
              match = true;
              break;
            }
          }
          if (!match && patient.national_id?.toLowerCase().includes(search_tazkira.toLowerCase())) {
            match = true;
          }
        }

        if (search_name && !match) {
          for (const field of regSearchFields) {
            const value = reg[field] || '';
            if (value.toLowerCase().includes(search_name.toLowerCase())) {
              match = true;
              break;
            }
          }
          const fullName = (patient.first_name || '') + ' ' + (patient.last_name || '');
          if (!match && (
            fullName.toLowerCase().includes(search_name.toLowerCase()) ||
            patient.first_name?.toLowerCase().includes(search_name.toLowerCase()) ||
            patient.last_name?.toLowerCase().includes(search_name.toLowerCase())
          )) {
            match = true;
          }
        }

        if (search_phone && !match) {
          for (const field of regSearchFields) {
            const value = reg[field] || '';
            if (value.toLowerCase().includes(search_phone.toLowerCase())) {
              match = true;
              break;
            }
          }
          if (!match && patient.mobile?.toLowerCase().includes(search_phone.toLowerCase())) {
            match = true;
          }
        }

        if (match && !seenPatientIds.has(patient.id)) {
          resultPatients.push(patient);
          seenPatientIds.add(patient.id);
        }
      });

      setSearchResults(resultPatients);
      setShowSearchResults(resultPatients.length > 0);

      if (resultPatients.length === 0) {
        toast.info("ℹ️ هیچ مریضی با این مشخصات یافت نشد");
      } else {
        toast.success(`✅ ${resultPatients.length} مریض پیدا شد`);
      }

    } catch (err) {
      console.error(err);
      setSearchResults([]);
      setShowSearchResults(false);
      toast.error("❌ خطا در جستجو");
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
      visit_number: "",
      visit_type: "",
      queue_number: "",
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
      // Validation
      if (!form.patient_id && !showNewPatientForm) {
        toast.error("❌ لطفاً یک مریض را انتخاب کنید یا مریض جدید ثبت کنید");
        setIsSubmitting(false);
        return;
      }

      // اگر مریض جدید است، فیلدهای الزامی را بررسی کن
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

      // ============================================================
      // ساخت داده برای ارسال به بک‌اند
      // ============================================================
      const submitData = { ...form };
      
      // حذف فیلدهای جستجو از داده‌های ارسالی
      delete submitData.search_tazkira;
      delete submitData.search_name;
      delete submitData.search_phone;
      
      // اگر مریض جدید است:
      // 1. patient_id را حذف می‌کنیم تا بک‌اند متوجه شود مریض جدید است
      // 2. فیلدهای new_* را با نام اصلی به بک‌اند می‌فرستیم
      if (showNewPatientForm) {
        delete submitData.patient_id;
        
        // تبدیل فیلدهای new_* به فیلدهای اصلی برای بک‌اند
        submitData.first_name = submitData.new_first_name;
        submitData.last_name = submitData.new_last_name;
        submitData.father_name = submitData.new_father_name || null;
        submitData.mobile = submitData.new_mobile || null;
        submitData.national_id = submitData.new_national_id || null;
        submitData.gender = submitData.new_gender || null;
        submitData.age = submitData.new_age || null;
        submitData.blood_group = submitData.new_blood_group || null;
        submitData.address = submitData.new_address || null;
        
        // حذف فیلدهای new_* از داده ارسالی
        delete submitData.new_first_name;
        delete submitData.new_last_name;
        delete submitData.new_father_name;
        delete submitData.new_mobile;
        delete submitData.new_national_id;
        delete submitData.new_gender;
        delete submitData.new_age;
        delete submitData.new_blood_group;
        delete submitData.new_address;
        
        // اضافه کردن flag برای تشخیص مریض جدید در بک‌اند
        submitData.is_new_patient = true;
      } else {
        // اگر مریض قبلی انتخاب شده، فیلدهای مریض جدید را حذف می‌کنیم
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
      
      // تبدیل رشته‌های خالی به null
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      let response;
      let newRegistration = null;

      if (editingId) {
        response = await api.put(`/registrations/${editingId}`, submitData);
        toast.success("✅ معلومات با موفقیت تصحیح شد");
        newRegistration = response.data?.data || response.data;
      } else {
        
        console.log("NEW PATIENT MODE:", showNewPatientForm);

console.log("NEW PATIENT DATA:", {
    first_name: submitData.new_first_name,
    last_name: submitData.new_last_name,
    mobile: submitData.new_mobile,
    gender: submitData.new_gender
});

console.log("FINAL DATA SEND:", submitData);
        toast.success("✅ مراجعه با موفقیت ثبت شد");
        newRegistration = response.data?.data || response.data;

        // اگر مریض جدید ثبت شده، آن را به لیست اضافه کن
        if (showNewPatientForm && newRegistration?.patient) {
          setPatients(prev => [newRegistration.patient, ...prev]);
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
          console.log(field, messages);
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
      await api.put(`/registrations/${selectedRegistration.reg_id}`, {
        ...selectedRegistration,
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
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در ارسال به داکتر");
    }
  };

  const handleSendToDoctorFromList = async (registration) => {
    if (!registration.doctor_id) {
      toast.warning("⚠️ لطفاً ابتدا داکتر معالج را انتخاب کنید");
      return;
    }

    try {
      await api.put(`/registrations/${registration.reg_id}`, {
        ...registration,
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
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در ارسال به داکتر");
    }
  };

  const handleDelete = async (reg_id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این مراجعه را حذف کنید؟")) return;

    try {
      await api.delete(`/registrations/${reg_id}`);
      toast.success("✅ حذف موفقانه انجام شد");
      fetchRegistrations();
      fetchStatistics();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در حذف مراجعه");
    }
  };

  const handleEdit = (reg) => {
    setForm({ 
      patient_id: reg.patient_id || "",
      department_id: reg.department_id || "",
      doctor_id: reg.doctor_id || "",
      visit_number: reg.visit_number || "",
      visit_type: reg.visit_type || "",
      queue_number: reg.queue_number || "",
      registration_fee: reg.registration_fee || "",
      visit_status: reg.visit_status || "Waiting",
      diagnosis: reg.diagnosis || "",
      weight: reg.weight || "",
      blood_pressure: reg.blood_pressure || "",
      temperature: reg.temperature || "",
      oxygen: reg.oxygen || "",
      visit_date: reg.visit_date || "",
      note: reg.note || "",
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
    setSelectedPatient(reg.patient || null);
    setEditingId(reg.reg_id);
    setSearchResults([]);
    setShowSearchResults(false);
    setShowNewPatientForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      'Laboratory': 'لابراتوار',
      'Radiology': 'رادیولوژی',
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
      'Laboratory': '#3b82f6',
      'Radiology': '#06b6d4',
      'Pharmacy': '#10b981',
      'Billing': '#ec4899',
      'Completed': '#22c55e',
      'Cancelled': '#dc2626'
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

      {statistics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#1f2937',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{statistics.total_patients || 0}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>مجموع مراجعات</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{statistics.today_patients || 0}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>مراجعات امروز</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{statistics.waiting_patients || 0}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>در انتظار</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{statistics.completed_patients || 0}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>تکمیل شده</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ec4899' }}>{statistics.total_fees?.toFixed(2) || '0'}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>مجموع فیس (افغانی)</div>
          </div>
        </div>
      )}

      <div className="form-container">
        <h2 style={{ textAlign: "center" }}>
          {editingId ? "ویرایش مراجعه" : "ثبت مراجعه جدید"}
        </h2>

        <form onSubmit={handleSubmit} className="form-grid">
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
                  setShowNewPatientForm(!showNewPatientForm);
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                style={{
                  backgroundColor: showNewPatientForm ? '#dc2626' : '#22c55e',
                  color: 'white',
                  padding: '5px 15px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
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
                <h5 style={{ color: '#34d399', marginBottom: '10px' }}>📝 ثبت مریض جدید</h5>
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
                      <option value="male">مرد</option>
                      <option value="female">زن</option>
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
                  ⚠️ با کلیک روی دکمه "ثبت مراجعه"، هم مریض جدید و هم مراجعه در یک تراکنش ثبت می‌شود
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
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={searchExistingPatients}
                disabled={searching}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: searching ? 'not-allowed' : 'pointer',
                  opacity: searching ? 0.6 : 1
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
              >
                پاک کردن
              </button>
            </div>

            {showSearchResults && searchResults.length > 0 && (
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
            {showSearchResults && searchResults.length === 0 && (
              <div style={{ marginTop: '10px', color: '#9ca3af', textAlign: 'center' }}>
                هیچ مریضی یافت نشد
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              💡 جستجو در هر دو جدول مریض‌ها و رجستریشن‌ها انجام می‌شود
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
                </div>
              </div>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
            <hr style={{ borderColor: '#374151' }} />
            <h4 style={{ margin: '10px 0', color: '#60a5fa' }}>🔄 اطلاعات مراجعه جدید</h4>
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
                  {dep.name}
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
            <label>شماره مراجعه</label>
            <input
              type="text"
              name="visit_number"
              value={form.visit_number}
              onChange={handleChange}
              className="form-control"
              placeholder="شماره مراجعه"
            />
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
            <label>شماره صف</label>
            <input
              type="number"
              name="queue_number"
              value={form.queue_number}
              onChange={handleChange}
              className="form-control"
              min="1"
              placeholder="شماره صف"
            />
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
              <option value="Laboratory">لابراتوار</option>
              <option value="Radiology">رادیولوژی</option>
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
              {isSubmitting ? "در حال ثبت..." : (editingId ? "تصحیح" : "ثبت مراجعه")}
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
            ℹ️ تمام اطلاعات (مریض جدید و مراجعه) در یک تراکنش از طریق دکمه "ثبت مراجعه" ارسال می‌شود
          </div>
        </form>
      </div>

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
                <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>بخش</th>
                <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>داکتر معالج</th>
                <th className="px-3 py-2 text-right" style={{ minWidth: '100px' }}>وضعیت</th>
                <th className="px-3 py-2 text-right" style={{ minWidth: '100px' }}>نوع مراجعه</th>
                <th className="px-3 py-2 text-right" style={{ minWidth: '100px' }}>فیس (افغانی)</th>
                <th className="px-3 py-2 text-right" style={{ minWidth: '120px' }}>وضعیت پرداخت</th>
                <th className="px-3 py-2 text-right" style={{ minWidth: '180px' }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px' }}>
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : currentRows.length > 0 ? (
                currentRows.map((r) => (
                  <tr key={r.reg_id} className="hover:bg-gray-800 transition-colors border-t border-gray-700">
                    <td className="px-3 py-2 text-center">{r.reg_id}</td>
                    <td className="px-3 py-2">{getPatientFullName(r.patient)}</td>
                    <td className="px-3 py-2">{r.patient?.father_name || "-"}</td>
                    <td className="px-3 py-2 dir-ltr">{r.patient?.mobile || "-"}</td>
                    <td className="px-3 py-2">
                      {departments.find((d) => d.id === r.department_id)?.name || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {r.doctor_id ? getDoctorName(r.doctor_id) : "-"}
                    </td>
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
                    <td className="px-3 py-2 text-center">
                      {r.visit_type || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {Number(r.registration_fee || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {getPaymentStatus(r)}
                    </td>
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

                        {r.visit_status !== 'Doctor' && r.visit_status !== 'Completed' && r.visit_status !== 'Cancelled' && (
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
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px' }}>
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
    </MainLayoutjur>
  );
}