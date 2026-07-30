import { useState } from "react";
import { toast } from "react-toastify";

export default function RadiologyRequest({ registration, onComplete, onRefresh, api }) {
  const [formData, setFormData] = useState({
    radiology_type: "",
    body_part: "",
    reason: "",
    notes: "",
    priority: "normal"
  });
  const [loading, setLoading] = useState(false);

  const radiologyTypes = [
    { value: "xray", label: "X-Ray (اشعه ایکس)" },
    { value: "ct_scan", label: "CT Scan (سی‌تی اسکن)" },
    { value: "mri", label: "MRI (ام‌آرآی)" },
    { value: "ultrasound", label: "اولتراسوند" },
    { value: "fluoroscopy", label: "فلوروسکوپی" },
    { value: "mammography", label: "ماموگرافی" },
    { value: "angiography", label: "آنژیوگرافی" },
    { value: "echocardiography", label: "اکوکاردیوگرافی" },
    { value: "pet_scan", label: "PET Scan" },
    { value: "bone_density", label: "سنجش تراکم استخوان" },
  ];

  const bodyParts = [
    "سر", "گردن", "سینه", "شکم", "لگن", "کمر", "ستون فقرات",
    "دست چپ", "دست راست", "پای چپ", "پای راست", "زانو", "شانه", "مچ پا", "مچ دست"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.radiology_type) {
      toast.warning("⚠️ لطفاً نوع رادیولوژی را انتخاب کنید");
      return;
    }

    if (!formData.body_part) {
      toast.warning("⚠️ لطفاً بخش مورد نظر را مشخص کنید");
      return;
    }

    if (!formData.reason) {
      toast.warning("⚠️ لطفاً دلیل درخواست را وارد کنید");
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

      const response = await api.post("/doctor/radiology-request", payload);
      
      if (response.data?.success) {
        toast.success("✅ درخواست رادیولوژی با موفقیت ثبت شد");
        onComplete();
        onRefresh();
      } else {
        toast.error("❌ خطا در ثبت درخواست رادیولوژی");
      }
    } catch (err) {
      console.error("خطا در ثبت درخواست رادیولوژی:", err);
      toast.error("❌ خطا در ثبت درخواست رادیولوژی");
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
      <h3 style={{ color: "#60a5fa", marginBottom: "20px" }}>
        📷 درخواست رادیولوژی
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          {/* نوع رادیولوژی */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              نوع رادیولوژی <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              name="radiology_type"
              value={formData.radiology_type}
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
              <option value="">انتخاب کنید...</option>
              {radiologyTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* بخش بدن */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              بخش مورد نظر <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              name="body_part"
              value={formData.body_part}
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
              <option value="">انتخاب کنید...</option>
              {bodyParts.map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
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

          {/* دلیل درخواست */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              دلیل درخواست <span style={{ color: "#ef4444" }}>*</span>
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
              placeholder="دلیل درخواست رادیولوژی را وارد کنید..."
            />
          </div>

          {/* یادداشت */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              یادداشت
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
              placeholder="یادداشت‌های اضافی..."
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
              backgroundColor: "#8b5cf6",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? "⏳ در حال ثبت..." : "📤 ثبت درخواست"}
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