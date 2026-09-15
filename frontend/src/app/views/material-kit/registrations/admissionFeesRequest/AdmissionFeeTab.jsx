// src/app/pages/admission/AdmissionFeePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../../api';
import { toast } from 'react-toastify';
import {
  Card, Table, Button, Form, Input, Select, DatePicker, TimePicker,
  Modal, Space, Tag, Descriptions, Row, Col,
  Tabs, Badge, Popconfirm, Tooltip, Avatar,
  List, Empty, Spin, InputNumber, Alert
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  PrinterOutlined, ReloadOutlined, DollarOutlined,
  FileTextOutlined, DeleteOutlined,
  EyeOutlined, UserOutlined,
  WarningOutlined, BellOutlined,
  SaveOutlined, ExclamationCircleOutlined,
  CloseCircleOutlined, EnvironmentOutlined,
  EditOutlined, LogoutOutlined, SwapOutlined,
  SendOutlined, StopOutlined, CheckOutlined
} from '@ant-design/icons';
import moment from 'moment';
import 'moment-jalaali';

const { Option } = Select;
const { TextArea } = Input;

// ============ استایل‌ها ============
const styles = {
  container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
  headerCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '12px', padding: '20px', marginBottom: '20px',
    border: '1px solid #2a3a4a'
  },
  requestItem: {
    background: '#1a2a3a', padding: '15px 20px', borderRadius: '8px',
    marginBottom: '10px', borderRight: '4px solid #ef4444',
    transition: 'all 0.3s ease', cursor: 'pointer'
  },
  alertCard: {
    background: '#2a1a1a', padding: '15px', borderRadius: '8px',
    border: '1px solid #ef4444', marginBottom: '10px'
  },
  modalPatientInfoBox: {
    backgroundColor: '#f0f5ff', padding: '15px', borderRadius: '8px',
    marginBottom: '20px', border: '1px solid #91caff'
  },
  modalPatientInfoBoxDanger: {
    backgroundColor: '#fff1f0', padding: '15px', borderRadius: '8px',
    marginBottom: '20px', border: '1px solid #ffa39e'
  },
  modalPatientInfoBoxInfo: {
    backgroundColor: '#e6f4ff', padding: '15px', borderRadius: '8px',
    marginBottom: '20px', border: '1px solid #91caff'
  },
  modalInfoLabel: {
    color: '#8c8c8c', fontSize: '11px', display: 'block', marginBottom: '2px'
  },
  modalInfoValue: { color: '#1f1f1f', fontWeight: 'bold', fontSize: '13px' },
  modalInfoValueNormal: { color: '#262626', fontSize: '13px' }
};

// ============ توابع کمکی ============
const toNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const calculateRemaining = (amount, paidAmount, discountPercent) => {
  const amountNum = toNumber(amount || 0);
  const paidNum = toNumber(paidAmount || 0);
  const discountNum = toNumber(discountPercent || 0);
  const discountAmount = (amountNum * discountNum) / 100;
  return Math.max(0, amountNum - paidNum - discountAmount);
};

const extractPatientInfo = (source) => {
  if (!source) return null;
  if (source.full_name || source.first_name || source.patient_name) {
    return {
      full_name: source.full_name || 
                 [source.first_name, source.last_name].filter(Boolean).join(' ').trim() ||
                 source.patient_name || '',
      first_name: source.first_name || '',
      last_name: source.last_name || '',
      age: source.age || null,
      gender: source.gender || null,
      mobile: source.mobile || source.phone || '',
      phone: source.phone || source.mobile || '',
      national_id: source.national_id || ''
    };
  }
  if (source.patient) return extractPatientInfo(source.patient);
  if (source.admission_request?.patient) return extractPatientInfo(source.admission_request.patient);
  return {
    full_name: source.patient_name || source.full_name || '',
    first_name: source.first_name || '',
    last_name: source.last_name || '',
    age: source.age || null,
    gender: source.gender || null,
    mobile: source.mobile || source.phone || '',
    phone: source.phone || source.mobile || '',
    national_id: source.national_id || ''
  };
};

