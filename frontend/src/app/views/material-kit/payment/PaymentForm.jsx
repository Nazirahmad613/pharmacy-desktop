 import { useEffect, useState } from "react";
import api from "../../../../api";

export default function PaymentForm({ saleId, onSuccess }) {
  const [info, setInfo] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/sales/${saleId}/summary`).then(res => {
      setInfo(res.data);
    });
  }, [saleId]);

  const submit = async () => {
    if (!amount) return alert("مبلغ را وارد کنید");

    setLoading(true);
    try {
      await api.post("/payments", {
        sale_id: saleId,
        amount,
        payment_date: paymentDate,
      });
      alert("پرداخت ثبت شد");
      onSuccess && onSuccess();
    } catch {
      alert("خطا در ثبت پرداخت");
    } finally {
      setLoading(false);
    }
  };

  if (!info) return <p>در حال بارگذاری اطلاعات فروش...</p>;

  return (
    <div style={{ border: "1px solid #ccc", padding: 10 }}>
      <h4>ثبت پرداخت</h4>

      {/* 🔍 اطلاعات فروش */}
      <div style={{ background: "#f9f9f9", padding: 8, marginBottom: 10 }}>
        <p>👤 مشتری: <strong>{info.customer_name}</strong></p>
        <p>📅 تاریخ فروش: {info.sales_date}</p>
        <p>💰 مبلغ کل: {info.total_sales}</p>
        <p>✅ پرداخت‌شده: {info.total_paid}</p>
        <p>❗ باقی‌مانده: {info.remaining}</p>
      </div>

      {/* 💳 فرم پرداخت */}
      <input
        type="number"
        placeholder="مبلغ پرداخت"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="date"
        value={paymentDate}
        onChange={(e) => setPaymentDate(e.target.value)}
      />

      <button onClick={submit} disabled={loading}>
        ثبت پرداخت
      </button>
    </div>
  );
}
