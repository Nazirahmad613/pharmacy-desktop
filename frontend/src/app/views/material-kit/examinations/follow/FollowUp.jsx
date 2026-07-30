import { useState } from "react";
import { toast } from "react-toastify";

export default function FollowUp({ registration, onComplete, onRefresh, api }) {
  const [formData, setFormData] = useState({
    follow_up_date: "",
    follow_up_time: "",
    reason: "",
    instructions: "",
    priority: "normal"
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.follow_up_date) {
      toast.warning("⚠️ لطفاً تاریخ مراجعه بعدی را انتخاب کنید");
      return;
    }

    if (!formData.reason) {
      toast.warning("⚠️ لطفاً دلیل مراجعه بعدی را وارد کنید");
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

      const response = await api.post("/doctor/follow-up", payload);
      
      if (response.data?.success) {
        toast.success("✅ مراجعه بعدی با موفقیت ثبت شد");
        onComplete();
        onRefresh();
      } else {
        toast.error("❌ خطا در ثبت مراجعه بعدی");
      }
    } catch (err) {
      console.error("خطا در ثبت مراجعه بعدی:", err);
      toast.error("❌ خطا در ثبت مراجعه بعدی");
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
      <h3 style={{ color: "#10b981", marginBottom: "20px" }}>
        📅 مراجعه بعدی (Follow Up)
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          {/* تاریخ مراجعه بعدی */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              تاریخ مراجعه بعدی <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              name="follow_up_date"
              value={formData.follow_up_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
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

          {/* زمان مراجعه بعدی */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              زمان مراجعه بعدی
            </label>
            <input
              type="time"
              name="follow_up_time"
              value={formData.follow_up_time}
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
            />
          </div>

          {/* اولویت */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              اولویت
            </label>
            <select
              name="priority"
              value={formData.priority}
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
              <option value="normal">عادی</option>
              <option value="urgent">فوری</option>
              <option value="emergency">اورژانسی</option>
            </select>
          </div>

          {/* دلیل مراجعه */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              دلیل مراجعه بعدی <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
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
              placeholder="دلیل مراجعه بعدی را وارد کنید..."
            />
          </div>

          {/* دستورالعمل‌ها */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              دستورالعمل‌ها
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
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
              placeholder="دستورالعمل‌های لازم برای مراجعه بعدی..."
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
              backgroundColor: "#10b981",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? "⏳ در حال ثبت..." : "📤 ثبت مراجعه بعدی"}
          </button>

          <button
            type="button"
            onClick={handleCompleteTreatment}
            disabled={loading}
            style={{
              padding: "10px 30px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#3b82f6",
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