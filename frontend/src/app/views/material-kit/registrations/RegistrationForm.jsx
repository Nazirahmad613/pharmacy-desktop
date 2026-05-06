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
    tazkira_number: "",
    father_name: "",
    phone: "",
    gender: "",
    age: "",
    blood_group: "",
    address: "",
    visit_date: "",
    note: "",
    status: 1,
    department_id: "",
     diagnosis: "",
    weight: "",
    blood_pressure: "",
    temperature: "",
    oxygen: "",
  });

  const [departments, setDepartments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        const deps = Array.isArray(res.data) ? res.data : res.data.data || [];
        setDepartments(deps);
      } catch (err) {
        console.error("خطا در بارگذاری بخش‌ها:", err);
        setDepartments([]);
      }
    };
    fetchDepartments();
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.reg_type || !form.full_name) {
      toast.error("❌ نوع راجستریشن و نام الزامی است");
      return;
    }

    if (form.tazkira_number && !/^\d{4}-\d{4}-\d{5}$/.test(form.tazkira_number)) {
      toast.error("❌ فرمت شماره تذکره معتبر نیست");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/registrations/${editingId}`, form);
        toast.success("✅ معلومات با موفقیت تصحیح شد");
      } else {
        await api.post("/registrations", form);
        toast.success("✅ ثبت موفقانه انجام شد");
      }

      setForm({
        reg_type: "",
        full_name: "",
        tazkira_number: "",
        father_name: "",
        phone: "",
        gender: "",
        age: "",
        blood_group: "",
        address: "",
        visit_date: "",
        note: "",
        status: 1,
        department_id: "",
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
      toast.error("❌ خطا در ذخیره معلومات");
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

  // ✅ تابع جدید برای انصراف از ویرایش
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      reg_type: "",
      full_name: "",
      tazkira_number: "",
      father_name: "",
      phone: "",
      gender: "",
      age: "",
      blood_group: "",
      address: "",
      visit_date: "",
      note: "",
      status: 1,
      department_id: "",
    });
    toast.info("✏️ ویرایش لغو شد");
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return registrations;
    const term = searchTerm.toLowerCase();
    return registrations.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(term) ||
        r.tazkira_number?.toLowerCase().includes(term) ||
        r.phone?.toLowerCase().includes(term)
    );
  }, [registrations, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const currentRows = filteredRows.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  return (
    <MainLayoutjur>
      {/* ✅ ToastContainer با استایل مناسب */}
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
            >
              <option value="">-- انتخاب --</option>
              <optgroup label="اشخاص">
                <option value="patient">مریض</option>
                <option value="doctor">داکتر</option>
                <option value="visitor">مراجع</option>
                <option value="customer">مشتری</option>
                <option value="staff">کارمند</option>
                <option value="supplier">تأمین‌کننده</option>
              </optgroup>
              <optgroup label="مصارف">
                <option value="rent">کرایه</option>
                <option value="electricity">برق</option>
                <option value="water">آب</option>
                <option value="internet">انترنت</option>
                <option value="salary">معاش</option>
                <option value="fuel">سوخت</option>
                <option value="maintenance">ترمیمات</option>
              </optgroup>
              <optgroup label="خدمات">
                <option value="laboratory">لابراتوار</option>
                <option value="transport">ترانسپورت</option>
                <option value="consultation">مشاوره</option>
              </optgroup>
              <optgroup label="دیگر">
                <option value="expense">مصرف عمومی</option>
                <option value="income">درآمد</option>
                <option value="other">سایر</option>
              </optgroup>
            </select>
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
            <label>نام کامل / عنوان *</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div>
            <label>شماره تذکره</label>
            <input
              type="text"
              name="tazkira_number"
              value={form.tazkira_number}
              onChange={handleChange}
              placeholder="مثال: 1300-1105-0000"
              className="form-control"
            />
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
          {form.reg_type === "patient" && (
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

          <div>
            <label>تاریخ مراجعه / مصرف</label>
            <input
              type="date"
              name="visit_date"
              value={form.visit_date}
              onChange={handleChange}
              className="form-control"
            />
          </div>

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
            <button type="submit" className="edit" style={{ backgroundColor: editingId ? "#ffc107" : "#2563eb" }}>
              {editingId ? "تصحیح" : "ثبت راجستریشن"}
            </button>
            
            {/* ✅ دکمه انصراف - فقط در حالت ویرایش نمایش داده می‌شود */}
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
        <h3 style={{ textAlign: "center" }}>لیست حساب‌های ثبت شده</h3>
        <div className="mb-3">
          <input
            type="text"
            placeholder="جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
          />
        </div>
        <table className="w-full text-white border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th>/ عنوان نام کامل</th>
              <th>شماره تذکره</th>
              <th>نوع</th>
              <th>شماره تماس</th>
              <th>بخش</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length ? (
              currentRows.map((r) => (
                <tr key={r.reg_id} className="hover:bg-gray-800 transition-colors">
                  <td>{r.full_name || "-"}</td>
                  <td>{r.tazkira_number || "-"}</td>
                  <td>{r.reg_type || "-"}</td>
                  <td>{r.phone || "-"}</td>
                  <td>
                    {departments.find((d) => d.id === r.department_id)?.name || "-"}
                  </td>
                  <td className="flex gap-1">
                    <button
                      onClick={() => handleEdit(r)}
                      style={{
                        backgroundColor: "#cba81b",
                        color: "#000",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer",
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
                      }}
                    >
                      حذف
                    </button>
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