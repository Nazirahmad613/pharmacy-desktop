import { useState, useEffect, useMemo } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";

export default function RegistrationForm() {
  const { api } = useAuth();

  const [form, setForm] = useState({
    reg_type: "",
    full_name: "",
    father_name: "",
    phone: "",
    gender: "",
    age: "",
    blood_group: "",
    address: "",
    visit_date: "",
    note: "",
    department_id: "",
    patient_id: "",
    doctor_id: "",
    visit_number: "",
    visit_type: "",
    queue_number: "",
    visit_status: "Waiting",
    diagnosis: "",
    weight: "",
    blood_pressure: "",
    temperature: "",
    oxygen: "",
  });

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deptRes, docRes, patientRes] = await Promise.all([
          api.get("/departments"),
          api.get("/users/doctors"), // تغییر: endpoint مخصوص داکترها
          api.get("/patients")
        ]);
        
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.data || []);
        
        // اطمینان از اینکه فقط داکترها نمایش داده می‌شوند
        let doctorsData = Array.isArray(docRes.data) ? docRes.data : docRes.data.data || [];
        // اگر داده‌ها شامل role باشند، فیلتر می‌کنیم
        if (doctorsData.length > 0 && doctorsData[0].role) {
          doctorsData = doctorsData.filter(user => user.role === 'doctor' || user.role === 'Doctor');
        }
        setDoctors(doctorsData);
        
        setPatients(Array.isArray(patientRes.data) ? patientRes.data : patientRes.data.data || []);
      } catch (err) {
        console.error("خطا در بارگذاری داده‌ها:", err);
        setDepartments([]);
        setDoctors([]);
        setPatients([]);
        
        // اگر endpoint اولیه خطا داد، تلاش با endpoint جایگزین
        try {
          const fallbackRes = await api.get("/users?role=doctor");
          const fallbackData = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data.data || [];
          setDoctors(fallbackData);
        } catch (fallbackErr) {
          console.error("خطا در بارگذاری داکترها با endpoint جایگزین:", fallbackErr);
        }
      }
    };
    fetchInitialData();
    fetchRegistrations();
  }, [api]);

  const fetchRegistrations = async () => {
    try {
      const res = await api.get("/registrations");
      const regs = Array.isArray(res.data) ? res.data : res.data.data || [];
      setRegistrations(regs.reverse());
      setCurrentPage(1);
    } catch (err) {
      console.error("خطا در دریافت رجستریشن‌ها:", err);
      setRegistrations([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation based on backend rules
    if (!form.reg_type || !form.full_name) {
      toast.error("❌ نوع راجستریشن و نام کامل الزامی است");
      setIsSubmitting(false);
      return;
    }

    // Reg type validation
    const validRegTypes = ['patient', 'doctor', 'visitor', 'laboratory', 'transport', 'consultation'];
    if (!validRegTypes.includes(form.reg_type)) {
      toast.error("❌ نوع راجستریشن نامعتبر است");
      setIsSubmitting(false);
      return;
    }

    // Gender validation
    if (form.gender && !['male', 'female', 'other'].includes(form.gender)) {
      toast.error("❌ جنسیت نامعتبر است");
      setIsSubmitting(false);
      return;
    }

    // Age validation
    if (form.age && (parseInt(form.age) < 0 || parseInt(form.age) > 150)) {
      toast.error("❌ سن باید بین 0 تا 150 باشد");
      setIsSubmitting(false);
      return;
    }

    // Weight validation
    if (form.weight && (parseFloat(form.weight) < 0 || parseFloat(form.weight) > 300)) {
      toast.error("❌ وزن باید بین 0 تا 300 کیلوگرم باشد");
      setIsSubmitting(false);
      return;
    }

    // Temperature validation
    if (form.temperature && (parseFloat(form.temperature) < 30 || parseFloat(form.temperature) > 45)) {
      toast.error("❌ حرارت باید بین 30 تا 45 درجه سانتی‌گراد باشد");
      setIsSubmitting(false);
      return;
    }

    // Oxygen validation
    if (form.oxygen && (parseInt(form.oxygen) < 0 || parseInt(form.oxygen) > 100)) {
      toast.error("❌ اکسیجن باید بین 0 تا 100 درصد باشد");
      setIsSubmitting(false);
      return;
    }

    // Visit type validation
    if (form.visit_type && !['OPD', 'IPD', 'Emergency', 'Laboratory', 'Radiology', 'Pharmacy'].includes(form.visit_type)) {
      toast.error("❌ نوع مراجعه نامعتبر است");
      setIsSubmitting(false);
      return;
    }

    // Visit status validation
    if (form.visit_status && !['Waiting', 'Doctor', 'Laboratory', 'Radiology', 'Pharmacy', 'Completed', 'Cancelled'].includes(form.visit_status)) {
      toast.error("❌ وضعیت مراجعه نامعتبر است");
      setIsSubmitting(false);
      return;
    }

    try {
      const submitData = { ...form };
      
      // Convert empty strings to null for optional fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      let response;
      if (editingId) {
        response = await api.put(`/registrations/${editingId}`, submitData);
        toast.success("✅ معلومات با موفقیت تصحیح شد");
      } else {
        response = await api.post("/registrations", submitData);
        toast.success("✅ ثبت موفقانه انجام شد");
        
        // اگر نوع مریض باشد و داکتر انتخاب شده باشد، پیشنهاد ارسال به داکتر
        if (form.reg_type === 'patient' && form.doctor_id) {
          const newRegistration = response.data.data || response.data;
          setSelectedRegistration(newRegistration);
          setShowSendModal(true);
        }
      }

      setForm({
        reg_type: "",
        full_name: "",
        father_name: "",
        phone: "",
        gender: "",
        age: "",
        blood_group: "",
        address: "",
        visit_date: "",
        note: "",
        department_id: "",
        patient_id: "",
        doctor_id: "",
        visit_number: "",
        visit_type: "",
        queue_number: "",
        visit_status: "Waiting",
        diagnosis: "",
        weight: "",
        blood_pressure: "",
        temperature: "",
        oxygen: "",
      });

      setEditingId(null);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "❌ خطا در ذخیره معلومات");
    } finally {
      setIsSubmitting(false);
    }
  };

  // تابع ارسال به داکتر
  const handleSendToDoctor = async () => {
    if (!selectedRegistration) return;

    try {
      // به‌روزرسانی وضعیت به "Doctor"
      await api.put(`/registrations/${selectedRegistration.reg_id}`, {
        ...selectedRegistration,
        visit_status: 'Doctor'
      });

      // ارسال نوتیفیکیشن به داکتر
      await api.post('/notifications', {
        user_id: selectedRegistration.doctor_id,
        title: 'مریض جدید',
        message: `مریض جدید با نام ${selectedRegistration.full_name} به شما ارجاع داده شد`,
        type: 'new_patient',
        registration_id: selectedRegistration.reg_id
      });

      toast.success(`✅ معلومات به داکتر مورد نظر ارسال شد`);
      setShowSendModal(false);
      setSelectedRegistration(null);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در ارسال به داکتر");
    }
  };

  // تابع ارسال به داکتر از طریق دکمه در لیست
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
        message: `مریض با نام ${registration.full_name} به شما ارجاع داده شد`,
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
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این رجستریشن را حذف کنید؟")) return;

    try {
      await api.delete(`/registrations/${reg_id}`);
      toast.success("✅ حذف موفقانه انجام شد");
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در حذف رجستریشن");
    }
  };

  const handleEdit = (reg) => {
    setForm({ ...reg });
    setEditingId(reg.reg_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      reg_type: "",
      full_name: "",
      father_name: "",
      phone: "",
      gender: "",
      age: "",
      blood_group: "",
      address: "",
      visit_date: "",
      note: "",
      department_id: "",
      patient_id: "",
      doctor_id: "",
      visit_number: "",
      visit_type: "",
      queue_number: "",
      visit_status: "Waiting",
      diagnosis: "",
      weight: "",
      blood_pressure: "",
      temperature: "",
      oxygen: "",
    });
    toast.info("✏️ ویرایش لغو شد");
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return registrations;
    const term = searchTerm.toLowerCase();
    return registrations.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(term) ||
        r.phone?.toLowerCase().includes(term) ||
        r.visit_number?.toLowerCase().includes(term)
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

      {/* Modal برای ارسال به داکتر */}
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
              آیا می‌خواهید اطلاعات {selectedRegistration?.full_name} را به داکتر مربوطه ارسال کنید؟
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
        <h2 style={{ textAlign: "center" }}>
          {editingId ? "ویرایش راجستریشن" : "راجستریشن عمومی شفاخانه"}
        </h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label>نوع راجستریشن *</label>
            <select
              name="reg_type"
              value={form.reg_type}
              onChange={handleChange}
              className="form-control"
              required
            >
              <option value="">-- انتخاب --</option>
              <option value="patient">مریض</option>
              <option value="doctor">داکتر</option>
              <option value="visitor">مراجع</option>
              <option value="laboratory">لابراتوار</option>
              <option value="transport">ترانسپورت</option>
              <option value="consultation">مشاوره</option>
            </select>
          </div>

          <div>
            <label>نام کامل / عنوان *</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="form-control"
              required
            />
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
            <label>مریض</label>
            <select
              name="patient_id"
              value={form.patient_id}
              onChange={handleChange}
              className="form-control"
            >
              <option value="">-- انتخاب مریض --</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name || patient.name || `مریض ${patient.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>نام پدر</label>
            <input
              type="text"
              name="father_name"
              value={form.father_name}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div>
            <label>شماره تماس</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div>
            <label>جنسیت</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="form-control"
            >
              <option value="">-- انتخاب --</option>
              <option value="male">مرد</option>
              <option value="female">زن</option>
              <option value="other">دیگر</option>
            </select>
          </div>

          <div>
            <label>سن</label>
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              className="form-control"
              min="0"
              max="150"
            />
          </div>

          <div>
            <label>گروه خون</label>
            <select
              name="blood_group"
              value={form.blood_group}
              onChange={handleChange}
              className="form-control"
            >
              <option value="">-- انتخاب گروه خون --</option>
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

          {/* Medical fields - conditionally shown for patients */}
          {(form.reg_type === "patient") && (
            <>
              <div>
                <label>تشخیص</label>
                <textarea
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  className="form-control"
                  rows="2"
                  placeholder="تشخیص اولیه (اختیاری)"
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
            </>
          )}

          <div className="full-width">
            <label>آدرس</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              className="form-control"
              rows="3"
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
            />
          </div>

          <div className="full-width center" style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button 
              type="submit" 
              className="edit" 
              style={{ backgroundColor: editingId ? "#ffc107" : "#2563eb" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "در حال ثبت..." : (editingId ? "تصحیح" : "ثبت راجستریشن")}
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
        </form>
      </div>

      <div className="form-container mt-10">
        <h3 style={{ textAlign: "center" }}>لیست مراجعه‌های ثبت شده</h3>
        <div className="mb-3">
          <input
            type="text"
            placeholder="جستجو بر اساس نام، شماره تماس یا شماره مراجعه..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
          />
        </div>
        <table className="w-full text-white border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th>نام کامل</th>
              <th>نوع</th>
              <th>شماره تماس</th>
              <th>بخش</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length ? (
              currentRows.map((r) => (
                <tr key={r.reg_id} className="hover:bg-gray-800 transition-colors">
                  <td>{r.full_name || "-"}</td>
                  <td>{r.reg_type || "-"}</td>
                  <td>{r.phone || "-"}</td>
                  <td>
                    {departments.find((d) => d.id === r.department_id)?.name || "-"}
                  </td>
                  <td>
                    <span style={{
                      backgroundColor: 
                        r.visit_status === 'Completed' ? '#22c55e' :
                        r.visit_status === 'Cancelled' ? '#dc2626' :
                        r.visit_status === 'Doctor' ? '#8b5cf6' :
                        r.visit_status === 'Waiting' ? '#f59e0b' : '#3b82f6',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px'
                    }}>
                      {r.visit_status || "-"}
                    </span>
                  </td>
                  <td className="flex gap-1" style={{ flexWrap: 'wrap', gap: '5px' }}>
                    <button
                      onClick={() => handleEdit(r)}
                      style={{
                        backgroundColor: "#cba81b",
                        color: "#000",
                        padding: "5px 10px",
                        borderRadius: "5px",
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
                        padding: "5px 10px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      حذف
                    </button>

                    {/* دکمه ارسال به داکتر - فقط برای مریض‌ها */}
                    {r.reg_type === 'patient' && r.visit_status !== 'Doctor' && r.visit_status !== 'Completed' && (
                      <button
                        onClick={() => handleSendToDoctorFromList(r)}
                        style={{
                          backgroundColor: "#8b5cf6",
                          color: "#fff",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        ارسال به داکتر
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  نتیجه‌ای یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
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