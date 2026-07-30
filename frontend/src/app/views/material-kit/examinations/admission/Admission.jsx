import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function Admission({ registration, onComplete, onRefresh, api }) {
  const [formData, setFormData] = useState({
    ward_id: "",
    room_number: "",
    bed_number: "",
    admission_type: "emergency",
    diagnosis: "",
    notes: ""
  });
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // دریافت لیست بخش‌ها
  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    setLoadingWards(true);
    try {
      const response = await api.get("/doctor/wards");
      if (response.data?.data) {
        setWards(response.data.data);
      }
    } catch (err) {
      console.error("خطا در دریافت بخش‌ها:", err);
      toast.error("❌ خطا در دریافت لیست بخش‌ها");
    } finally {
      setLoadingWards(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ward_id) {
      toast.warning("⚠️ لطفاً بخش بستری را انتخاب کنید");
      return;
    }

    if (!formData.diagnosis) {
      toast.warning("⚠️ لطفاً تشخیص را وارد کنید");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reg_id: registration.reg_id,
        patient_id: registration.patient_id,
        doctor_id: registration.doctor_id,
        ...formData
      };

      const response = await api.post("/doctor/admission", payload);
      
      if (response.data?.success) {
        toast.success("✅ بیمار با موفقیت بستری شد");
        onComplete();
        onRefresh();
      } else {
        toast.error("❌ خطا در بستری بیمار");
      }
    } catch (err) {
      console.error("خطا در بستری بیمار:", err);
      toast.error("❌ خطا در بستری بیمار");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTreatment = async () => {
    if (!window.confirm("آیا مطمئن هستید که معالجه را ختم کنید؟")) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/doctor/complete/${registration.reg_id}`);
      if (response.data?.message) {
        toast.success("✅ معالجه ختم شد و در تاریخچه ذخیره گردید");
        onComplete();
        onRefresh();
      }
    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error("❌ خطا در ختم معالجه");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ color: "#ef4444", marginBottom: "20px" }}>
        🏥 بستری بیمار
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          {/* بخش بستری */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              بخش بستری <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              name="ward_id"
              value={formData.ward_id}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none"
              }}
              disabled={loadingWards}
            >
              <option value="">انتخاب کنید...</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.name} {ward.code ? `(${ward.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* نوع بستری */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              نوع بستری
            </label>
            <select
              name="admission_type"
              value={formData.admission_type}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none"
              }}
            >
              <option value="emergency">اورژانسی</option>
              <option value="planned">برنامه‌ریزی شده</option>
              <option value="elective">اختیاری</option>
              <option value="transfer">انتقالی</option>
            </select>
          </div>

          {/* شماره اتاق */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              شماره اتاق
            </label>
            <input
              type="text"
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              placeholder="مثلاً: ۲۰۱"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          {/* شماره تخت */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              شماره تخت
            </label>
            <input
              type="text"
              name="bed_number"
              value={formData.bed_number}
              onChange={handleChange}
              placeholder="مثلاً: ۵"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          {/* تشخیص */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              تشخیص <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                resize: "vertical"
              }}
              placeholder="تشخیص اولیه بیمار را وارد کنید..."
            />
          </div>

          {/* یادداشت‌ها */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              یادداشت‌ها
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                resize: "vertical"
              }}
              placeholder="یادداشت‌های اضافی برای بستری..."
            />
          </div>
        </div>

        {/* دکمه‌ها */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 30px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#ef4444",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? "⏳ در حال ثبت..." : "🏥 بستری بیمار"}
          </button>

          <button
            type="button"
            onClick={handleCompleteTreatment}
            disabled={loading}
            style={{
              padding: "10px 30px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#10b981",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1
            }}
          >
            ✅ ختم معالجه
          </button>
        </div>
      </form>
    </div>
  );
}