const AdmissionFeePage = () => {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [feeForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [dischargeForm] = Form.useForm();
  const [transferForm] = Form.useForm();

  // State
  const [admission, setAdmission] = useState(null);
  const [fees, setFees] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const [alertRequests, setAlertRequests] = useState([]);
  const [dischargedRequests, setDischargedRequests] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [activeTab, setActiveTab] = useState('requests');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [dischargeModalVisible, setDischargeModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // Statistics
  const [statistics, setStatistics] = useState({
    total_amount: 0, paid_amount: 0, pending_amount: 0,
    total_fees: 0, pending_fees: 0, paid_fees: 0,
    total_requests: 0, unpaid_requests: 0, paid_requests: 0,
    alert_count: 0
  });

  // ============ بارگذاری اولیه ============
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(checkAlerts, 300000);
    return () => clearInterval(interval);
  }, [admissionId, refreshKey]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAdmissionData(),
        fetchFeesData(),
        fetchAllRequests(),
        fetchWards(),
        checkAlerts()
      ]);
    } catch (error) {
      console.error('❌ خطا در بارگذاری:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmissionData = async () => {
    if (!admissionId) return;
    try {
      const response = await api.get(`/admissions/${admissionId}`);
      setAdmission(response.data.data);
    } catch (error) {
      console.error('❌ خطا:', error);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await api.get('/wards');
      let wardsData = [];
      if (response.data?.data && Array.isArray(response.data.data)) wardsData = response.data.data;
      else if (Array.isArray(response.data)) wardsData = response.data;
      setWards(wardsData);
    } catch (error) {
      console.error('❌ خطا در دریافت بخش‌ها:', error);
    }
  };

  const fetchFeesData = async () => {
    try {
      const url = admissionId ? `/admission-fees/admission/${admissionId}` : '/admission-fees';
      const response = await api.get(url);
      let feesList = [];
      if (response.data?.data) {
        const data = response.data.data;
        if (Array.isArray(data)) feesList = data;
        else if (data?.fees) feesList = data.fees;
        else if (data?.data && Array.isArray(data.data)) feesList = data.data;
      }
      setFees(feesList);

      const totalAmount = feesList.reduce((sum, f) => sum + toNumber(f.amount), 0);
      const paidAmount = feesList.filter(f => f.status === 'paid').reduce((sum, f) => sum + toNumber(f.amount), 0);
      const pendingAmount = feesList.filter(f => f.status === 'pending').reduce((sum, f) => sum + toNumber(f.amount), 0);

      setStatistics(prev => ({
        ...prev,
        total_amount: totalAmount || 0,
        paid_amount: paidAmount || 0,
        pending_amount: pendingAmount || 0,
        total_fees: feesList.length,
        pending_fees: feesList.filter(f => f.status === 'pending').length,
        paid_fees: feesList.filter(f => f.status === 'paid').length
      }));
    } catch (error) {
      console.error('❌ خطا:', error);
    }
  };

  const fetchAllRequests = async () => {
    try {
      const response = await api.get('/admissions/all');
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setAllRequests(data.all_requests || []);
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        setDischargedRequests(data.discharged_requests || []);
        setStatistics(prev => ({
          ...prev,
          total_requests: data.all_requests?.length || 0,
          unpaid_requests: data.unpaid_requests?.length || 0,
          paid_requests: data.paid_requests?.length || 0
        }));
      }
    } catch (error) {
      console.error('❌ خطا:', error);
    }
  };

  const checkAlerts = async () => {
    try {
      const response = await api.get('/admission-fees/pending/alerts');
      if (response.data?.data) {
        setAlertRequests(response.data.data);
        setStatistics(prev => ({ ...prev, alert_count: response.data.data.length || 0 }));
      }
    } catch (error) {
      console.error('❌ خطا:', error);
    }
  };

  // ============================================================
  // ✅ ثبت فیس
  // ============================================================
  const handleSubmitFee = async (values) => {
    setSubmitting(true);
    try {
      const regId = selectedRequest?.reg_id || admission?.reg_id;
      if (!regId) {
        toast.error('شناسه مراجعه (reg_id) یافت نشد');
        setSubmitting(false);
        return;
      }

      const data = {
        admission_request_id: selectedRequest?.id || admissionId,
        patient_id: selectedRequest?.patient_id || admission?.patient_id,
        reg_id: regId,
        doctor_id: selectedRequest?.doctor_id || admission?.doctor_id || null,

        fee_date: values.fee_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        fee_time: values.fee_time?.format('HH:mm') || moment().format('HH:mm'),

        amount: toNumber(values.amount),
        paid_amount: toNumber(values.paid_amount),
        discount: toNumber(values.discount),
        discount_percent: toNumber(values.discount),

        fee_type: values.fee_type || 'daily',
        period: values.period || 'full_day',
        day_number: values.day_number || calculateDayNumber(selectedRequest?.admission_date),

        description: values.description || '',
        notes: values.note || values.notes || '',

        payment_method: values.payment_method || 'cash',
      };

      console.log('📤 ارسال داده به Backend:', data);
      console.log('📤 fee_type:', data.fee_type, '| period:', data.period);

      const response = await api.post('/admission-fees', data);

      if (response.data?.success) {
        toast.success('✅ فیس بستری با موفقیت ایجاد شد');
        setModalVisible(false);
        feeForm.resetFields();
        setSelectedRequest(null);
        await fetchAllData();
      } else {
        toast.error(response.data?.message || 'خطا در ایجاد فیس');
      }
    } catch (error) {
      console.error('❌ خطای کامل:', error.response?.data);
      console.error('❌ خطاها:', error.response?.data?.errors);

      const errors = error.response?.data?.errors;
      if (errors) {
        Object.keys(errors).forEach(field => {
          const messages = errors[field];
          if (Array.isArray(messages)) {
            messages.forEach(msg => toast.error(`❌ ${field}: ${msg}`));
          } else {
            toast.error(`❌ ${field}: ${messages}`);
          }
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('خطا در ایجاد فیس بستری');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // ✅ ویرایش فیس
  // ============================================================
  const handleEditFee = async (values) => {
    if (!editingFee) return;
    setSubmitting(true);
    try {
      const data = {
        amount: toNumber(values.amount),
        paid_amount: toNumber(values.paid_amount),
        discount: toNumber(values.discount),
        discount_percent: toNumber(values.discount),
        payment_method: values.payment_method || 'cash',
        fee_type: values.fee_type || 'daily',
        period: values.period || 'full_day',
        day_number: values.day_number || 1,
        fee_date: values.fee_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        fee_time: values.fee_time?.format('HH:mm') || moment().format('HH:mm'),
        description: values.description || '',
        notes: values.note || values.notes || '',
      };

      console.log('📤 ویرایش فیس:', data);
      const response = await api.put(`/admission-fees/${editingFee.id}`, data);
      
      if (response.data?.success) {
        toast.success('✅ فیس با موفقیت ویرایش شد');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingFee(null);
        await fetchAllData();
      } else {
        toast.error(response.data?.message || 'خطا در ویرایش');
      }
    } catch (error) {
      console.error('❌ خطای ویرایش:', error.response?.data);
      
      const errors = error.response?.data?.errors;
      if (errors) {
        Object.keys(errors).forEach(field => {
          const messages = errors[field];
          if (Array.isArray(messages)) {
            messages.forEach(msg => toast.error(`❌ ${field}: ${msg}`));
          } else {
            toast.error(`❌ ${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.response?.data?.message || 'خطا در ویرایش');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ============ دریافت فیس ============
  const handleCollectFee = async (id) => {
    Modal.confirm({
      title: 'تایید دریافت فیس',
      content: 'آیا از دریافت این فیس اطمینان دارید؟',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          await api.post(`/admission-fees/${id}/collect`);
          toast.success('✅ فیس با موفقیت دریافت شد');
          await fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.message || 'خطا');
        }
      }
    });
  };

  // ============ حذف فیس ============
  const handleDeleteFee = async (id) => {
    Modal.confirm({
      title: 'تایید حذف',
      content: 'آیا از حذف این فیس اطمینان دارید؟',
      okText: 'حذف',
      okType: 'danger',
      cancelText: 'انصراف',
      onOk: async () => {
        try {
          await api.delete(`/admission-fees/${id}`);
          toast.success('✅ فیس با موفقیت حذف شد');
          await fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.message || 'خطا');
        }
      }
    });
  };

  // ============ پرینت رسید فیس ============
  const handlePrintReceipt = async (id) => {
    try {
      const response = await api.get(`/admission-fees/${id}/print`);
      const rawData = response.data.data;
      const normalizedData = {
        ...rawData,
        patient: extractPatientInfo(rawData.patient || rawData) || rawData.patient,
        admission: rawData.admission || rawData.admission_request || null,
        fee: rawData.fee || rawData,
      };
      setReceiptData(normalizedData);
      setReceiptModal(true);
      await api.post(`/admission-fees/${id}/increment-print`);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات پرینت');
    }
  };

  // ============ پرینت جزییات ترخیص ============
  const handlePrintDischargeReceipt = (request) => {
    try {
      const feeInfo = fees.find(f => f.admission_request_id === request.id);

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>رسید ترخیص بیمار</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
                body { font-family: 'Vazirmatn', 'Tahoma', sans-serif; padding: 30px; direction: rtl; background: #fff; color: #000; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; color: #ef4444; margin-bottom: 5px; }
                .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
                .section-title { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e5e7eb; }
                .label { font-weight: bold; color: #6b7280; font-size: 13px; }
                .value { color: #000; font-size: 13px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #333; font-size: 12px; color: #666; }
                .signature { display: flex; justify-content: space-between; margin-top: 40px; }
                .signature-box { text-align: center; width: 200px; }
                .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; font-size: 12px; }
                @media print { body { padding: 15px; } .section { background: #fff; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">🏥 رسید ترخیص بیمار</div>
                <div style="font-size: 14px; color: #555;">بیمارستان</div>
              </div>

              <div class="section">
                <div class="section-title">👤 اطلاعات بیمار</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">نام بیمار:</span>
                    <span class="value">${getPatientFullName(request)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">شماره مراجعه:</span>
                    <span class="value">${request.reg_id || '-'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">شماره تذکره:</span>
                    <span class="value">${getPatientNationalId(request)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">شماره تماس:</span>
                    <span class="value">${getPatientMobile(request)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">سن:</span>
                    <span class="value">${getPatientAge(request)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">جنسیت:</span>
                    <span class="value">${getPatientGender(request)}</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">🏥 اطلاعات بستری</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">شماره بستری:</span>
                    <span class="value">#${request.id}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">بخش:</span>
                    <span class="value">${getWardName(request)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">موقعیت:</span>
                    <span class="value">${getLocationDisplay(request)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">تاریخ بستری:</span>
                    <span class="value">${formatDate(request.admission_date)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">تعداد روزهای بستری:</span>
                    <span class="value">${calculateDayNumber(request.admission_date)} روز</span>
                  </div>
                  <div class="info-row">
                    <span class="label">تشخیص:</span>
                    <span class="value">${request.diagnosis || '-'}</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">🚪 اطلاعات ترخیص</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">تاریخ ترخیص:</span>
                    <span class="value">${formatDate(request.discharge_date)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">ساعت ترخیص:</span>
                    <span class="value">${request.discharge_time || '-'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">نوع ترخیص:</span>
                    <span class="value">${getDischargeTypeLabel(request.discharge_type)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">ترخیص توسط:</span>
                    <span class="value">${request.discharged_by || '-'}</span>
                  </div>
                  <div class="info-row" style="grid-column: span 2;">
                    <span class="label">دلیل ترخیص:</span>
                    <span class="value">${request.discharge_reason || '-'}</span>
                  </div>
                  ${request.discharge_notes ? `
                  <div class="info-row" style="grid-column: span 2;">
                    <span class="label">یادداشت‌ها:</span>
                    <span class="value">${request.discharge_notes}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              ${feeInfo ? `
              <div class="section">
                <div class="section-title">💰 اطلاعات مالی</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">مبلغ کل:</span>
                    <span class="value">${toNumber(feeInfo.amount).toLocaleString()} AFN</span>
                  </div>
                  <div class="info-row">
                    <span class="label">پرداخت شده:</span>
                    <span class="value">${toNumber(feeInfo.paid_amount).toLocaleString()} AFN</span>
                  </div>
                  <div class="info-row">
                    <span class="label">تخفیف:</span>
                    <span class="value">${toNumber(feeInfo.discount_percent || feeInfo.discount || 0)}%</span>
                  </div>
                  <div class="info-row">
                    <span class="label">وضعیت:</span>
                    <span class="value">${getStatusLabel(feeInfo.status)?.label || '-'}</span>
                  </div>
                </div>
              </div>
              ` : ''}

              ${request.admission_instructions ? `
              <div class="section">
                <div class="section-title">📋 دستورالعمل‌های بستری</div>
                <div style="font-size: 13px; line-height: 1.8; color: #333;">
                  ${request.admission_instructions.split('\n').map(line => line.trim() ? `<div>${line}</div>` : '').join('')}
                </div>
              </div>
              ` : ''}

              <div class="signature">
                <div class="signature-box">
                  <div class="signature-line">امضای داکتر معالج</div>
                </div>
                <div class="signature-box">
                  <div class="signature-line">امضای مسئول پذیرش</div>
                </div>
              </div>

              <div class="footer">
                <p>تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} - ساعت: ${new Date().toLocaleTimeString('fa-IR')}</p>
                <p>این رسید به عنوان مدرک ترخیص صادر شده است</p>
              </div>

              <script>
                window.onload = function() { window.print(); }
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('❌ خطا در پرینت ترخیص:', error);
      toast.error('خطا در پرینت جزییات ترخیص');
    }
  };

  // ============ باز کردن فرم فیس ============
  const handleOpenFeeForm = (request = null) => {
    setSelectedRequest(request);
    setEditingFee(null);
    feeForm.resetFields();
    
    const defaultAmount = toNumber(request?.fee_amount || admission?.fee_amount || 0);
    const dayNumber = calculateDayNumber(request?.admission_date);
    
    feeForm.setFieldsValue({
      amount: defaultAmount || 0,
      paid_amount: 0,
      discount: 0,
      payment_method: 'cash',
      fee_date: moment(),
      fee_time: moment(),
      fee_type: 'daily',
      period: 'full_day',
      day_number: dayNumber,
      description: request 
        ? `بستری: ${request.admission_type || ''} - ${request.ward_name || ''}`
        : `بستری: ${admission?.ward?.name || ''}`,
      note: request ? `درخواست بارکد: ${request.barcode || ''}` : ''
    });
    setModalVisible(true);
  };

  // ============ باز کردن فرم ویرایش فیس ============
  const handleOpenEditForm = (fee) => {
    setEditingFee(fee);
    editForm.resetFields();
    editForm.setFieldsValue({
      amount: toNumber(fee.amount || 0),
      paid_amount: toNumber(fee.paid_amount || 0),
      discount: toNumber(fee.discount_percent || fee.discount || 0),
      payment_method: fee.payment_method || 'cash',
      fee_date: moment(fee.fee_date),
      fee_time: moment(fee.fee_time, 'HH:mm:ss'),
      fee_type: fee.fee_type || 'daily',
      period: fee.period || 'full_day',
      day_number: fee.day_number || 1,
      description: fee.description || '',
      note: fee.notes || ''
    });
    setEditModalVisible(true);
  };

  // ============================================================
  // ✅ ترخیص مستقیم
  // ============================================================
  const handleOpenDischargeModal = (request) => {
    setSelectedRequest(request);
    dischargeForm.resetFields();
    dischargeForm.setFieldsValue({
      discharge_date: moment(),
      discharge_type: 'regular',
      discharge_reason: '',
      discharge_notes: ''
    });
    setDischargeModalVisible(true);
  };

  const handleSubmitDischarge = async (values) => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const data = {
        discharge_date: values.discharge_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        discharge_type: values.discharge_type || 'regular',
        discharge_reason: values.discharge_reason,
        discharge_notes: values.discharge_notes || ''
      };

      console.log(`📤 ترخیص بستری #${selectedRequest.id}:`, data);
      const response = await api.post(`/admissions/${selectedRequest.id}/discharge`, data);
      
      if (response.data?.success) {
        toast.success('✅ بیمار با موفقیت ترخیص شد');
        setDischargeModalVisible(false);
        dischargeForm.resetFields();
        setSelectedRequest(null);
        await fetchAllData();
      } else {
        toast.error(response.data?.message || 'خطا در ترخیص');
      }
    } catch (error) {
      console.error('❌ خطا در ترخیص:', error);
      toast.error(error.response?.data?.message || 'خطا در ترخیص بیمار');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // ✅ انتقال مستقیم
  // ============================================================
  const handleOpenTransferModal = (request) => {
    setSelectedRequest(request);
    transferForm.resetFields();
    transferForm.setFieldsValue({
      transfer_date: moment(),
      new_ward_id: undefined,
      transfer_reason: '',
      transfer_notes: '',
      priority: 'normal'
    });
    setTransferModalVisible(true);
  };

  const handleSubmitTransfer = async (values) => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const selectedWard = wards.find(w => String(w.id) === String(values.new_ward_id));
      
      const data = {
        ward_id: values.new_ward_id,
        new_ward_name: selectedWard?.name || '',
        transfer_date: values.transfer_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        transfer_reason: values.transfer_reason,
        transfer_notes: values.transfer_notes || '',
        priority: values.priority || 'normal',
        transfer_type: 'transfer',
        diagnosis: selectedRequest.diagnosis
      };

      console.log(`📤 انتقال بستری #${selectedRequest.id}:`, data);
      const response = await api.put(`/admissions/${selectedRequest.id}`, data);
      
      if (response.data?.success) {
        toast.success(`✅ بیمار به بخش "${selectedWard?.name}" منتقل شد`);
        setTransferModalVisible(false);
        transferForm.resetFields();
        setSelectedRequest(null);
        await fetchAllData();
      } else {
        toast.error(response.data?.message || 'خطا در انتقال');
      }
    } catch (error) {
      console.error('❌ خطا در انتقال:', error);
      toast.error(error.response?.data?.message || 'خطا در انتقال بیمار');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ Helper Functions ============
  const calculateDayNumber = (admissionDate) => {
    if (!admissionDate) return 1;
    return moment().diff(moment(admissionDate), 'days') + 1;
  };

  const getMethodLabel = (method) => {
    const methods = {
      cash: 'نقدی', card: 'کارت بانکی', online: 'آنلاین',
      bank_transfer: 'انتقال بانکی', insurance: 'بیمه'
    };
    return methods[method] || method || '-';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: { label: 'در انتظار', color: '#f59e0b', icon: <ClockCircleOutlined /> },
      paid: { label: 'دریافت شده', color: '#22c55e', icon: <CheckCircleOutlined /> },
      cancelled: { label: 'لغو شده', color: '#ef4444', icon: <CloseCircleOutlined /> },
      refunded: { label: 'بازگشت داده شده', color: '#6b7280', icon: <CloseCircleOutlined /> }
    };
    return statusMap[status] || { label: status, color: '#6b7280', icon: null };
  };

  const getDischargeTypeLabel = (type) => {
    const types = {
      regular: 'ترخیص عادی',
      against_advice: 'ترخیص با رضایت شخصی',
      transferred: 'انتقال به مرکز دیگر',
      deceased: 'فوت',
      escaped: 'فرار از بیمارستان'
    };
    return types[type] || type || '-';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try { return moment(date).format('jYYYY/jMM/jDD'); }
    catch { return moment(date).format('YYYY/MM/DD'); }
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    try { return moment(date).format('jYYYY/jMM/jDD HH:mm'); }
    catch { return moment(date).format('YYYY/MM/DD HH:mm'); }
  };

  // ============ استخراج اطلاعات بیمار ============
  const getPatientFullName = (source) => {
    if (!source) return 'نامشخص';
    if (source.full_name) return source.full_name;
    if (source.patient_name) return source.patient_name;
    if (source.patient?.full_name) return source.patient.full_name;
    if (source.patient?.first_name || source.patient?.last_name) {
      const name = `${source.patient.first_name || ''} ${source.patient.last_name || ''}`.trim();
      if (name) return name;
    }
    if (source.admission_request?.patient?.full_name) return source.admission_request.patient.full_name;
    if (source.admission_request?.patient?.first_name || source.admission_request?.patient?.last_name) {
      const name = `${source.admission_request.patient.first_name || ''} ${source.admission_request.patient.last_name || ''}`.trim();
      if (name) return name;
    }
    if (source.admission_request?.patient_name) return source.admission_request.patient_name;
    if (source.admission_request?.full_name) return source.admission_request.full_name;
    if (source.admission?.patient?.full_name) return source.admission.patient.full_name;
    if (source.admission?.patient_name) return source.admission.patient_name;
    if (source.first_name || source.last_name) {
      const name = `${source.first_name || ''} ${source.last_name || ''}`.trim();
      if (name) return name;
    }
    return 'نامشخص';
  };

  const getPatientAge = (source) => {
    if (!source) return '-';
    const age = source.age || source.patient?.age || 
                source.admission_request?.patient?.age ||
                source.admission_request?.age ||
                source.admission?.patient?.age;
    return age ? `${age} سال` : '-';
  };

  const getPatientGender = (source) => {
    if (!source) return '-';
    let gender = source.gender || source.patient?.gender || 
                 source.admission_request?.patient?.gender ||
                 source.admission_request?.gender ||
                 source.admission?.patient?.gender;
    if (gender) {
      const genderMap = {
        'Male': 'مرد', 'male': 'مرد', 'M': 'مرد', 'm': 'مرد',
        'Female': 'زن', 'female': 'زن', 'F': 'زن', 'f': 'زن',
        'other': 'دیگر', 'Other': 'دیگر'
      };
      return genderMap[gender] || gender;
    }
    return '-';
  };

  const getPatientMobile = (source) => {
    if (!source) return '-';
    return source.mobile || source.patient?.mobile || source.patient?.phone ||
           source.admission_request?.patient?.mobile ||
           source.admission_request?.patient?.phone ||
           source.admission_request?.mobile ||
           source.admission_request?.phone ||
           source.admission?.patient?.mobile || '-';
  };

  const getPatientNationalId = (source) => {
    if (!source) return '-';
    return source.national_id || source.patient?.national_id ||
           source.admission_request?.patient?.national_id ||
           source.admission_request?.national_id ||
           source.admission?.patient?.national_id || '-';
  };

  const getLocationDisplay = (source) => {
    if (!source) return '-';
    const parts = [];
    if (source.location) parts.push(source.location);
    if (source.room_number) parts.push(`اتاق: ${source.room_number}`);
    if (source.bed_number) parts.push(`تخت: ${source.bed_number}`);
    if (parts.length === 0 && source.admission_request) {
      const ar = source.admission_request;
      if (ar.location) parts.push(ar.location);
      if (ar.room_number) parts.push(`اتاق: ${ar.room_number}`);
      if (ar.bed_number) parts.push(`تخت: ${ar.bed_number}`);
    }
    if (parts.length === 0 && source.admission) {
      const ad = source.admission;
      if (ad.location) parts.push(ad.location);
      if (ad.room_number) parts.push(`اتاق: ${ad.room_number}`);
      if (ad.bed?.bed_number) parts.push(`تخت: ${ad.bed.bed_number}`);
      if (ad.bed_number) parts.push(`تخت: ${ad.bed_number}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  const getWardName = (source) => {
    if (!source) return '-';
    return source.ward_name || source.ward?.name ||
           source.admission_request?.ward_name ||
           source.admission_request?.ward?.name ||
           source.admission?.ward?.name || '-';
  };

  const getFilteredRequests = () => {
    if (filterMode === 'unpaid') return unpaidRequests;
    if (filterMode === 'paid') return paidRequests;
    if (filterMode === 'alert') return alertRequests;
    return allRequests;
  };

  const displayRequests = getFilteredRequests();

  // ============ کامپوننت اطلاعات بیمار در مودال ============
  const ModalPatientInfo = ({ request, variant = 'info' }) => {
    if (!request) return null;
    const boxStyle = variant === 'danger' 
      ? styles.modalPatientInfoBoxDanger 
      : variant === 'info' 
        ? styles.modalPatientInfoBoxInfo 
        : styles.modalPatientInfoBox;
    
    return (
      <div style={boxStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <span style={styles.modalInfoLabel}>👤 نام بیمار</span>
            <div style={styles.modalInfoValue}>{getPatientFullName(request)}</div>
          </div>
          <div>
            <span style={styles.modalInfoLabel}>🆔 شماره مراجعه</span>
            <div style={styles.modalInfoValue}>{request.reg_id || '-'}</div>
          </div>
          <div>
            <span style={styles.modalInfoLabel}>🏥 بخش</span>
            <div style={styles.modalInfoValueNormal}>{getWardName(request)}</div>
          </div>
          <div>
            <span style={styles.modalInfoLabel}>📍 موقعیت</span>
            <div style={styles.modalInfoValueNormal}>{getLocationDisplay(request)}</div>
          </div>
          <div>
            <span style={styles.modalInfoLabel}>🎂 سن / ⚤ جنسیت</span>
            <div style={styles.modalInfoValueNormal}>
              {getPatientAge(request)} / {getPatientGender(request)}
            </div>
          </div>
          <div>
            <span style={styles.modalInfoLabel}>📅 روز بستری</span>
            <div style={styles.modalInfoValueNormal}>
              روز {calculateDayNumber(request.admission_date)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ رندر لیست درخواست‌ها ============
  const renderRequestsList = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ color: '#9ca3af', marginTop: '10px' }}>در حال بارگذاری...</p>
        </div>
      );
    }

    if (displayRequests.length === 0) {
      return (
        <Empty
          description={
            <span style={{ color: '#9ca3af' }}>
              {filterMode === 'unpaid' && 'هیچ درخواست بدون فیس وجود ندارد'}
              {filterMode === 'paid' && 'هیچ درخواست دارای فیس وجود ندارد'}
              {filterMode === 'alert' && 'هیچ هشدار فعالی وجود ندارد'}
              {filterMode === 'all' && 'هیچ درخواست بستری ثبت نشده است'}
            </span>
          }
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayRequests.map((request, index) => {
          const hasFeeRecord = request.has_fee === true || (request.fee_id !== null && request.fee_id !== undefined && request.fee_id !== 0);
          const feeInfo = fees.find(f => f.admission_request_id === request.id);
          const isAlert = filterMode === 'alert' || (request.last_fee_alert_at && moment().diff(moment(request.last_fee_alert_at), 'hours') >= 24);
          
          const remainingAmount = feeInfo ? calculateRemaining(
            feeInfo.amount, feeInfo.paid_amount,
            feeInfo.discount_percent || feeInfo.discount || 0
          ) : 0;
          
          const isDischarged = request.status === 'discharged' 
                              || request.is_discharged === true
                              || (request.discharge_date && request.status !== 'admitted');
          
          return (
            <div
              key={request.id || index}
              style={{
                ...styles.requestItem,
                borderRightColor: isDischarged ? '#6b7280' : (isAlert ? '#ef4444' : (hasFeeRecord ? '#22c55e' : '#f59e0b'))
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge count={index + 1} style={{ backgroundColor: '#ef4444' }} />
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                      {getPatientFullName(request)}
                    </span>
                    {request.barcode && <Tag color="gold">🏷️ {request.barcode}</Tag>}
                    <Tag color={hasFeeRecord ? 'green' : 'orange'}>
                      {hasFeeRecord ? '✅ دارای فیس' : '❌ بدون فیس'}
                    </Tag>
                    {isAlert && (
                      <Tag color="red" icon={<BellOutlined />}>⏰ نیاز به هشدار</Tag>
                    )}
                    {isDischarged && (
                      <Tag color="default" icon={<LogoutOutlined />}>🚪 ترخیص شده</Tag>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', gap: '15px', flexWrap: 'wrap',
                    marginTop: '8px', padding: '8px 12px',
                    backgroundColor: 'rgba(15, 26, 42, 0.8)',
                    borderRadius: '6px', border: '1px solid #2a3a4a'
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      <UserOutlined /> {getPatientFullName(request)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>🎂 {getPatientAge(request)}</span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>⚤ {getPatientGender(request)}</span>
                    {getPatientMobile(request) !== '-' && (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>📞 {getPatientMobile(request)}</span>
                    )}
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>🏥 {getWardName(request)}</span>
                    <span style={{ color: '#fcd34d', fontSize: '12px' }}>
                      <EnvironmentOutlined /> {getLocationDisplay(request)}
                    </span>
                  </div>

                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '5px' }}>
                    📅 {formatDateTime(request.request_date || request.created_at)}
                    {request.status && (
                      <span style={{ marginRight: '15px' }}>| وضعیت: {request.status_label || request.status}</span>
                    )}
                    {request.admission_date && (
                      <span style={{ marginRight: '15px' }}>| روز بستری: {calculateDayNumber(request.admission_date)}</span>
                    )}
                    {request.discharge_date && (
                      <span style={{ marginRight: '15px', color: '#22c55e' }}>
                        | تاریخ ترخیص: {formatDate(request.discharge_date)}
                      </span>
                    )}
                  </div>

                  {hasFeeRecord && feeInfo && (
                    <div style={{
                      marginTop: '8px', padding: '8px 12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '6px', border: '1px solid #22c55e'
                    }}>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
                        <span style={{ color: '#fcd34d' }}>
                          💰 مبلغ کل: {toNumber(feeInfo.amount).toFixed(2)} AFN
                        </span>
                        <span style={{ color: '#22c55e' }}>
                          ✅ پرداخت شده: {toNumber(feeInfo.paid_amount).toFixed(2)} AFN
                        </span>
                        <span style={{ 
                          color: remainingAmount <= 0 ? '#22c55e' : '#ef4444',
                          fontWeight: 'bold'
                        }}>
                          📊 باقی‌مانده: {remainingAmount.toFixed(2)} AFN
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexDirection: 'column' }}>
                  {!hasFeeRecord ? (
                    <Button
                      type="primary"
                      icon={<DollarOutlined />}
                      onClick={() => handleOpenFeeForm(request)}
                      style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                    >
                      اخذ فیس
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedRequest(request);
                          setModalVisible(true);
                        }}
                      >
                        مشاهده
                      </Button>
                      {feeInfo && feeInfo.status !== 'paid' && (
                        <Button
                          type="default"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEditForm(feeInfo)}
                        >
                          ویرایش فیس
                        </Button>
                      )}
                      {feeInfo && feeInfo.status === 'pending' && remainingAmount > 0 && (
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleCollectFee(feeInfo.id)}
                          style={{ backgroundColor: '#22c55e', borderColor: '#22c55e' }}
                        >
                          دریافت فیس
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* فقط اگر ترخیص نشده باشد */}
                  {!isDischarged && (
                    <>
                      <Button
                        type="primary"
                        danger
                        icon={<LogoutOutlined />}
                        onClick={() => handleOpenDischargeModal(request)}
                      >
                        🚪 ترخیص مستقیم
                      </Button>
                      <Button
                        type="primary"
                        icon={<SwapOutlined />}
                        onClick={() => handleOpenTransferModal(request)}
                        style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
                      >
                        🔄 انتقال به بخش دیگر
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============ رندر لیست بیماران ترخیص شده ============
  const renderDischargedList = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ color: '#9ca3af', marginTop: '10px' }}>در حال بارگذاری...</p>
        </div>
      );
    }

    if (dischargedRequests.length === 0) {
      return (
        <Empty
          description={
            <span style={{ color: '#9ca3af' }}>
              هیچ بیمار ترخیص شده‌ای وجود ندارد
            </span>
          }
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {dischargedRequests.map((request, index) => {
          const feeInfo = fees.find(f => f.admission_request_id === request.id);
          const remainingAmount = feeInfo ? calculateRemaining(
            feeInfo.amount, feeInfo.paid_amount,
            feeInfo.discount_percent || feeInfo.discount || 0
          ) : 0;

          return (
            <div
              key={request.id || index}
              style={{
                ...styles.requestItem,
                borderRightColor: '#6b7280',
                background: 'linear-gradient(135deg, #2a2a3a 0%, #1a1a2e 100%)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  {/* هدر */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge count={index + 1} style={{ backgroundColor: '#6b7280' }} />
                    <span style={{ color: '#e5e7eb', fontWeight: 'bold', fontSize: '15px' }}>
                      👤 {getPatientFullName(request)}
                    </span>
                    <Tag color="default" icon={<LogoutOutlined />}>🚪 ترخیص شده</Tag>
                    {request.discharge_type && (
                      <Tag color="blue">{getDischargeTypeLabel(request.discharge_type)}</Tag>
                    )}
                    {feeInfo && (
                      <Tag color={feeInfo.status === 'paid' ? 'green' : 'orange'}>
                        {feeInfo.status === 'paid' ? '✅ پرداخت کامل' : '⏳ پرداخت ناقص'}
                      </Tag>
                    )}
                  </div>

                  {/* اطلاعات بیمار */}
                  <div style={{
                    display: 'flex', gap: '15px', flexWrap: 'wrap',
                    marginTop: '8px', padding: '8px 12px',
                    backgroundColor: 'rgba(15, 26, 42, 0.8)',
                    borderRadius: '6px', border: '1px solid #2a3a4a'
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      🆔 #{request.id}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      🎂 {getPatientAge(request)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      ⚤ {getPatientGender(request)}
                    </span>
                    {getPatientMobile(request) !== '-' && (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        📞 {getPatientMobile(request)}
                      </span>
                    )}
                    {getPatientNationalId(request) !== '-' && (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        🪪 {getPatientNationalId(request)}
                      </span>
                    )}
                  </div>

                  {/* اطلاعات بستری و ترخیص */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '10px',
                    marginTop: '8px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid #4b5563'
                  }}>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '11px' }}>🏥 بخش:</span>
                      <span style={{ color: '#e5e7eb', fontSize: '12px', marginLeft: '8px' }}>
                        {getWardName(request)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '11px' }}>📍 موقعیت:</span>
                      <span style={{ color: '#e5e7eb', fontSize: '12px', marginLeft: '8px' }}>
                        {getLocationDisplay(request)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '11px' }}>📅 تاریخ بستری:</span>
                      <span style={{ color: '#e5e7eb', fontSize: '12px', marginLeft: '8px' }}>
                        {formatDate(request.admission_date)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '11px' }}>🚪 تاریخ ترخیص:</span>
                      <span style={{ color: '#22c55e', fontSize: '12px', marginLeft: '8px', fontWeight: 'bold' }}>
                        {formatDate(request.discharge_date)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '11px' }}>⏱️ مدت بستری:</span>
                      <span style={{ color: '#fcd34d', fontSize: '12px', marginLeft: '8px', fontWeight: 'bold' }}>
                        {calculateDayNumber(request.admission_date)} روز
                      </span>
                    </div>
                    {request.discharged_by && (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>👨‍⚕️ ترخیص توسط:</span>
                        <span style={{ color: '#e5e7eb', fontSize: '12px', marginLeft: '8px' }}>
                          {request.discharged_by}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* تشخیص */}
                  {request.diagnosis && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid #3b82f6',
                      fontSize: '12px',
                      color: '#dbeafe'
                    }}>
                      <strong>🔬 تشخیص:</strong> {request.diagnosis}
                    </div>
                  )}

                  {/* دلیل ترخیص */}
                  {request.discharge_reason && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid #ef4444',
                      fontSize: '12px',
                      color: '#fecaca'
                    }}>
                      <strong>📝 دلیل ترخیص:</strong> {request.discharge_reason}
                    </div>
                  )}

                  {/* اطلاعات فیس */}
                  {feeInfo && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid #22c55e'
                    }}>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
                        <span style={{ color: '#fcd34d' }}>
                          💰 مبلغ کل: {toNumber(feeInfo.amount).toFixed(2)} AFN
                        </span>
                        <span style={{ color: '#22c55e' }}>
                          ✅ پرداخت شده: {toNumber(feeInfo.paid_amount).toFixed(2)} AFN
                        </span>
                        <span style={{
                          color: remainingAmount <= 0 ? '#22c55e' : '#ef4444',
                          fontWeight: 'bold'
                        }}>
                          📊 باقی‌مانده: {remainingAmount.toFixed(2)} AFN
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexDirection: 'column' }}>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={() => handlePrintDischargeReceipt(request)}
                    style={{ backgroundColor: '#6b7280', borderColor: '#6b7280' }}
                  >
                    🖨️ پرینت جزییات ترخیص
                  </Button>
                  {feeInfo && (
                    <Button
                      type="default"
                      icon={<DollarOutlined />}
                      onClick={() => handlePrintReceipt(feeInfo.id)}
                    >
                      🖨️ پرینت رسید فیس
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============ ستون‌های جدول فیس‌ها ============
  const feeColumns = [
    { title: 'شماره', key: 'index', render: (_, __, index) => index + 1, width: 50 },
    { title: 'شماره رسید', dataIndex: 'receipt_number', key: 'receipt_number', render: (val) => val || '-' },
    { title: 'نام بیمار', key: 'patient_name', render: (_, record) => getPatientFullName(record) },
    { title: 'سن', key: 'age', render: (_, record) => getPatientAge(record) },
    { title: 'جنسیت', key: 'gender', render: (_, record) => getPatientGender(record) },
    { title: 'بخش', key: 'ward_name', render: (_, record) => getWardName(record) },
    { title: 'موقعیت', key: 'location', render: (_, record) => getLocationDisplay(record) },
    { title: 'مبلغ کل', dataIndex: 'amount', key: 'amount', render: (amount) => <span style={{ color: '#d48806' }}>{toNumber(amount).toLocaleString()} AFN</span> },
    { title: 'پرداخت شده', dataIndex: 'paid_amount', key: 'paid_amount', render: (amount) => <span style={{ color: '#16a34a' }}>{toNumber(amount).toLocaleString()} AFN</span> },
    { title: 'تخفیف', key: 'discount', render: (_, record) => `${toNumber(record.discount_percent || record.discount || 0)}%` },
    {
      title: 'باقی‌مانده', key: 'remaining',
      render: (_, record) => {
        const remaining = calculateRemaining(record.amount, record.paid_amount, record.discount_percent || record.discount || 0);
        return <span style={{ color: remaining <= 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{remaining.toFixed(2)} AFN</span>;
      }
    },
    { title: 'روش پرداخت', dataIndex: 'payment_method', key: 'payment_method', render: (method) => getMethodLabel(method) },
    {
      title: 'وضعیت', dataIndex: 'status', key: 'status',
      render: (status) => {
        const info = getStatusLabel(status);
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>;
      }
    },
    { title: 'تاریخ', dataIndex: 'fee_date', key: 'fee_date', render: (date) => formatDate(date) },
    {
      title: 'عملیات', key: 'actions',
      render: (_, record) => {
        const remaining = calculateRemaining(record.amount, record.paid_amount, record.discount_percent || record.discount || 0);
        return (
          <Space>
            <Tooltip title="مشاهده">
              <Button type="default" size="small" icon={<EyeOutlined />}
                onClick={() => { setSelectedRequest(record.admission_request || record); setModalVisible(true); }} />
            </Tooltip>
            {record.status !== 'paid' && (
              <Tooltip title="ویرایش">
                <Button type="default" size="small" icon={<EditOutlined />}
                  onClick={() => handleOpenEditForm(record)} />
              </Tooltip>
            )}
            <Tooltip title="پرینت">
              <Button type="default" size="small" icon={<PrinterOutlined />}
                onClick={() => handlePrintReceipt(record.id)} />
            </Tooltip>
            {record.status === 'pending' && remaining > 0 && (
              <Tooltip title="دریافت فیس">
                <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                  onClick={() => handleCollectFee(record.id)}
                  style={{ backgroundColor: '#22c55e', borderColor: '#22c55e' }} />
              </Tooltip>
            )}
            {record.status !== 'paid' && (
              <Tooltip title="حذف">
                <Button danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDeleteFee(record.id)} />
              </Tooltip>
            )}
          </Space>
        );
      },
    }
  ];

  // ============ تب‌ها ============
  const tabItems = [
    {
      key: 'requests',
      label: <span><FileTextOutlined /> درخواست‌های بستری</span>,
      children: (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Button type={filterMode === 'all' ? 'primary' : 'default'} onClick={() => setFilterMode('all')}>
              📋 همه ({allRequests.length})
            </Button>
            <Button type={filterMode === 'unpaid' ? 'primary' : 'default'} onClick={() => setFilterMode('unpaid')}
              style={filterMode === 'unpaid' ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' } : {}}>
              🟡 بدون فیس ({unpaidRequests.length})
            </Button>
            <Button type={filterMode === 'paid' ? 'primary' : 'default'} onClick={() => setFilterMode('paid')}
              style={filterMode === 'paid' ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : {}}>
              🟢 دارای فیس ({paidRequests.length})
            </Button>
            <Button type={filterMode === 'alert' ? 'primary' : 'default'} onClick={() => setFilterMode('alert')}
              style={filterMode === 'alert' ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}}>
              🔔 هشدارها ({alertRequests.length})
            </Button>
          </div>
          {renderRequestsList()}
        </>
      ),
    },
    {
      key: 'discharged',
      label: (
        <span>
          <LogoutOutlined /> بیماران ترخیص شده
          {dischargedRequests.length > 0 && (
            <Badge 
              count={dischargedRequests.length} 
              style={{ marginLeft: '8px', backgroundColor: '#6b7280' }} 
            />
          )}
        </span>
      ),
      children: (
        <>
          <Alert
            message={`${dischargedRequests.length} بیمار ترخیص شده`}
            description="لیست بیمارانی که از بخش بستری ترخیص شده‌اند. می‌توانید جزییات کامل ترخیص را پرینت کنید."
            type="info"
            showIcon
            style={{ marginBottom: '20px' }}
          />
          {renderDischargedList()}
        </>
      ),
    },
    {
      key: 'fees',
      label: <span><DollarOutlined /> لیست فیس‌ها</span>,
      children: (
        <Table
          columns={feeColumns}
          dataSource={fees}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: <Empty description="هیچ فیسی ثبت نشده است" /> }}
        />
      ),
    },
    {
      key: 'alerts',
      label: <span><BellOutlined /> هشدارها</span>,
      children: (
        alertRequests.length > 0 ? (
          <>
            <Alert
              message={`${alertRequests.length} هشدار فعال`}
              description="بیمارانی که بیش از 24 ساعت از آخرین هشدار آنها گذشته است"
              type="warning" showIcon style={{ marginBottom: '20px' }}
            />
            <List
              dataSource={alertRequests}
              renderItem={(item) => {
                const fee = fees.find(f => f.admission_request_id === item.id || f.id === item.fee_id);
                const remaining = fee ? calculateRemaining(fee.amount, fee.paid_amount, fee.discount_percent || fee.discount || 0) : 0;
                return (
                  <List.Item style={styles.alertCard}
                    actions={[
                      fee && (
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                          onClick={() => handleCollectFee(fee.id)}>
                          دریافت فیس
                        </Button>
                      )
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                      title={
                        <span>
                          <strong>{getPatientFullName(item)}</strong>
                          {item.last_fee_alert_at && (
                            <Tag color="red" style={{ marginLeft: '10px' }}>
                              ⏰ {moment(item.last_fee_alert_at).fromNow()}
                            </Tag>
                          )}
                        </span>
                      }
                      description={
                        <div>
                          <p>🏥 {getWardName(item)} | {getLocationDisplay(item)}</p>
                          <p>💰 مبلغ کل: {toNumber(item.fee_amount || fee?.amount || 0).toLocaleString()} AFN</p>
                          <p>📊 باقی‌مانده: <span style={{ color: remaining <= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{remaining.toFixed(2)} AFN</span></p>
                          <p>📞 تماس: {getPatientMobile(item)}</p>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </>
        ) : (
          <Empty description="هیچ هشدار فعالی وجود ندارد" />
        )
      ),
    }
  ];

  // ============ رندر اصلی ============
  return (
    <div style={styles.container}>
      {/* هدر */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ color: '#ef4444', margin: 0 }}>🏥 مدیریت فیس‌های بستری</h3>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '5px' }}>
              {admission 
                ? `بیمار: ${getPatientFullName(admission)} - بخش: ${getWardName(admission)}`
                : 'مدیریت تمام درخواست‌های بستری'
              }
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenFeeForm()}>
              فیس جدید
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => {
              setRefreshKey(prev => prev + 1);
              fetchAllData();
            }}>
              بروزرسانی
            </Button>
          </div>
        </div>

        {/* آمار */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '15px', marginTop: '20px', paddingTop: '20px',
          borderTop: '1px solid #2a3a4a'
        }}>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>📊 کل فیس‌ها</span>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>{statistics.total_fees}</div>
          </div>
          <div>
            <span style={{ color: '#fcd34d', fontSize: '12px' }}>💰 مبلغ کل</span>
            <div style={{ color: '#fcd34d', fontWeight: 'bold', fontSize: '18px' }}>
              {toNumber(statistics.total_amount).toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#22c55e', fontSize: '12px' }}>✅ پرداخت شده</span>
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>
              {toNumber(statistics.paid_amount).toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#ef4444', fontSize: '12px' }}>⏳ پرداخت نشده</span>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px' }}>
              {toNumber(statistics.pending_amount).toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#f59e0b', fontSize: '12px' }}>🟡 بدون فیس</span>
            <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '18px' }}>{statistics.unpaid_requests}</div>
          </div>
        </div>
      </div>

      {/* تب‌ها */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        style={{ background: 'white', borderRadius: '12px', padding: '20px' }}
        items={tabItems}
      />

      {/* ============ مودال ثبت فیس ============ */}
      <Modal
        title={editingFee ? '✏️ ویرایش فیس بستری' : '💰 ثبت فیس بستری جدید'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); feeForm.resetFields(); setSelectedRequest(null); }}
        footer={null} width={700} destroyOnHidden
      >
        {selectedRequest && <ModalPatientInfo request={selectedRequest} variant="info" />}

        <Form form={feeForm} layout="vertical" onFinish={handleSubmitFee}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="مبلغ کل (AFN)" rules={[{ required: true, message: 'لطفاً مبلغ را وارد کنید' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paid_amount" label="مبلغ پرداخت شده (AFN)">
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount" label="تخفیف (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_method" label="روش پرداخت" rules={[{ required: true }]}>
                <Select>
                  <Option value="cash">نقدی</Option>
                  <Option value="card">کارت بانکی</Option>
                  <Option value="online">آنلاین</Option>
                  <Option value="bank_transfer">انتقال بانکی</Option>
                  <Option value="insurance">بیمه</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="fee_type" 
                label="نوع فیس" 
                rules={[{ required: true, message: 'لطفاً نوع فیس را انتخاب کنید' }]}
              >
                <Select>
                  <Option value="daily">روزانه</Option>
                  <Option value="weekly">هفتگی</Option>
                  <Option value="monthly">ماهانه</Option>
                  <Option value="custom">سفارشی</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="period" label="دوره">
                <Select>
                  <Option value="morning">صبح</Option>
                  <Option value="evening">عصر</Option>
                  <Option value="night">شب</Option>
                  <Option value="full_day">کامل</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fee_date" label="تاریخ" rules={[{ required: true }]}>
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fee_time" label="ساعت" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="توضیحات">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item shouldUpdate>
            {({ getFieldValue }) => {
              const amount = getFieldValue('amount') || 0;
              const paidAmount = getFieldValue('paid_amount') || 0;
              const discount = getFieldValue('discount') || 0;
              const remaining = calculateRemaining(amount, paidAmount, discount);
              
              return (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: remaining <= 0 ? '#f6ffed' : '#fff1f0',
                  borderRadius: '6px',
                  border: `1px solid ${remaining <= 0 ? '#b7eb8f' : '#ffa39e'}`,
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '16px'
                }}>
                  <span style={{ color: '#595959', fontWeight: 'bold' }}>📊 مبلغ باقی‌مانده:</span>
                  <span style={{
                    color: remaining <= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 'bold', fontSize: '18px'
                  }}>
                    {remaining.toFixed(2)} AFN
                    {remaining <= 0 && ' ✅ کامل'}
                  </span>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button onClick={() => { setModalVisible(false); feeForm.resetFields(); setSelectedRequest(null); }}>انصراف</Button>
              <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
                {editingFee ? 'ذخیره تغییرات' : 'ثبت فیس'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ============ مودال ترخیص مستقیم ============ */}
      <Modal
        title={<span style={{ color: '#dc2626' }}><LogoutOutlined /> ترخیص بیمار</span>}
        open={dischargeModalVisible}
        onCancel={() => { 
          setDischargeModalVisible(false); 
          dischargeForm.resetFields(); 
          setSelectedRequest(null);
        }}
        footer={null}
        width={650}
        destroyOnHidden
      >
        {selectedRequest && <ModalPatientInfo request={selectedRequest} variant="danger" />}

        <Alert
          message="توجه: ترخیص مستقیم"
          description="با تایید این فرم، بیمار فوراً ترخیص می‌شود و تخت آزاد می‌گردد. این عمل قابل بازگشت نیست."
          type="warning"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Form form={dischargeForm} layout="vertical" onFinish={handleSubmitDischarge}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discharge_date" label="تاریخ ترخیص" rules={[{ required: true }]}>
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discharge_type" label="نوع ترخیص" rules={[{ required: true }]}>
                <Select>
                  <Option value="regular">ترخیص عادی</Option>
                  <Option value="against_advice">ترخیص با رضایت شخصی</Option>
                  <Option value="transferred">انتقال به مرکز دیگر</Option>
                  <Option value="deceased">فوت</Option>
                  <Option value="escaped">فرار از بیمارستان</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="discharge_reason" label="دلیل ترخیص" rules={[{ required: true, message: 'لطفاً دلیل را وارد کنید' }]}>
            <TextArea rows={3} placeholder="دلیل ترخیص را وارد کنید..." />
          </Form.Item>

          <Form.Item name="discharge_notes" label="یادداشت‌های اضافی">
            <TextArea rows={2} placeholder="توضیحات تکمیلی..." />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button onClick={() => { 
                setDischargeModalVisible(false); 
                dischargeForm.resetFields(); 
                setSelectedRequest(null);
              }}>
                انصراف
              </Button>
              <Button type="primary" danger htmlType="submit" loading={submitting} icon={<LogoutOutlined />}>
                تایید و ترخیص بیمار
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ============ مودال انتقال ============ */}
      <Modal
        title={<span style={{ color: '#2563eb' }}><SwapOutlined /> انتقال به بخش دیگر</span>}
        open={transferModalVisible}
        onCancel={() => { 
          setTransferModalVisible(false); 
          transferForm.resetFields(); 
          setSelectedRequest(null);
        }}
        footer={null}
        width={650}
        destroyOnHidden
      >
        {selectedRequest && <ModalPatientInfo request={selectedRequest} variant="info" />}

        <Alert
          message="توجه: انتقال مستقیم"
          description="با تایید این فرم، بیمار فوراً به بخش جدید منتقل می‌شود و تخت قبلی آزاد می‌گردد."
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Form form={transferForm} layout="vertical" onFinish={handleSubmitTransfer}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="transfer_date" label="تاریخ انتقال" rules={[{ required: true }]}>
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="اولویت" rules={[{ required: true }]}>
                <Select>
                  <Option value="high">🔴 بالا (اورژانسی)</Option>
                  <Option value="medium">🟡 متوسط</Option>
                  <Option value="normal">🟢 معمولی</Option>
                  <Option value="low">⚪ پایین</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="new_ward_id" label="بخش جدید" rules={[{ required: true, message: 'لطفاً بخش را انتخاب کنید' }]}>
            <Select placeholder="انتخاب بخش جدید...">
              {wards.map(ward => (
                <Option key={ward.id} value={String(ward.id)}>
                  {ward.name} - {ward.available_beds || 0} تخت موجود
                  {String(ward.id) === String(selectedRequest?.ward_id) ? ' (بخش فعلی)' : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="transfer_reason" label="دلیل انتقال" rules={[{ required: true, message: 'لطفاً دلیل را وارد کنید' }]}>
            <TextArea rows={3} placeholder="دلیل انتقال را وارد کنید..." />
          </Form.Item>

          <Form.Item name="transfer_notes" label="یادداشت‌های اضافی">
            <TextArea rows={2} placeholder="توضیحات تکمیلی..." />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button onClick={() => { 
                setTransferModalVisible(false); 
                transferForm.resetFields(); 
                setSelectedRequest(null);
              }}>
                انصراف
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} icon={<SwapOutlined />}
                style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}>
                تایید و انتقال بیمار
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ============ مودال ویرایش فیس ============ */}
      <Modal
        title="✏️ ویرایش فیس بستری"
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setEditingFee(null); }}
        footer={null} width={700} destroyOnHidden
      >
        {editingFee && (
          <div style={{
            backgroundColor: '#f0f5ff', padding: '15px', 
            borderRadius: '8px', marginBottom: '20px', border: '1px solid #91caff'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={styles.modalInfoLabel}>📄 شماره رسید</span>
                <div style={styles.modalInfoValue}>{editingFee.receipt_number}</div>
              </div>
              <div>
                <span style={styles.modalInfoLabel}>👤 بیمار</span>
                <div style={styles.modalInfoValueNormal}>{getPatientFullName(editingFee)}</div>
              </div>
            </div>
          </div>
        )}

        <Form form={editForm} layout="vertical" onFinish={handleEditFee}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="مبلغ کل (AFN)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paid_amount" label="مبلغ پرداخت شده (AFN)">
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount" label="تخفیف (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_method" label="روش پرداخت" rules={[{ required: true }]}>
                <Select>
                  <Option value="cash">نقدی</Option>
                  <Option value="card">کارت بانکی</Option>
                  <Option value="online">آنلاین</Option>
                  <Option value="bank_transfer">انتقال بانکی</Option>
                  <Option value="insurance">بیمه</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fee_type" label="نوع فیس" rules={[{ required: true }]}>
                <Select>
                  <Option value="daily">روزانه</Option>
                  <Option value="weekly">هفتگی</Option>
                  <Option value="monthly">ماهانه</Option>
                  <Option value="custom">سفارشی</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="period" label="دوره">
                <Select>
                  <Option value="morning">صبح</Option>
                  <Option value="evening">عصر</Option>
                  <Option value="night">شب</Option>
                  <Option value="full_day">کامل</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fee_date" label="تاریخ" rules={[{ required: true }]}>
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fee_time" label="ساعت" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="توضیحات">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item shouldUpdate>
            {({ getFieldValue }) => {
              const amount = getFieldValue('amount') || 0;
              const paidAmount = getFieldValue('paid_amount') || 0;
              const discount = getFieldValue('discount') || 0;
              const remaining = calculateRemaining(amount, paidAmount, discount);
              
              return (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: remaining <= 0 ? '#f6ffed' : '#fff1f0',
                  borderRadius: '6px',
                  border: `1px solid ${remaining <= 0 ? '#b7eb8f' : '#ffa39e'}`,
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '16px'
                }}>
                  <span style={{ color: '#595959', fontWeight: 'bold' }}>📊 مبلغ باقی‌مانده:</span>
                  <span style={{
                    color: remaining <= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 'bold', fontSize: '18px'
                  }}>
                    {remaining.toFixed(2)} AFN                    {remaining <= 0 && ' ✅ کامل'}
                  </span>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button onClick={() => { setEditModalVisible(false); editForm.resetFields(); setEditingFee(null); }}>انصراف</Button>
              <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
                ذخیره تغییرات
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ============ مودال پرینت رسید فیس ============ */}
      <Modal
        title="رسید فیس بستری"
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>پرینت</Button>,
          <Button key="close" onClick={() => setReceiptModal(false)}>بستن</Button>
        ]}
        width={600} destroyOnHidden
      >
        {receiptData && (
          <div id="receipt-content">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h3>{receiptData.hospital_name || 'بیمارستان'}</h3>
              <p>{receiptData.hospital_address || ''}</p>
              <p>تلفن: {receiptData.hospital_phone || ''}</p>
              <h4>رسید فیس بستری</h4>
            </div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="شماره رسید" span={2}>
                {receiptData.fee?.receipt_number || receiptData.receipt_number || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="نام بیمار" span={2}>
                {getPatientFullName(receiptData)}
              </Descriptions.Item>
              <Descriptions.Item label="شماره تذکره">{getPatientNationalId(receiptData)}</Descriptions.Item>
              <Descriptions.Item label="شماره تماس">{getPatientMobile(receiptData)}</Descriptions.Item>
              <Descriptions.Item label="سن">{getPatientAge(receiptData)}</Descriptions.Item>
              <Descriptions.Item label="جنسیت">{getPatientGender(receiptData)}</Descriptions.Item>
              <Descriptions.Item label="بخش">{getWardName(receiptData)}</Descriptions.Item>
              <Descriptions.Item label="موقعیت">{getLocationDisplay(receiptData)}</Descriptions.Item>
              <Descriptions.Item label="روز بستری">{receiptData.fee?.day_number || 1}</Descriptions.Item>
              <Descriptions.Item label="تاریخ">{formatDate(receiptData.fee?.fee_date || receiptData.fee_date)}</Descriptions.Item>
              <Descriptions.Item label="مبلغ" span={2}>
                <span style={{ color: '#d48806', fontWeight: 'bold' }}>
                  {toNumber(receiptData.fee?.amount || receiptData.amount).toLocaleString()} AFN
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="پرداخت شده">
                {toNumber(receiptData.fee?.paid_amount || receiptData.paid_amount).toLocaleString()} AFN
              </Descriptions.Item>
              <Descriptions.Item label="باقیمانده">
                <span style={{
                  color: calculateRemaining(
                    receiptData.fee?.amount || receiptData.amount,
                    receiptData.fee?.paid_amount || receiptData.paid_amount,
                    receiptData.fee?.discount_percent || receiptData.fee?.discount || 0
                  ) <= 0 ? '#16a34a' : '#dc2626',
                  fontWeight: 'bold'
                }}>
                  {calculateRemaining(
                    receiptData.fee?.amount || receiptData.amount,
                    receiptData.fee?.paid_amount || receiptData.paid_amount,
                    receiptData.fee?.discount_percent || receiptData.fee?.discount || 0
                  ).toFixed(2)} AFN
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="روش پرداخت">
                {getMethodLabel(receiptData.fee?.payment_method || receiptData.payment_method)}
              </Descriptions.Item>
              <Descriptions.Item label="وضعیت">
                {getStatusLabel(receiptData.fee?.status || receiptData.status)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="توضیحات" span={2}>
                {receiptData.fee?.description || receiptData.description || 'ندارد'}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ textAlign: 'center', marginTop: 20, borderTop: '1px dashed #ccc', paddingTop: 10 }}>
              <p>با تشکر از اعتماد شما</p>
              <p>{moment().format('jYYYY/jMM/jDD')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdmissionFeePage;