import { useState, useEffect, useContext } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../../../api";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { useAuth } from "../../../contexts/AuthContext";

const MedicationForm = () => {
  const { user, loading } = useAuth(); // دریافت اطلاعات کاربر و وضعیت لودینگ

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medications, setMedications] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [formData, setFormData] = useState({
    category_id: "",
    supplier_id: "",
    type: "",
    gen_name: "",
    dosage: "",
  });

  // نمایش لودینگ تا زمانی که اطلاعات کاربر دریافت نشده
  if (loading) {
    return <div>در حال بارگذاری...</div>;
  }

 const hasAccess = (() => {
  if (!user) return false;
  // اگر role مستقیماً یک رشته باشد
  if (user.role === "user") return true;
  // اگر roles آرایه‌ای از نام‌ها باشد
  if (Array.isArray(user.roles) && user.roles.includes("user")) return true;
  // اگر roles آرایه‌ای از اشیاء دارای name باشد
  if (Array.isArray(user.roles) && user.roles.some(r => r.name === "user")) return true;
  return false;
})();
 

  useEffect(() => {
    if (hasAccess) {
      loadCategories();
      loadSuppliers();
      loadMedications();
    }
  }, [hasAccess]);

  const loadCategories = async () => {
    try {
      const res = await api.get("/categories");
      const data = res.data.data ?? res.data ?? [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      toast.error("❌ خطا در دریافت کتگوری‌ها");
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get("/registrations");
      const data = res.data.data ?? res.data ?? [];
      const onlySuppliers = Array.isArray(data)
        ? data.filter(r => r.reg_type === "supplier")
        : [];
      setSuppliers(onlySuppliers);
    } catch {
      toast.error("❌ خطا در دریافت حمایت‌کننده‌ها");
    }
  };

  const loadMedications = async () => {
    try {
      const res = await api.get("/medications");
      setMedications(res.data ?? []);
    } catch {
      toast.error("❌ خطا در دریافت دواها");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        const res = await api.put(`/medications/${editingId}`, formData);
        toast.success(res.data?.message || "✅ دوا با موفقیت تصحیح شد");
      } else {
        const res = await api.post("/medications", formData);
        toast.success(res.data?.message || "✅ دوا با موفقیت ثبت شد");
      }

      setFormData({
        category_id: "",
        supplier_id: "",
        type: "",
        gen_name: "",
        dosage: "",
      });

      setEditingId(null);
      loadMedications();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "❌ خطا در ثبت دوا"
      );
    }
  };

  const handleEdit = (med) => {
    setFormData({
      category_id: med.category_id,
      supplier_id: med.supplier_id,
      type: med.type,
      gen_name: med.gen_name,
      dosage: med.dosage,
    });
    setEditingId(med.med_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      category_id: "",
      supplier_id: "",
      type: "",
      gen_name: "",
      dosage: "",
    });
    toast.info("✏️ ویرایش لغو شد");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("آیا مطمئن هستید؟")) return;

    try {
      const res = await api.delete(`/medications/${id}`);
      toast.success(res.data?.message || "✅ دوا حذف شد");
      loadMedications();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "❌ خطا در حذف دوا"
      );
    }
  };

  const totalPages = Math.ceil(medications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = medications.slice(startIndex, startIndex + itemsPerPage);

  if (!hasAccess) {
    return (
      <MainLayoutjur>
        <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "red" }}>
          ⛔ شما دسترسی لازم برای مشاهده این صفحه را ندارید.
        </div>
      </MainLayoutjur>
    );
  }

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

      <div className="form-container">
        <h2 style={{ textAlign: "center" }}>
          {editingId ? "ویرایش دوا" : "فرم ثبت دوا"}
        </h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label>انتخاب کتگوری</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="">انتخاب کتگوری</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>انتخاب حمایت‌کننده</label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              required
            >
              <option value="">انتخاب حمایت‌کننده</option>
              {suppliers.map(s => (
                <option key={s.reg_id} value={s.reg_id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>نوعیت</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">انتخاب نوع دوا</option>
              <option value="شربت">شربت</option>
              <option value="تابلیت">تابلیت</option>
              <option value="سیروم">سیروم</option>
              <option value="پودر">پودر</option>
              <option value="کپسول">کپسول</option>
              <option value="کریم">کریم</option>
            </select>
          </div>

          <div>
            <label>نام عمومی دوا</label>
            <input
              type="text"
              name="gen_name"
              value={formData.gen_name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>مقدار مصرف</label>
            <input
              type="text"
              name="dosage"
              value={formData.dosage}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ gridColumn: "1 / span 2", textAlign: "center", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button 
              type="submit" 
              className="edit"
              style={{ 
                backgroundColor: editingId ? "#ffc107" : "#2563eb",
                margin: 0
              }}
            >
              {editingId ? "تصحیح دوا" : "ثبت دوا"}
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
        <h3 style={{ textAlign: "center" }}>لیست دواها</h3>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th>نام دوا</th>
              <th>نوع</th>
              <th>دوز</th>
              <th>کتگوری</th>
              <th>حمایت‌کننده</th>
              <th>عملیات</th>
             </tr>
          </thead>
          <tbody>
            {currentItems.length ? (
              currentItems.map(m => (
                <tr key={m.med_id}>
                  <td>{m.gen_name}</td>
                  <td>{m.type}</td>
                  <td>{m.dosage}</td>
                  <td>{m.category?.category_name || "-"}</td>
                  <td>{m.supplier?.full_name || "-"}</td>
                  <td style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => handleEdit(m)}
                      style={{
                        backgroundColor: "#facc15",
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
                      onClick={() => handleDelete(m.med_id)}
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
                  هیچ دوا ثبت نشده است
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ marginTop: "15px", textAlign: "center" }}>
            <button
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={currentPage === 1}
              style={{ 
                marginRight: "10px",
                padding: "5px 15px",
                backgroundColor: currentPage === 1 ? "#ccc" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              قبلی
            </button>

            <span style={{ margin: "0 10px" }}>
              صفحه {currentPage} از {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage === totalPages}
              style={{ 
                marginLeft: "10px",
                padding: "5px 15px",
                backgroundColor: currentPage === totalPages ? "#ccc" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
              }}
            >
              بعدی
            </button>
          </div>
        )}
      </div>
    </MainLayoutjur>
  );
};

export default MedicationForm;