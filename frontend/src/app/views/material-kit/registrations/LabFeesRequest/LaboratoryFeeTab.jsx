import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function LaboratoryFeeTab({ api }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    total_amount: 0,
    total_paid: 0,
    total_remaining: 0,
    today: 0,
    today_amount: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    registration_id: "",
    patient_id: "",
    amount: "",
    paid_amount: "",
    discount: "",
    payment_method: "cash",
    description: "",
    note: ""
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    fetchFees();
    fetchStatistics();
  }, []);

  const fetchFees = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/laboratory-fees?page=${page}&per_page=${ROWS_PER_PAGE}`);
      const data = response.data?.data;
      setFees(data?.data || []);
      setTotalPages(data?.last_page || 1);
      setCurrentPage(data?.current_page || 1);
    } catch (err) {
      console.error("خطا در دریافت فیس‌ها:", err);
      toast.error("❌ خطا در دریافت لیست فیس‌های لابراتوار");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/laboratory-fees/statistics");
      setStats(response.data?.data || {});
    } catch (err) {
      console.error("خطا در دریافت آمار:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/laboratory-fees/${editingId}`, formData);
        toast.success("✅ فیس لابراتوار با موفقیت ویرایش شد");
      } else {
        await api.post("/laboratory-fees", formData);
        toast.success("✅ فیس لابراتوار با موفقیت ثبت شد");
      }
      fetchFees(currentPage);
      fetchStatistics();
      resetForm();
    } catch (err) {
      console.error("خطا:", err);
      if (err.response?.data?.errors) {
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          toast.error(`❌ ${field}: ${messages[0]}`);
        });
      } else {
        toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در ثبت"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      registration_id: "",
      patient_id: "",
      amount: "",
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: "",
      note: ""
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این فیس را حذف کنید؟")) return;
    
    try {
      await api.delete(`/laboratory-fees/${id}`);
      toast.success("✅ فیس لابراتوار با موفقیت حذف شد");
      fetchFees(currentPage);
      fetchStatistics();
    } catch (err) {
      toast.error("❌ خطا در حذف فیس لابراتوار");
    }
  };

  const handleEdit = (fee) => {
    setEditingId(fee.id);
    setFormData({
      registration_id: fee.registration_id || "",
      patient_id: fee.patient_id || "",
      amount: fee.amount || "",
      paid_amount: fee.paid_amount || "",
      discount: fee.discount || "",
      payment_method: fee.payment_method || "cash",
      description: fee.description || "",
      note: fee.note || ""
    });
    setShowForm(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      partial: '#f97316',
      paid: '#22c55e',
      refunded: '#8b5cf6',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'در انتظار پرداخت',
      partial: 'پرداخت ناقص',
      paid: 'پرداخت کامل',
      refunded: 'برگشت داده شده',
      cancelled: 'لغو شده'
    };
    return labels[status] || status;
  };

  const getMethodLabel = (method) => {
    const methods = {
      cash: 'نقدی',
      card: 'کارت بانکی',
      online: 'آنلاین',
      insurance: 'بیمه'
    };
    return methods[method] || method || '-';
  };

  return (
    <div>
      {/* آمار */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#1f2937',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.total || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>مجموع</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>در انتظار</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>{stats.partial || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>ناقص</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{stats.paid || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>پرداخت شده</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{stats.total_paid?.toFixed(2) || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>مبلغ پرداخت</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>{stats.total_remaining?.toFixed(2) || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>باقیمانده</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa' }}>{stats.today || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>امروز</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fcd34d' }}>{stats.today_amount?.toFixed(2) || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>فیس امروز</div>
        </div>
      </div>

      {/* دکمه ثبت جدید */}
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          backgroundColor: showForm ? '#dc2626' : '#2563eb',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '15px',
          transition: 'all 0.3s'
        }}
      >
        {showForm ? '✕ بستن فرم' : '+ ثبت فیس لابراتوار جدید'}
      </button>

      {/* فرم ثبت */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          padding: '20px',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #374151'
        }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '15px' }}>
            {editingId ? '✏️ ویرایش فیس لابراتوار' : '📝 ثبت فیس لابراتوار'}
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                شناسه مراجعه *
              </label>
              <input
                type="number"
                name="registration_id"
                value={formData.registration_id}
                onChange={(e) => setFormData({ ...formData, registration_id: e.target.value })}
                className="form-control"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                required
                disabled={editingId}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                شناسه مریض *
              </label>
              <input
                type="number"
                name="patient_id"
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                className="form-control"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                required
                disabled={editingId}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                مبلغ کل (افغانی) *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="form-control"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                required
                min="0"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                مبلغ پرداخت شده
              </label>
              <input
                type="number"
                step="0.01"
                name="paid_amount"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="form-control"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                min="0"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                تخفیف (%)
              </label>
              <input
                type="number"
                step="0.1"
                name="discount"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="form-control"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                min="0"
                max="100"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                روش پرداخت
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="form-control"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
              >
                <option value="cash">نقدی</option>
                <option value="card">کارت بانکی</option>
                <option value="online">آنلاین</option>
                <option value="insurance">بیمه</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                توضیحات
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control"
                rows="2"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                placeholder="توضیحات اضافی..."
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                یادداشت
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="form-control"
                rows="2"
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                placeholder="یادداشت..."
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button type="submit" style={{
              backgroundColor: '#22c55e',
              color: 'white',
              padding: '8px 25px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }} disabled={loading}>
              {loading ? 'در حال ثبت...' : (editingId ? '✏️ ویرایش' : '📥 ثبت')}
            </button>
            <button type="button" onClick={resetForm} style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '8px 25px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* جستجو */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="جستجوی فیس‌ها بر اساس نام مریض..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
          style={{ backgroundColor: '#1f2937', color: 'white', borderColor: '#374151' }}
        />
      </div>

      {/* لیست فیس‌ها */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#1f2937', borderBottom: '2px solid #374151' }}>
            <tr>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>#</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>مریض</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>مبلغ کل</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>پرداخت</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>تخفیف</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>باقیمانده</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>روش پرداخت</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>وضعیت</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>تاریخ</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#60a5fa' }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                  <div>⏳ در حال بارگذاری...</div>
                </td>
              </tr>
            ) : fees.length > 0 ? (
              fees.map((fee, index) => (
                <tr key={fee.id} style={{ borderBottom: '1px solid #2a3a4a', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2a3a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#9ca3af' }}>
                    {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                  </td>
                  <td style={{ padding: '10px', color: 'white' }}>
                    {fee.patient?.first_name} {fee.patient?.last_name}
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      مراجعه #{fee.registration_id}
                    </div>
                  </td>
                  <td style={{ padding: '10px', color: '#fcd34d', fontWeight: 'bold' }}>
                    {fee.amount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', color: '#22c55e' }}>
                    {fee.paid_amount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', color: '#f59e0b' }}>
                    {fee.discount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', color: '#ef4444', fontWeight: 'bold' }}>
                    {fee.remaining_amount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', color: '#9ca3af' }}>
                    {getMethodLabel(fee.payment_method)}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      backgroundColor: getStatusColor(fee.payment_status),
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {getStatusLabel(fee.payment_status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#9ca3af', fontSize: '11px' }}>
                    {new Date(fee.created_at).toLocaleDateString('fa-IR')}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(fee)}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(fee.id)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                  <div>📭 هیچ فیس لابراتواری ثبت نشده است</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
          <button
            onClick={() => fetchFees(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            style={{
              padding: '6px 15px',
              backgroundColor: currentPage === 1 ? '#374151' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            قبلی
          </button>
          <span style={{ color: '#9ca3af', padding: '6px 15px' }}>
            صفحه {currentPage} از {totalPages}
          </span>
          <button
            onClick={() => fetchFees(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            style={{
              padding: '6px 15px',
              backgroundColor: currentPage === totalPages ? '#374151' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
}