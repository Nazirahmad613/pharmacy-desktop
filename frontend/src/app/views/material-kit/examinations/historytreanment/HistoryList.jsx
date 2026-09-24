// src/app/pages/treatment/history/HistoryList.jsx
// کاملاً مطابق backend: treatment_history + treatment_history_items

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";

// 🎨 پالت رنگ ملایم
const C = {
  pageBg: '#f1f5f9',
  cardBg: '#ffffff',
  softBg: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accent: '#3b82f6',
  accentSoft: '#eff6ff',
  success: '#10b981',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  purple: '#8b5cf6',
  purpleSoft: '#f5f3ff',
  shadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  shadowMd: '0 2px 8px rgba(15, 23, 42, 0.08)',
};

// ✅ نقشه مرحله → برچسب و آیکون
const STEP_META = {
  examination: { label: 'معاینه', icon: '🩺', color: '#3b82f6' },
  laboratory: { label: 'لابراتوار', icon: '🔬', color: '#8b5cf6' },
  radiology: { label: 'رادیولوژی', icon: '📷', color: '#ec4899' },
  operation: { label: 'عملیات', icon: '🔪', color: '#dc2626' },
  pres_insert: { label: 'نسخه', icon: '📝', color: '#10b981' },
  followup: { label: 'ملاقات بعدی', icon: '📅', color: '#f59e0b' },
  admission: { label: 'بستری', icon: '🏥', color: '#ef4444' },
};

// ✅ نقشه stage filter → query params
const STAGE_TO_PARAM = {
  examination: 'has_examination',
  laboratory: 'has_laboratory',
  radiology: 'has_radiology',
  operation: 'has_operation',
  pres_insert: 'has_prescription',
  admission: 'has_admission',
};

export default function HistoryList({ api, onSelectHistory }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterStep, setFilterStep] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // ============================================================
  // ✅ بارگذاری لیست تاریخچه — با تمام فیلترها در سرور
  // ============================================================
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};

      // جستجو — سرور
      if (searchTerm.trim()) params.search = searchTerm.trim();

      // فیلتر تاریخ — سرور
      if (filterFromDate) params.from_date = filterFromDate;
      if (filterToDate) params.to_date = filterToDate;
      if (filterDoctor) params.doctor_id = filterDoctor;

      // فیلتر وضعیت — سرور
      if (activeTab === 'completed') params.visit_status = 'Completed';
      if (activeTab === 'in_progress') params.visit_status = 'InProgress';
      if (activeTab === 'cancelled') params.visit_status = 'Cancelled';

      // فیلتر مرحله — سرور
      if (filterStep !== 'all' && STAGE_TO_PARAM[filterStep]) {
        params[STAGE_TO_PARAM[filterStep]] = true;
      }

      const response = await api.get('/treatment-history', { params });

      // ✅ استخراج داده از پاسخ
      let data = [];
      if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        data = response.data.data.data; // paginated
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }

      console.log('📥 History list loaded:', data.length, 'items');
      setHistory(data);
    } catch (err) {
      console.error("❌ خطا در دریافت تاریخچه:", err);
      toast.error("❌ خطا در دریافت تاریخچه معالجات");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [api, searchTerm, filterFromDate, filterToDate, filterDoctor, filterStep, activeTab]);

  // ✅ fetch اولیه + هر بار که فیلترها تغییر کنند
  useEffect(() => {
    fetchHistory();
  }, [activeTab]); // فقط تب باعث fetch خودکار می‌شود

  // ============================================================
  // ✅ بارگذاری جزئیات کامل یک تاریخچه (با items)
  // ============================================================
  const loadDetail = async (historyId) => {
    if (!historyId) return null;
    setDetailLoading(true);
    try {
      const response = await api.get(`/treatment-history/${historyId}`);
      if (response.data?.success && response.data?.data) {
        const detail = response.data.data;
        console.log('📥 History detail loaded:', {
          history_id: detail.history_id,
          items_count: (detail.items || []).length,
          counters: {
            exam: detail.examinations_count,
            lab: detail.laboratory_tests_count,
            rad: detail.radiology_requests_count,
            pres: detail.prescriptions_count,
            adm: detail.admissions_count,
          },
        });
        setSelectedItem(detail);
        return detail;
      }
      throw new Error('داده یافت نشد');
    } catch (err) {
      console.error("❌ خطا در دریافت جزئیات:", err);
      toast.error("❌ خطا در دریافت جزئیات تاریخچه");
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  // ============================================================
  // ✅ نمایش جزئیات — ابتدا داده لیست، سپس داده کامل
  // ============================================================
  const viewDetails = async (item) => {
    // ✅ نمایش فوری داده لیست (بدون items)
    setSelectedItem({ ...item, items: item.items || [] });
    setShowModal(true);
    if (onSelectHistory) onSelectHistory(item);

    // ✅ بارگذاری داده کامل با items
    const detail = await loadDetail(item.history_id || item.id);
    if (!detail) {
      // اگر خطا داد، همان داده لیست را نگه دار
      console.warn('⚠️ Detail load failed, keeping list data');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  // ============================================================
  // ✅ فیلتر سمت کلاینت فقط برای چیزی که سرور انجام نمی‌دهد
  //    (در این نسخه، سرور همه فیلترها را انجام می‌دهد،
  //     پس اینجا فقط یک پاس‌ترو است)
  // ============================================================
  const filteredHistory = useMemo(() => history, [history]);

  // ============================================================
  // ✅ Helpers
  // ============================================================
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("fa-IR");
    } catch { return "-"; }
  };

  const formatTime = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleTimeString("fa-IR", {
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "-"; }
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    return `${formatDate(date)} - ${formatTime(date)}`;
  };

  const calculateDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return "-";
    try {
      const start = new Date(startedAt);
      const end = new Date(completedAt);
      const diffMinutes = Math.floor((end - start) / (1000 * 60));
      if (diffMinutes < 1) return "کمتر از 1 دقیقه";
      if (diffMinutes < 60) return `${diffMinutes} دقیقه`;
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours} ساعت و ${minutes} دقیقه`;
    } catch { return "-"; }
  };

  const getStatusBadge = (status) => {
    const map = {
      'InProgress': { bg: "#dbeafe", color: "#1e40af", text: "🔄 در حال معالجه" },
      'Completed': { bg: "#d1fae5", color: "#065f46", text: "✅ تکمیل شده" },
      'Cancelled': { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", text: status || 'نامشخص' };
  };

  const getItemStatusBadge = (status) => {
    const map = {
      'pending': { bg: "#fef3c7", color: "#92400e", text: "⏳ در انتظار" },
      'in_progress': { bg: "#dbeafe", color: "#1e40af", text: "🔄 در حال انجام" },
      'completed': { bg: "#d1fae5", color: "#065f46", text: "✅ تکمیل شده" },
      'paid': { bg: "#d1fae5", color: "#065f46", text: "✅ پرداخت شده" },
      'partial': { bg: "#fef3c7", color: "#92400e", text: "💰 پرداخت ناقص" },
      'cancelled': { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
      'rejected': { bg: "#fee2e2", color: "#991b1b", text: "🚫 رد شده" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", text: status || '-' };
  };

  // ============================================================
  // 🖨️ پرینت — نسخه بهبود یافته با escape کردن HTML
  // ============================================================
  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handlePrint = (item) => {
    if (!item) return;
    const items = item.items || [];

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد");
      return;
    }

    const stepsHtml = items.map((it, idx) => {
      const meta = STEP_META[it.step_key] || { label: it.step_label || it.step_key, icon: '📄' };
      const data = it.data || {};
      const badge = getItemStatusBadge(it.status);
      const safeData = escapeHtml(JSON.stringify(data, null, 2));
      return `
        <div class="item">
          <div class="item-head">
            <span class="item-num">${idx + 1}</span>
            <span class="item-icon">${meta.icon}</span>
            <span class="item-title">${escapeHtml(meta.label)}</span>
            <span class="item-status" style="background:${badge.bg};color:${badge.color}">${badge.text}</span>
            <span class="item-time">${formatDateTime(it.step_at)}</span>
          </div>
          <div class="item-body">
            <div class="summary">${escapeHtml(it.summary || '-')}</div>
            ${it.amount ? `<div class="amount">💰 مبلغ: ${Number(it.amount).toLocaleString()} افغانی</div>` : ''}
            ${it.barcode ? `<div class="barcode">🏷️ بارکد: ${escapeHtml(it.barcode)}</div>` : ''}
            <details>
              <summary style="cursor:pointer;color:#3b82f6;font-size:11px;">📋 مشاهده داده کامل</summary>
              <pre class="data-pre">${safeData}</pre>
            </details>
          </div>
        </div>
      `;
    }).join('');

    const printContent = `
      <html dir="rtl">
        <head>
          <title>تاریخچه معالجه - ${escapeHtml(item.patient_name || '')}</title>
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 25px; direction: rtl; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { color: #10b981; margin: 0; font-size: 22px; }
            .header p { color: #6b7280; font-size: 12px; margin: 5px 0 0 0; }
            .section { margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; }
            .section-title { font-weight: bold; color: #374151; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
            .info-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee; font-size: 12px; }
            .label { color: #6b7280; font-weight: bold; }
            .value { color: #1f2937; }
            .item { border: 1px solid #e5e7eb; border-radius: 6px; margin: 10px 0; background: #ffffff; overflow: hidden; }
            .item-head { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 10px 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
            .item-num { background: #3b82f6; color: white; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
            .item-icon { font-size: 16px; }
            .item-title { font-weight: bold; color: #1f2937; font-size: 13px; }
            .item-status { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; }
            .item-time { margin-right: auto; font-size: 11px; color: #6b7280; }
            .item-body { padding: 10px 12px; font-size: 12px; }
            .summary { color: #4b5563; margin-bottom: 6px; }
            .amount { color: #d97706; font-weight: bold; margin-top: 4px; }
            .barcode { color: #6b7280; font-family: monospace; margin-top: 4px; }
            .data-pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; font-size: 10px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin-top: 6px; }
            .signature { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 2px dashed #ccc; }
            .sig-box { width: 200px; text-align: center; font-size: 12px; }
            .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print {
              body { padding: 15px; }
              .item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📜 تاریخچه کامل معالجه</h1>
            <p>تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}</p>
          </div>

          <div class="section">
            <div class="section-title">👤 معلومات مریض</div>
            <div class="info-grid">
              <div class="info-row"><span class="label">نام و تخلص:</span><span class="value">${escapeHtml(item.patient_name || '-')}</span></div>
              <div class="info-row"><span class="label">شماره تذکره:</span><span class="value">${escapeHtml(item.tazkira_number || '-')}</span></div>
              <div class="info-row"><span class="label">سن:</span><span class="value">${item.patient_age ? item.patient_age + ' سال' : '-'}</span></div>
              <div class="info-row"><span class="label">جنسیت:</span><span class="value">${item.patient_gender === 'male' || item.patient_gender === 'Male' ? 'مرد' : item.patient_gender === 'female' || item.patient_gender === 'Female' ? 'زن' : escapeHtml(item.patient_gender || '-')}</span></div>
              <div class="info-row"><span class="label">شماره تماس:</span><span class="value">${escapeHtml(item.patient_phone || '-')}</span></div>
              <div class="info-row"><span class="label">گروپ خون:</span><span class="value">${escapeHtml(item.patient_blood_group || '-')}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🩺 معلومات معالجه</div>
            <div class="info-grid">
              <div class="info-row"><span class="label">شماره مراجعه:</span><span class="value">${escapeHtml(item.visit_number || '-')}</span></div>
              <div class="info-row"><span class="label">شماره صف:</span><span class="value">${escapeHtml(item.queue_number || '-')}</span></div>
              <div class="info-row"><span class="label">داکتر معالج:</span><span class="value">${escapeHtml(item.doctor_name || '-')}</span></div>
              <div class="info-row"><span class="label">تخصص:</span><span class="value">${escapeHtml(item.doctor_specialty || '-')}</span></div>
              <div class="info-row"><span class="label">وضعیت:</span><span class="value">${getStatusBadge(item.visit_status).text}</span></div>
              <div class="info-row"><span class="label">تاریخ مراجعه:</span><span class="value">${formatDate(item.created_at)}</span></div>
              <div class="info-row"><span class="label">شروع معالجه:</span><span class="value">${formatDateTime(item.treatment_started_at)}</span></div>
              <div class="info-row"><span class="label">ختم معالجه:</span><span class="value">${formatDateTime(item.treatment_completed_at)}</span></div>
              <div class="info-row"><span class="label">مدت زمان:</span><span class="value">${calculateDuration(item.treatment_started_at, item.treatment_completed_at)}</span></div>
            </div>
          </div>

          ${item.diagnosis ? `
          <div class="section">
            <div class="section-title">📝 تشخیص</div>
            <div style="padding: 8px; background: #ffffff; border-radius: 5px; font-size: 13px;">${escapeHtml(item.diagnosis)}</div>
          </div>` : ''}

          <div class="section">
            <div class="section-title">📊 خلاصه فعالیت‌ها</div>
            <div class="info-grid">
              <div class="info-row"><span class="label">تعداد معاینات:</span><span class="value">${item.examinations_count || 0}</span></div>
              <div class="info-row"><span class="label">تست‌های لابراتوار:</span><span class="value">${item.laboratory_tests_count || 0}</span></div>
              <div class="info-row"><span class="label">درخواست‌های رادیولوژی:</span><span class="value">${item.radiology_requests_count || 0}</span></div>
              <div class="info-row"><span class="label">عملیات‌ها:</span><span class="value">${item.operations_count || 0}</span></div>
              <div class="info-row"><span class="label">نسخه‌ها:</span><span class="value">${item.prescriptions_count || 0}</span></div>
              <div class="info-row"><span class="label">بستری‌ها:</span><span class="value">${item.admissions_count || 0}</span></div>
            </div>
            ${item.total_amount > 0 ? `
            <div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 6px;">
              <div class="info-row"><span class="label">مجموع مبالغ:</span><span class="value" style="color:#d97706;font-weight:bold;">${Number(item.total_amount).toLocaleString()} افغانی</span></div>
              <div class="info-row"><span class="label">پرداخت شده:</span><span class="value" style="color:#10b981;font-weight:bold;">${Number(item.total_paid).toLocaleString()} افغانی</span></div>
              <div class="info-row"><span class="label">باقی‌مانده:</span><span class="value" style="color:#ef4444;font-weight:bold;">${Number(item.total_remaining).toLocaleString()} افغانی</span></div>
            </div>` : ''}
          </div>

          ${items.length > 0 ? `
          <div class="section">
            <div class="section-title">📋 جزئیات مراحل (${items.length} مورد)</div>
            ${stepsHtml}
          </div>` : ''}

          <div class="signature">
            <div class="sig-box"><div class="sig-line">امضای داکتر معالج</div></div>
            <div class="sig-box"><div class="sig-line">امضای رسپشن</div></div>
          </div>

          <div class="footer">
            تاریخ چاپ: ${new Date().toLocaleString('fa-IR')} | سیستم معالجه
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // ============================================================
  // 🎨 Styles
  // ============================================================
  const styles = {
    container: { padding: "8px" },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
      padding: "15px",
      background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
      borderRadius: "10px",
    },
    statBox: { textAlign: "center" },
    statValue: { fontSize: "20px", fontWeight: "bold" },
    statLabel: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
    filters: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    filterBtn: {
      padding: "8px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "13px",
      background: "white",
      transition: "all 0.2s",
    },
    filterBtnActive: {
      background: "#10b981",
      color: "white",
      borderColor: "#10b981",
    },
    searchInput: {
      padding: "8px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "220px",
      flex: 1,
      background: "white",
      color: "#1f2937",
      outline: "none",
    },
    dateInput: {
      padding: "8px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "13px",
      background: "white",
      color: "#1f2937",
      outline: "none",
    },
    selectInput: {
      padding: "8px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "13px",
      background: "white",
      color: "#1f2937",
      outline: "none",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px",
      background: "white",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: C.shadow,
    },
    th: {
      padding: "12px",
      textAlign: "right",
      background: "#f9fafb",
      color: "#374151",
      fontSize: "13px",
      fontWeight: "bold",
      borderBottom: "2px solid #e5e7eb",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #f3f4f6",
      color: "#1f2937",
    },
    btn: {
      padding: "6px 12px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
      marginRight: "4px",
    },
    modal: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
      padding: "16px",
    },
    modalContent: {
      background: "white",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "900px",
      width: "100%",
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15)',
    },
    sectionCard: {
      background: C.cardBg,
      borderRadius: "10px",
      padding: "16px",
      marginBottom: "14px",
      border: `1px solid ${C.border}`,
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "10px",
    },
    infoItem: {
      background: C.softBg,
      padding: "10px 12px",
      borderRadius: "8px",
      border: `1px solid ${C.border}`,
    },
    infoLabel: {
      fontSize: "11px",
      color: C.textSecondary,
      fontWeight: "bold",
      display: "block",
      marginBottom: "4px",
    },
    infoValue: { fontSize: "13px", color: C.textPrimary, fontWeight: "bold" },
    itemCard: {
      background: C.cardBg,
      borderRadius: "10px",
      marginBottom: "10px",
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
    },
    itemHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      background: C.softBg,
      borderBottom: `1px solid ${C.border}`,
      flexWrap: 'wrap',
    },
    itemBody: {
      padding: '12px 14px',
      fontSize: '12px',
      color: C.textPrimary,
    },
    dataPre: {
      background: C.softBg,
      border: `1px solid ${C.border}`,
      borderRadius: '6px',
      padding: '10px',
      fontSize: '10px',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: '200px',
      overflowY: 'auto',
      marginTop: '6px',
      color: C.textSecondary,
    },
  };

  // ============================================================
  // 📊 Tabs
  // ============================================================
  const tabs = [
    { key: "all", label: "📋 همه", count: history.length },
    {
      key: "completed",
      label: "✅ تکمیل شده",
      count: history.filter((h) => h.visit_status === "Completed").length,
    },
    {
      key: "in_progress",
      label: "🔄 در حال معالجه",
      count: history.filter((h) => h.visit_status === "InProgress").length,
    },
    {
      key: "cancelled",
      label: "❌ لغو شده",
      count: history.filter((h) => h.visit_status === "Cancelled").length,
    },
  ];

  return (
    <div style={styles.container}>
      {/* ====== آمار ====== */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{history.length}</div>
          <div style={styles.statLabel}>کل معالجات</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>
            {history.filter((h) => h.visit_status === "Completed").length}
          </div>
          <div style={styles.statLabel}>تکمیل شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>
            {history.filter((h) => h.visit_status === "InProgress").length}
          </div>
          <div style={styles.statLabel}>در حال معالجه</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#ef4444" }}>
            {history.filter((h) => h.visit_status === "Cancelled").length}
          </div>
          <div style={styles.statLabel}>لغو شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#8b5cf6", fontSize: "16px" }}>
            {history.reduce((sum, h) => sum + (h.laboratory_tests_count || 0), 0)}
          </div>
          <div style={styles.statLabel}>تست‌های لابراتوار</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#ec4899", fontSize: "16px" }}>
            {history.reduce((sum, h) => sum + (h.radiology_requests_count || 0), 0)}
          </div>
          <div style={styles.statLabel}>رادیولوژی</div>
        </div>
      </div>

      {/* ====== تب‌ها ====== */}
      <div style={styles.filters}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.filterBtn,
              ...(activeTab === tab.key ? styles.filterBtnActive : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ====== نوار جستجو و فیلترهای پیشرفته ====== */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="🔍 جستجو: نام، تذکره، شماره مراجعه، تلیفون، داکتر، تشخیص..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') fetchHistory();
          }}
          style={styles.searchInput}
        />

        <input
          type="date"
          value={filterFromDate}
          onChange={(e) => setFilterFromDate(e.target.value)}
          style={styles.dateInput}
          title="از تاریخ"
        />

        <input
          type="date"
          value={filterToDate}
          onChange={(e) => setFilterToDate(e.target.value)}
          style={styles.dateInput}
          title="تا تاریخ"
        />

        <select
          value={filterStep}
          onChange={(e) => setFilterStep(e.target.value)}
          style={styles.selectInput}
        >
          <option value="all">📋 همه مراحل</option>
          <option value="examination">🩺 معاینه</option>
          <option value="laboratory">🔬 لابراتوار</option>
          <option value="radiology">📷 رادیولوژی</option>
          <option value="operation">🔪 عملیات</option>
          <option value="pres_insert">📝 نسخه</option>
          <option value="followup">📅 ملاقات بعدی</option>
          <option value="admission">🏥 بستری</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setFilterFromDate("");
            setFilterToDate("");
            setFilterStep("all");
            setFilterDoctor("");
            // ✅ بعد از پاک کردن، دوباره fetch کن
            setTimeout(() => fetchHistory(), 0);
          }}
          style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "8px 16px" }}
        >
          ↺ پاک کردن
        </button>
        <button
          onClick={fetchHistory}
          style={{ ...styles.btn, background: "#3b82f6", color: "white", padding: "8px 16px" }}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* ====== جدول ====== */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div>هیچ تاریخچه‌ای با این فیلتر یافت نشد</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>نام مریض</th>
                <th style={styles.th}>شماره مراجعه</th>
                <th style={styles.th}>داکتر</th>
                <th style={styles.th}>تاریخ</th>
                <th style={styles.th}>فعالیت‌ها</th>
                <th style={styles.th}>مدت زمان</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item, index) => {
                const badge = getStatusBadge(item.visit_status);
                const historyId = item.history_id || item.id;
                return (
                  <tr key={historyId || index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold", color: C.textPrimary }}>
                        {item.patient_name || `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`}
                      </div>
                      {item.patient_phone && (
                        <div style={{ fontSize: "11px", color: C.textSecondary }}>
                          📱 {item.patient_phone}
                        </div>
                      )}
                      {item.tazkira_number && (
                        <div style={{ fontSize: "11px", color: C.textSecondary }}>
                          🆔 {item.tazkira_number}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold", color: "#b45309" }}>
                        {item.visit_number || "---"}
                      </div>
                      {item.queue_number && (
                        <div style={{ fontSize: "11px", color: C.textSecondary }}>
                          🎫 صف: {item.queue_number}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                        {item.doctor_name || "---"}
                      </div>
                      {item.doctor_specialty && (
                        <div style={{ fontSize: "11px", color: C.textSecondary }}>
                          {item.doctor_specialty}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: "12px" }}>{formatDate(item.created_at)}</div>
                      <div style={{ fontSize: "11px", color: C.textSecondary }}>
                        🕐 {formatTime(item.created_at)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {item.examinations_count > 0 && (
                          <span style={{ background: C.accentSoft, color: C.accent, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                            🩺 {item.examinations_count}
                          </span>
                        )}
                        {item.laboratory_tests_count > 0 && (
                          <span style={{ background: C.purpleSoft, color: C.purple, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                            🔬 {item.laboratory_tests_count}
                          </span>
                        )}
                        {item.radiology_requests_count > 0 && (
                          <span style={{ background: '#fce7f3', color: '#ec4899', padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                            📷 {item.radiology_requests_count}
                          </span>
                        )}
                        {item.operations_count > 0 && (
                          <span style={{ background: C.dangerSoft, color: C.danger, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                            🔪 {item.operations_count}
                          </span>
                        )}
                        {item.prescriptions_count > 0 && (
                          <span style={{ background: C.successSoft, color: C.success, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                            📝 {item.prescriptions_count}
                          </span>
                        )}
                        {item.admissions_count > 0 && (
                          <span style={{ background: C.warningSoft, color: C.warning, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                            🏥 {item.admissions_count}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {calculateDuration(item.treatment_started_at, item.treatment_completed_at)}
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: badge.bg, color: badge.color, padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                        {badge.text}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.btn, background: C.accent, color: "white", marginRight: '4px' }}
                        onClick={() => viewDetails(item)}
                      >
                        👁 مشاهده
                      </button>
                      <button
                        style={{ ...styles.btn, background: C.purple, color: "white" }}
                        onClick={() => handlePrint(item)}
                      >
                        🖨️ پرینت
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* مودال جزئیات کامل */}
      {/* ============================================================ */}
      {showModal && selectedItem && (
        <div style={styles.modal} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>

            {/* هدر مودال */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `2px solid ${C.border}`, paddingBottom: '14px' }}>
              <h2 style={{ margin: 0, color: C.success, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📜 جزئیات کامل تاریخچه معالجه
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handlePrint(selectedItem)}
                  style={{ ...styles.btn, background: C.purple, color: 'white', padding: '8px 14px' }}
                >
                  🖨️ پرینت
                </button>
                <button
                  onClick={closeModal}
                  style={{ ...styles.btn, background: C.textSecondary, color: 'white', padding: '8px 14px' }}
                >
                  ✕ بستن
                </button>
              </div>
            </div>

            {detailLoading && (
              <div style={{ textAlign: 'center', padding: '20px', color: C.textSecondary }}>
                ⏳ در حال بارگذاری جزئیات...
              </div>
            )}

            {/* 👤 معلومات بیمار */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: C.success, fontSize: "14px", borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
                👤 معلومات بیمار
              </h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>نام و تخلص</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient_name || `${selectedItem.patient?.first_name || ''} ${selectedItem.patient?.last_name || ''}`}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره تذکره</span>
                  <div style={styles.infoValue}>{selectedItem.tazkira_number || '---'}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>سن</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient_age ? `${selectedItem.patient_age} سال` : '---'}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>جنسیت</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient_gender === 'male' || selectedItem.patient_gender === 'Male' ? 'مرد' :
                     selectedItem.patient_gender === 'female' || selectedItem.patient_gender === 'Female' ? 'زن' :
                     selectedItem.patient_gender || '---'}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره تماس</span>
                  <div style={styles.infoValue}>{selectedItem.patient_phone || '---'}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>گروپ خون</span>
                  <div style={styles.infoValue}>{selectedItem.patient_blood_group || '---'}</div>
                </div>
              </div>
            </div>

            {/* 🩺 معلومات معالجه */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: C.success, fontSize: "14px", borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
                🩺 معلومات معالجه
              </h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره مراجعه</span>
                  <div style={{ ...styles.infoValue, color: '#b45309' }}>{selectedItem.visit_number || '---'}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره صف</span>
                  <div style={styles.infoValue}>{selectedItem.queue_number || '---'}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>داکتر معالج</span>
                  <div style={styles.infoValue}>{selectedItem.doctor_name || '---'}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>تخصص</span>
                  <div style={styles.infoValue}>{selectedItem.doctor_specialty || '---'}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>تاریخ مراجعه</span>
                  <div style={styles.infoValue}>{formatDate(selectedItem.created_at)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>وضعیت</span>
                  <div style={{ marginTop: '4px' }}>
                    {(() => {
                      const b = getStatusBadge(selectedItem.visit_status);
                      return (
                        <span style={{ background: b.bg, color: b.color, padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                          {b.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شروع معالجه</span>
                  <div style={styles.infoValue}>{formatDateTime(selectedItem.treatment_started_at)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>ختم معالجه</span>
                  <div style={styles.infoValue}>{formatDateTime(selectedItem.treatment_completed_at)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>مدت زمان</span>
                  <div style={styles.infoValue}>
                    {calculateDuration(selectedItem.treatment_started_at, selectedItem.treatment_completed_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* 📊 خلاصه فعالیت‌ها */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: C.success, fontSize: "14px", borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
                📊 خلاصه فعالیت‌ها
              </h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>🩺 معاینات</span>
                  <div style={{ ...styles.infoValue, color: C.accent }}>{selectedItem.examinations_count || 0}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>🔬 لابراتوار</span>
                  <div style={{ ...styles.infoValue, color: C.purple }}>{selectedItem.laboratory_tests_count || 0}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📷 رادیولوژی</span>
                  <div style={{ ...styles.infoValue, color: '#ec4899' }}>{selectedItem.radiology_requests_count || 0}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>🔪 عملیات</span>
                  <div style={{ ...styles.infoValue, color: C.danger }}>{selectedItem.operations_count || 0}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📝 نسخه</span>
                  <div style={{ ...styles.infoValue, color: C.success }}>{selectedItem.prescriptions_count || 0}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>🏥 بستری</span>
                  <div style={{ ...styles.infoValue, color: C.warning }}>{selectedItem.admissions_count || 0}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📅 ملاقات بعدی</span>
                  <div style={{ ...styles.infoValue, color: C.warning }}>{selectedItem.followups_count || 0}</div>
                </div>
              </div>

              {(selectedItem.total_amount > 0 || selectedItem.total_paid > 0) && (
                <div style={{ marginTop: '14px', padding: '12px', background: C.warningSoft, borderRadius: '8px', border: `1px solid ${C.warning}` }}>
                  <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px', fontSize: '13px' }}>💰 خلاصه مالی</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#78350f' }}>مجموع:</span>
                      <div style={{ fontWeight: 'bold', color: '#d97706' }}>
                        {Number(selectedItem.total_amount || 0).toLocaleString()} افغانی
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#78350f' }}>پرداخت شده:</span>
                      <div style={{ fontWeight: 'bold', color: C.success }}>
                        {Number(selectedItem.total_paid || 0).toLocaleString()} افغانی
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#78350f' }}>باقی‌مانده:</span>
                      <div style={{ fontWeight: 'bold', color: C.danger }}>
                        {Number(selectedItem.total_remaining || 0).toLocaleString()} افغانی
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 📝 تشخیص */}
            {selectedItem.diagnosis && (
              <div style={styles.sectionCard}>
                <h3 style={{ margin: "0 0 12px 0", color: C.success, fontSize: "14px", borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
                  📝 تشخیص
                </h3>
                <div style={{ ...styles.infoItem, background: C.warningSoft, border: `1px solid ${C.warning}` }}>
                  <div style={{ color: C.textPrimary, fontSize: '13px' }}>{selectedItem.diagnosis}</div>
                </div>
              </div>
            )}

            {/* 📋 جزئیات مراحل */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: C.success, fontSize: "14px", borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
                📋 جزئیات مراحل ({(selectedItem.items || []).length})
              </h3>

              {(selectedItem.items || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: C.textSecondary, background: C.softBg, borderRadius: '8px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                  <div>هیچ فعالیتی برای این مراجعه ثبت نشده است</div>
                </div>
              ) : (
                (selectedItem.items || []).map((it, idx) => {
                  const meta = STEP_META[it.step_key] || { label: it.step_label || it.step_key, icon: '📄', color: C.textSecondary };
                  const badge = getItemStatusBadge(it.status);
                  const data = it.data || {};

                  return (
                    <div key={it.id || idx} style={styles.itemCard}>
                      <div style={styles.itemHeader}>
                        <span style={{
                          background: meta.color,
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '16px' }}>{meta.icon}</span>
                        <span style={{ fontWeight: 'bold', color: C.textPrimary, fontSize: '13px' }}>
                          {meta.label}
                        </span>
                        <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>
                          {badge.text}
                        </span>
                        <span style={{ marginRight: 'auto', fontSize: '11px', color: C.textSecondary }}>
                          ⏰ {formatDateTime(it.step_at)}
                        </span>
                      </div>

                      <div style={styles.itemBody}>
                        {it.summary && (
                          <div style={{ marginBottom: '8px', color: C.textPrimary, fontSize: '12px' }}>
                            <strong>خلاصه:</strong> {it.summary}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', marginBottom: '8px' }}>
                          {it.amount > 0 && (
                            <span style={{ color: '#d97706', fontWeight: 'bold' }}>
                              💰 {Number(it.amount).toLocaleString()} افغانی
                            </span>
                          )}
                          {it.paid_amount > 0 && (
                            <span style={{ color: C.success, fontWeight: 'bold' }}>
                              ✅ پرداخت: {Number(it.paid_amount).toLocaleString()} افغانی
                            </span>
                          )}
                          {it.barcode && (
                            <span style={{ color: C.textSecondary, fontFamily: 'monospace' }}>
                              🏷️ {it.barcode}
                            </span>
                          )}
                          {it.performed_by_name && (
                            <span style={{ color: C.textSecondary }}>
                              👤 {it.performed_by_name}
                            </span>
                          )}
                        </div>

                        {/* داده کامل JSON */}
                        <details>
                          <summary style={{ cursor: 'pointer', color: C.accent, fontSize: '11px', fontWeight: 'bold', padding: '4px 0' }}>
                            📄 مشاهده تمام داده‌های ثبت شده
                          </summary>
                          <pre style={styles.dataPre}>
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        </details>

                        {it.pdf_file && (
                          <a
                            href={it.pdf_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              marginTop: '8px',
                              background: C.accent,
                              color: 'white',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}
                          >
                            👁️ مشاهده PDF
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* دکمه‌های پایین */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '20px', borderTop: `1px solid ${C.border}`, paddingTop: '15px' }}>
              <button
                onClick={() => handlePrint(selectedItem)}
                style={{ ...styles.btn, background: C.purple, color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🖨️ پرینت کامل تاریخچه
              </button>
              <button
                onClick={closeModal}
                style={{ ...styles.btn, background: C.textSecondary, color: 'white', padding: '10px 20px' }}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}