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
  EditOutlined
} from '@ant-design/icons';
import moment from 'moment';
import 'moment-jalaali';

const { Option } = Select;
const { TextArea } = Input;

// استایل‌های سفارشی
const styles = {
  container: {
    padding: '24px',
    background: '#f0f2f5',
    minHeight: '100vh'
  },
  headerCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #2a3a4a'
  },
  requestItem: {
    background: '#1a2a3a',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '10px',
    borderRight: '4px solid #ef4444',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  alertCard: {
    background: '#2a1a1a',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ef4444',
    marginBottom: '10px'
  }
};

const AdmissionFeePage = () => {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [feeForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // State for data
  const [admission, setAdmission] = useState(null);
  const [fees, setFees] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const [alertRequests, setAlertRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [activeTab, setActiveTab] = useState('requests');
  const [refreshKey, setRefreshKey] = useState(0);
  const [debugData, setDebugData] = useState(null);

  // State for modals
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // State for statistics
  const [statistics, setStatistics] = useState({
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    total_fees: 0,
    pending_fees: 0,
    paid_fees: 0,
    total_requests: 0,
    unpaid_requests: 0,
    paid_requests: 0,
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
    console.log('🔄 شروع بارگذاری داده‌ها...');
    try {
      await Promise.all([
        fetchAdmissionData(),
        fetchFeesData(),
        fetchAllRequests(),
        checkAlerts()
      ]);
      console.log('✅ بارگذاری داده‌ها کامل شد');
    } catch (error) {
      console.error('❌ خطا در بارگذاری داده‌ها:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت اطلاعات بستری ============
  const fetchAdmissionData = async () => {
    if (!admissionId) return;
    try {
      console.log(`📥 دریافت اطلاعات بستری #${admissionId}...`);
      const response = await api.get(`/admissions/${admissionId}`);
      console.log('✅ اطلاعات بستری دریافت شد:', response.data);
      setAdmission(response.data.data);
    } catch (error) {
      console.error('❌ خطا در دریافت اطلاعات بستری:', error);
    }
  };

  // ============ دریافت فیس‌های ثبت شده ============
  const fetchFeesData = async () => {
    try {
      const url = admissionId 
        ? `/admission-fees/admission/${admissionId}`
        : '/admission-fees';
      console.log(`📥 دریافت فیس‌ها از: ${url}`);
      
      const response = await api.get(url);
      console.log('✅ پاسخ فیس‌ها:', response.data);

      let feesList = [];
      if (response.data?.data) {
        const data = response.data.data;
        if (Array.isArray(data)) {
          feesList = data;
        } else if (data?.fees) {
          feesList = data.fees;
        } else if (data?.data && Array.isArray(data.data)) {
          feesList = data.data;
        }
      }

      console.log(`✅ ${feesList.length} فیس دریافت شد`);
      setFees(feesList);

      // به‌روزرسانی آمار
      const totalAmount = feesList.reduce((sum, f) => sum + (f.amount || 0), 0);
      const paidAmount = feesList.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0);
      const pendingAmount = feesList.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0);

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
      console.error('❌ خطا در دریافت فیس‌ها:', error);
      toast.error('خطا در دریافت فیس‌ها');
    }
  };

  // ============ دریافت تمام درخواست‌های بستری ============
  const fetchAllRequests = async () => {
    try {
      console.log('📥 دریافت درخواست‌های بستری از: /admission-requests/all');
      const response = await api.get('/admission-requests/all');
      console.log('✅ پاسخ درخواست‌ها:', response.data);
      
      // ذخیره داده برای دیباگ
      setDebugData(response.data);

      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        console.log(`📊 تعداد کل درخواست‌ها: ${data.all_requests?.length || 0}`);
        console.log(`📊 تعداد بدون فیس: ${data.unpaid_requests?.length || 0}`);
        console.log(`📊 تعداد دارای فیس: ${data.paid_requests?.length || 0}`);
        
        setAllRequests(data.all_requests || []);
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        
        setStatistics(prev => ({
          ...prev,
          total_requests: data.all_requests?.length || 0,
          unpaid_requests: data.unpaid_requests?.length || 0,
          paid_requests: data.paid_requests?.length || 0
        }));
      } else {
        console.warn('⚠️ پاسخ نامعتبر از سرور:', response.data);
      }
    } catch (error) {
      console.error('❌ خطا در دریافت درخواست‌های بستری:', error);
      toast.error('خطا در دریافت درخواست‌های بستری');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }
  };

  // ============ بررسی هشدارها ============
  const checkAlerts = async () => {
    try {
      console.log('📥 بررسی هشدارها...');
      const response = await api.get('/admission-fees/pending/alerts');
      if (response.data?.data) {
        console.log(`✅ ${response.data.data.length} هشدار فعال`);
        setAlertRequests(response.data.data);
        setStatistics(prev => ({
          ...prev,
          alert_count: response.data.data.length || 0
        }));
      }
    } catch (error) {
      console.error('❌ خطا در بررسی هشدارها:', error);
    }
  };

  // ============ ثبت فیس جدید ============
  const handleSubmitFee = async (values) => {
    setSubmitting(true);
    try {
      const data = {
        ...values,
        admission_request_id: selectedRequest?.id || admissionId,
        patient_id: selectedRequest?.patient_id || admission?.patient_id,
        reg_id: selectedRequest?.reg_id || admission?.reg_id,
        doctor_id: selectedRequest?.doctor_id || admission?.doctor_id,
        fee_date: values.fee_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        fee_time: values.fee_time?.format('HH:mm') || moment().format('HH:mm'),
        day_number: calculateDayNumber(selectedRequest?.admission_date)
      };

      console.log('📤 ثبت فیس جدید:', data);
      await api.post('/admission-fees', data);
      toast.success('فیس بستری با موفقیت ایجاد شد');
      
      setModalVisible(false);
      feeForm.resetFields();
      await fetchAllData();
      
    } catch (error) {
      console.error('❌ خطا در ثبت فیس:', error);
      toast.error(error.response?.data?.message || 'خطا در ایجاد فیس بستری');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ ویرایش فیس ============
  const handleEditFee = async (values) => {
    if (!editingFee) return;
    
    setSubmitting(true);
    try {
      const data = {
        ...values,
        fee_date: values.fee_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        fee_time: values.fee_time?.format('HH:mm') || moment().format('HH:mm')
      };

      console.log(`📤 ویرایش فیس #${editingFee.id}:`, data);
      await api.put(`/admission-fees/${editingFee.id}`, data);
      toast.success('فیس بستری با موفقیت ویرایش شد');
      
      setEditModalVisible(false);
      editForm.resetFields();
      setEditingFee(null);
      await fetchAllData();
      
    } catch (error) {
      console.error('❌ خطا در ویرایش فیس:', error);
      toast.error(error.response?.data?.message || 'خطا در ویرایش فیس');
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
          console.log(`📤 دریافت فیس #${id}`);
          await api.post(`/admission-fees/${id}/collect`);
          toast.success('فیس با موفقیت دریافت شد');
          await fetchAllData();
        } catch (error) {
          console.error('❌ خطا در دریافت فیس:', error);
          toast.error(error.response?.data?.message || 'خطا در دریافت فیس');
        }
      }
    });
  };

  // ============ حذف فیس ============
  const handleDeleteFee = async (id) => {
    Modal.confirm({
      title: 'تایید حذف',
      content: 'آیا از حذف این فیس اطمینان دارید؟ این عمل غیرقابل بازگشت است.',
      icon: <ExclamationCircleOutlined />,
      okText: 'حذف',
      okType: 'danger',
      cancelText: 'انصراف',
      onOk: async () => {
        try {
          console.log(`🗑️ حذف فیس #${id}`);
          await api.delete(`/admission-fees/${id}`);
          toast.success('فیس با موفقیت حذف شد');
          await fetchAllData();
        } catch (error) {
          console.error('❌ خطا در حذف فیس:', error);
          toast.error(error.response?.data?.message || 'خطا در حذف فیس');
        }
      }
    });
  };

  // ============ پرینت رسید ============
  const handlePrintReceipt = async (id) => {
    try {
      console.log(`🖨️ پرینت رسید فیس #${id}`);
      const response = await api.get(`/admission-fees/${id}/print`);
      setReceiptData(response.data.data);
      setReceiptModal(true);
      await api.post(`/admission-fees/${id}/increment-print`);
    } catch (error) {
      console.error('❌ خطا در پرینت:', error);
      toast.error('خطا در دریافت اطلاعات برای پرینت');
    }
  };

  // ============ باز کردن فرم فیس ============
  const handleOpenFeeForm = (request = null) => {
    setSelectedRequest(request);
    setEditingFee(null);
    feeForm.resetFields();
    
    const defaultAmount = request?.fee_amount || admission?.fee_amount || 0;
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
      note: request 
        ? `درخواست بارکد: ${request.barcode || ''}`
        : ''
    });
    
    setModalVisible(true);
  };

  // ============ باز کردن فرم ویرایش فیس ============
  const handleOpenEditForm = (fee) => {
    setEditingFee(fee);
    editForm.resetFields();
    editForm.setFieldsValue({
      amount: fee.amount || 0,
      paid_amount: fee.paid_amount || 0,
      discount: fee.discount || 0,
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

  // ============ Helper Functions ============
  const calculateDayNumber = (admissionDate) => {
    if (!admissionDate) return 1;
    const start = moment(admissionDate);
    const now = moment();
    return now.diff(start, 'days') + 1;
  };

  const getMethodLabel = (method) => {
    const methods = {
      cash: 'نقدی',
      card: 'کارت بانکی',
      online: 'آنلاین',
      bank_transfer: 'انتقال بانکی',
      insurance: 'بیمه'
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

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return moment(date).format('jYYYY/jMM/jDD');
    } catch {
      return moment(date).format('YYYY/MM/DD');
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    try {
      return moment(date).format('jYYYY/jMM/jDD HH:mm');
    } catch {
      return moment(date).format('YYYY/MM/DD HH:mm');
    }
  };

  const calculateRemaining = (amount, paidAmount, discount) => {
    const discountAmount = (amount || 0) * ((discount || 0) / 100);
    return (amount || 0) - (paidAmount || 0) - discountAmount;
  };

  const getPatientFullName = (request) => {
    if (request?.patient?.full_name) return request.patient.full_name;
    if (request?.patient?.first_name) {
      return `${request.patient.first_name || ''} ${request.patient.last_name || ''}`.trim() || 'نامشخص';
    }
    if (request?.patient_name) return request.patient_name;
    return 'نامشخص';
  };

  const getPatientAge = (request) => {
    if (request?.patient?.age) return `${request.patient.age} سال`;
    if (request?.age) return `${request.age} سال`;
    return '-';
  };

  const getPatientGender = (request) => {
    let gender = request?.patient?.gender || request?.gender;
    if (gender) {
      const genderMap = {
        'Male': 'مرد',
        'male': 'مرد',
        'M': 'مرد',
        'Female': 'زن',
        'female': 'زن',
        'F': 'زن',
        'other': 'دیگر'
      };
      return genderMap[gender] || gender;
    }
    return '-';
  };

  const getLocationDisplay = (request) => {
    if (!request) return '-';
    const parts = [];
    if (request.location) parts.push(request.location);
    if (request.room_number) parts.push(`اتاق: ${request.room_number}`);
    if (request.bed_number) parts.push(`تخت: ${request.bed_number}`);
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  // ============ دریافت درخواست‌های فیلتر شده ============
  const getFilteredRequests = () => {
    if (filterMode === 'unpaid') return unpaidRequests;
    if (filterMode === 'paid') return paidRequests;
    if (filterMode === 'alert') return alertRequests;
    return allRequests;
  };

  const displayRequests = getFilteredRequests();

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
          
          return (
            <div
              key={request.id || index}
              style={{
                ...styles.requestItem,
                borderRightColor: isAlert ? '#ef4444' : (hasFeeRecord ? '#22c55e' : '#f59e0b')
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderRightColor = '#ef4444';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderRightColor = isAlert ? '#ef4444' : (hasFeeRecord ? '#22c55e' : '#f59e0b');
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  {/* اطلاعات اصلی */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge count={index + 1} style={{ backgroundColor: '#ef4444' }} />
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                      {getPatientFullName(request)}
                    </span>
                    {request.barcode && (
                      <Tag color="gold">🏷️ {request.barcode}</Tag>
                    )}
                    <Tag color={hasFeeRecord ? 'green' : 'orange'}>
                      {hasFeeRecord ? '✅ دارای فیس' : '❌ بدون فیس'}
                    </Tag>
                    {isAlert && (
                      <Tag color="red" icon={<BellOutlined />}>
                        ⏰ نیاز به هشدار
                      </Tag>
                    )}
                  </div>

                  {/* اطلاعات مریض و موقعیت */}
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(15, 26, 42, 0.8)',
                    borderRadius: '6px',
                    border: '1px solid #2a3a4a'
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      <UserOutlined /> {getPatientFullName(request)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      🎂 {getPatientAge(request)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      ⚤ {getPatientGender(request)}
                    </span>
                    {request.patient?.mobile && (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        📞 {request.patient.mobile}
                      </span>
                    )}
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      🏥 {request.ward_name || 'نامشخص'}
                    </span>
                    <span style={{ color: '#fcd34d', fontSize: '12px' }}>
                      <EnvironmentOutlined /> {getLocationDisplay(request)}
                    </span>
                  </div>

                  {/* تاریخ و اطلاعات دیگر */}
                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '5px' }}>
                    📅 {formatDateTime(request.request_date || request.created_at)}
                    {request.status && (
                      <span style={{ marginRight: '15px' }}>
                        | وضعیت: {request.status_label || request.status}
                      </span>
                    )}
                    {request.admission_date && (
                      <span style={{ marginRight: '15px' }}>
                        | روز بستری: {calculateDayNumber(request.admission_date)}
                      </span>
                    )}
                    {request.last_fee_alert_at && (
                      <span style={{ marginRight: '15px', color: '#f59e0b' }}>
                        | آخرین هشدار: {moment(request.last_fee_alert_at).fromNow()}
                      </span>
                    )}
                  </div>

                  {/* اطلاعات فیس */}
                  {hasFeeRecord && feeInfo && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid #22c55e'
                    }}>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
                        <span style={{ color: '#fcd34d' }}>💰 {feeInfo.amount?.toFixed(2)} AFN</span>
                        <span style={{ color: '#22c55e' }}>✅ پرداخت: {feeInfo.paid_amount?.toFixed(2)} AFN</span>
                        {feeInfo.discount > 0 && (
                          <span style={{ color: '#f59e0b' }}>تخفیف: {feeInfo.discount}%</span>
                        )}
                        <span style={{ color: '#ef4444' }}>
                          باقیمانده: {calculateRemaining(feeInfo.amount, feeInfo.paid_amount, feeInfo.discount).toFixed(2)} AFN
                        </span>
                        <span style={{ color: '#9ca3af' }}>روش: {getMethodLabel(feeInfo.payment_method)}</span>
                        <span style={{ color: '#9ca3af' }}>روز: {feeInfo.day_number || 1}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                      {feeInfo && (
                        <Button
                          type="default"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEditForm(feeInfo)}
                        >
                          ویرایش
                        </Button>
                      )}
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

  // ============ ستون‌های جدول درخواست‌های بستری ============
  const requestColumns = [
    {
      title: 'شماره',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 50,
    },
    {
      title: 'نام بیمار',
      dataIndex: 'patient',
      key: 'patient_name',
      render: (patient) => patient?.full_name || 'نامشخص',
    },
    {
      title: 'شماره مراجعه',
      dataIndex: 'reg_id',
      key: 'reg_id',
    },
    {
      title: 'بخش',
      dataIndex: 'ward_name',
      key: 'ward_name',
      render: (ward_name) => ward_name || '-',
    },
    {
      title: 'تاریخ بستری',
      dataIndex: 'admission_date',
      key: 'admission_date',
      render: (date) => formatDate(date),
    },
    {
      title: 'وضعیت بستری',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          'admitted': { color: '#22c55e', label: 'بستری' },
          'pending': { color: '#f59e0b', label: 'در انتظار' },
          'discharged': { color: '#6b7280', label: 'ترخیص شده' },
          'cancelled': { color: '#ef4444', label: 'لغو شده' },
        };
        const info = statusMap[status] || { color: '#6b7280', label: status };
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: 'وضعیت فیس',
      dataIndex: 'has_fee',
      key: 'has_fee',
      render: (hasFee) => {
        if (hasFee) {
          return <Tag color="green" icon={<CheckCircleOutlined />}>دارای فیس</Tag>;
        }
        return <Tag color="orange" icon={<ClockCircleOutlined />}>بدون فیس</Tag>;
      }
    },
    {
      title: 'مبلغ فیس',
      dataIndex: 'fee_amount',
      key: 'fee_amount',
      render: (amount) => amount ? <span style={{ color: '#fcd34d' }}>{amount?.toLocaleString()} AFN</span> : '-',
    },
    {
      title: 'عملیات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="مشاهده">
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedRequest(record);
                setModalVisible(true);
              }}
            />
          </Tooltip>
          {!record.has_fee && (
            <Tooltip title="اخذ فیس">
              <Button
                type="primary"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => handleOpenFeeForm(record)}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              />
            </Tooltip>
          )}
          {record.has_fee && record.fee_id && (
            <Tooltip title="پرینت">
              <Button
                type="default"
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => handlePrintReceipt(record.fee_id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    }
  ];

  // ============ آیتم‌های تب برای Tabs ============
  const tabItems = [
    {
      key: 'requests',
      label: <span><FileTextOutlined /> درخواست‌های بستری</span>,
      children: (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Button
              type={filterMode === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterMode('all')}
            >
              📋 همه ({allRequests.length})
            </Button>
            <Button
              type={filterMode === 'unpaid' ? 'primary' : 'default'}
              onClick={() => setFilterMode('unpaid')}
              style={filterMode === 'unpaid' ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' } : {}}
            >
              🟡 بدون فیس ({unpaidRequests.length})
            </Button>
            <Button
              type={filterMode === 'paid' ? 'primary' : 'default'}
              onClick={() => setFilterMode('paid')}
              style={filterMode === 'paid' ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : {}}
            >
              🟢 دارای فیس ({paidRequests.length})
            </Button>
            <Button
              type={filterMode === 'alert' ? 'primary' : 'default'}
              onClick={() => setFilterMode('alert')}
              style={filterMode === 'alert' ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}}
            >
              🔔 هشدارها ({alertRequests.length})
            </Button>
          </div>
          {renderRequestsList()}
        </>
      ),
    },
    {
      key: 'fees',
      label: <span><DollarOutlined /> لیست فیس‌ها</span>,
      children: (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Button
              type={filterMode === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterMode('all')}
            >
              📋 همه ({allRequests.length})
            </Button>
            <Button
              type={filterMode === 'unpaid' ? 'primary' : 'default'}
              onClick={() => setFilterMode('unpaid')}
              style={filterMode === 'unpaid' ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' } : {}}
            >
              🟡 بدون فیس ({unpaidRequests.length})
            </Button>
            <Button
              type={filterMode === 'paid' ? 'primary' : 'default'}
              onClick={() => setFilterMode('paid')}
              style={filterMode === 'paid' ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : {}}
            >
              🟢 دارای فیس ({paidRequests.length})
            </Button>
          </div>
          <Table
            columns={requestColumns}
            dataSource={displayRequests}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    <span style={{ color: '#9ca3af' }}>
                      {filterMode === 'unpaid' && 'هیچ درخواست بدون فیس وجود ندارد'}
                      {filterMode === 'paid' && 'هیچ درخواست دارای فیس وجود ندارد'}
                      {filterMode === 'all' && 'هیچ درخواست بستری ثبت نشده است'}
                    </span>
                  }
                />
              )
            }}
          />
        </>
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
              type="warning"
              showIcon
              style={{ marginBottom: '20px' }}
            />
            <List
              dataSource={alertRequests}
              renderItem={(item) => (
                <List.Item
                  style={styles.alertCard}
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleCollectFee(item.id)}
                    >
                      دریافت فیس
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                    title={
                      <span>
                        <strong>{getPatientFullName(item)}</strong>
                        <Tag color="red" style={{ marginLeft: '10px' }}>
                          ⏰ {moment(item.last_fee_alert_at).fromNow()}
                        </Tag>
                      </span>
                    }
                    description={
                      <div>
                        <p>🏥 {item.ward_name || 'نامشخص'} | {getLocationDisplay(item)}</p>
                        <p>💰 مبلغ فیس: {item.fee_amount?.toLocaleString() || 0} AFN</p>
                        <p>📅 روز بستری: {calculateDayNumber(item.admission_date)}</p>
                        <p>📞 تماس: {item.patient?.mobile || '-'}</p>
                      </div>
                    }
                  />
                </List.Item>
              )}
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
      {/* هدر با آمار */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ color: '#ef4444', margin: 0 }}>
              🏥 مدیریت فیس‌های بستری
            </h3>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '5px' }}>
              {admission 
                ? `بیمار: ${admission.patient?.full_name} - بخش: ${admission.ward?.name}`
                : 'مدیریت تمام درخواست‌های بستری'
              }
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenFeeForm()}
            >
              فیس جدید
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setRefreshKey(prev => prev + 1);
                fetchAllData();
              }}
            >
              بروزرسانی
            </Button>
          </div>
        </div>

        {/* آمار */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '15px',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #2a3a4a'
        }}>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>📊 کل فیس‌ها</span>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>
              {statistics.total_fees}
            </div>
          </div>
          <div>
            <span style={{ color: '#fcd34d', fontSize: '12px' }}>💰 مبلغ کل</span>
            <div style={{ color: '#fcd34d', fontWeight: 'bold', fontSize: '18px' }}>
              {statistics.total_amount.toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#22c55e', fontSize: '12px' }}>✅ پرداخت شده</span>
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>
              {statistics.paid_amount.toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#ef4444', fontSize: '12px' }}>⏳ پرداخت نشده</span>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px' }}>
              {statistics.pending_amount.toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#f59e0b', fontSize: '12px' }}>🟡 بدون فیس</span>
            <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '18px' }}>
              {statistics.unpaid_requests}
            </div>
          </div>
          <div>
            <span style={{ color: '#ef4444', fontSize: '12px' }}>
              <BellOutlined /> هشدارها
            </span>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>
              {statistics.alert_count}
            </div>
          </div>
        </div>

        {/* نمایش دیباگ (فقط در حالت توسعه) */}
        {debugData && process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <details>
              <summary style={{ color: '#9ca3af', cursor: 'pointer' }}>
                🔍 اطلاعات دیباگ (کلیک کنید)
              </summary>
              <pre style={{ color: '#9ca3af', fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </details>
          </div>
        )}
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

      {/* مودال ثبت فیس */}
      <Modal
        title={editingFee ? '✏️ ویرایش فیس بستری' : '💰 ثبت فیس بستری جدید'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          feeForm.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        {selectedRequest && (
          <div style={{
            backgroundColor: 'rgba(15, 26, 42, 0.8)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #2a3a4a'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>👤 نام مریض</span>
                <div style={{ color: 'white', fontWeight: 'bold' }}>
                  {getPatientFullName(selectedRequest)}
                </div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>🆔 شماره مراجعه</span>
                <div style={{ color: 'white', fontWeight: 'bold' }}>{selectedRequest.reg_id || '-'}</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>🎂 سن</span>
                <div style={{ color: 'white' }}>{getPatientAge(selectedRequest)}</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>⚤ جنسیت</span>
                <div style={{ color: 'white' }}>{getPatientGender(selectedRequest)}</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>📍 موقعیت</span>
                <div style={{ color: 'white' }}>{getLocationDisplay(selectedRequest)}</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>📅 روز بستری</span>
                <div style={{ color: 'white' }}>{calculateDayNumber(selectedRequest.admission_date)}</div>
              </div>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #2a3a4a' }}>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>🏥 بخش: </span>
              <span style={{ color: 'white' }}>{selectedRequest.ward_name || 'نامشخص'}</span>
              {selectedRequest.barcode && (
                <span style={{ marginLeft: '15px', color: '#fcd34d' }}>🏷️ {selectedRequest.barcode}</span>
              )}
            </div>
          </div>
        )}

        <Form form={feeForm} layout="vertical" onFinish={handleSubmitFee}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="مبلغ کل (AFN)" rules={[{ required: true, message: 'لطفاً مبلغ را وارد کنید' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} placeholder="مبلغ را وارد کنید" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paid_amount" label="مبلغ پرداخت شده (AFN)">
                <InputNumber style={{ width: '100%' }} min={0} step={100} placeholder="مبلغ پرداخت شده" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount" label="تخفیف (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} step={1} placeholder="درصد تخفیف" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_method" label="روش پرداخت" rules={[{ required: true, message: 'لطفاً روش پرداخت را انتخاب کنید' }]}>
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
              <Form.Item name="fee_type" label="نوع فیس" rules={[{ required: true, message: 'لطفاً نوع فیس را انتخاب کنید' }]}>
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
              <Form.Item name="fee_date" label="تاریخ" rules={[{ required: true, message: 'لطفاً تاریخ را انتخاب کنید' }]}>
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fee_time" label="ساعت" rules={[{ required: true, message: 'لطفاً ساعت را انتخاب کنید' }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="day_number" label="شماره روز بستری">
            <InputNumber style={{ width: '100%' }} min={1} placeholder="شماره روز بستری" />
          </Form.Item>

          <Form.Item name="description" label="توضیحات">
            <TextArea rows={2} placeholder="توضیحات اضافی..." />
          </Form.Item>

          <Form.Item name="note" label="یادداشت">
            <TextArea rows={2} placeholder="یادداشت..." />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button onClick={() => { setModalVisible(false); feeForm.resetFields(); }}>انصراف</Button>
              <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
                {editingFee ? 'ذخیره تغییرات' : 'ثبت فیس'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* مودال ویرایش فیس */}
      <Modal
        title="✏️ ویرایش فیس بستری"
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setEditingFee(null); }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        {editingFee && (
          <div style={{ backgroundColor: 'rgba(15, 26, 42, 0.8)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #2a3a4a' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>📄 شماره رسید</span>
                <div style={{ color: 'white', fontWeight: 'bold' }}>{editingFee.receipt_number}</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>👤 بیمار</span>
                <div style={{ color: 'white' }}>{getPatientFullName(editingFee)}</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>💰 مبلغ فعلی</span>
                <div style={{ color: '#fcd34d' }}>{editingFee.amount?.toLocaleString()} AFN</div>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>📊 وضعیت</span>
                <div>
                  <Tag color={editingFee.status === 'paid' ? 'green' : 'orange'}>
                    {editingFee.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}
                  </Tag>
                </div>
              </div>
            </div>
          </div>
        )}

        <Form form={editForm} layout="vertical" onFinish={handleEditFee}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="مبلغ کل (AFN)" rules={[{ required: true, message: 'لطفاً مبلغ را وارد کنید' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} placeholder="مبلغ را وارد کنید" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paid_amount" label="مبلغ پرداخت شده (AFN)">
                <InputNumber style={{ width: '100%' }} min={0} step={100} placeholder="مبلغ پرداخت شده" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount" label="تخفیف (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} step={1} placeholder="درصد تخفیف" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_method" label="روش پرداخت" rules={[{ required: true, message: 'لطفاً روش پرداخت را انتخاب کنید' }]}>
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
              <Form.Item name="fee_type" label="نوع فیس">
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
              <Form.Item name="fee_date" label="تاریخ" rules={[{ required: true, message: 'لطفاً تاریخ را انتخاب کنید' }]}>
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fee_time" label="ساعت" rules={[{ required: true, message: 'لطفاً ساعت را انتخاب کنید' }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="day_number" label="شماره روز بستری">
            <InputNumber style={{ width: '100%' }} min={1} placeholder="شماره روز بستری" />
          </Form.Item>

          <Form.Item name="description" label="توضیحات">
            <TextArea rows={2} placeholder="توضیحات اضافی..." />
          </Form.Item>

          <Form.Item name="note" label="یادداشت">
            <TextArea rows={2} placeholder="یادداشت..." />
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

      {/* مودال پرینت رسید */}
      <Modal
        title="رسید فیس بستری"
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>پرینت</Button>,
          <Button key="close" onClick={() => setReceiptModal(false)}>بستن</Button>
        ]}
        width={600}
        destroyOnHidden
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
              <Descriptions.Item label="شماره رسید" span={2}>{receiptData.fee?.receipt_number}</Descriptions.Item>
              <Descriptions.Item label="نام بیمار" span={2}>{receiptData.patient?.full_name || 'نامشخص'}</Descriptions.Item>
              <Descriptions.Item label="کد ملی">{receiptData.patient?.national_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="شماره تماس">{receiptData.patient?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="بخش">{receiptData.admission?.ward?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="تخت">{receiptData.admission?.bed?.bed_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="موقعیت">{getLocationDisplay(receiptData.admission)}</Descriptions.Item>
              <Descriptions.Item label="روز بستری">{receiptData.fee?.day_number || 1}</Descriptions.Item>
              <Descriptions.Item label="تاریخ">{formatDate(receiptData.fee?.fee_date)}</Descriptions.Item>
              <Descriptions.Item label="ساعت">{receiptData.fee?.fee_time ? moment(receiptData.fee.fee_time, 'HH:mm:ss').format('HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="مبلغ" span={2}><span style={{ color: '#fcd34d', fontWeight: 'bold' }}>{receiptData.fee?.amount?.toLocaleString()} AFN</span></Descriptions.Item>
              <Descriptions.Item label="پرداخت شده">{receiptData.fee?.paid_amount?.toLocaleString()} AFN</Descriptions.Item>
              <Descriptions.Item label="تخفیف">{receiptData.fee?.discount || 0}%</Descriptions.Item>
              <Descriptions.Item label="باقیمانده"><span style={{ color: '#ef4444' }}>{calculateRemaining(receiptData.fee?.amount, receiptData.fee?.paid_amount, receiptData.fee?.discount).toFixed(2)} AFN</span></Descriptions.Item>
              <Descriptions.Item label="روش پرداخت">{getMethodLabel(receiptData.fee?.payment_method)}</Descriptions.Item>
              <Descriptions.Item label="وضعیت">{getStatusLabel(receiptData.fee?.status)?.label}</Descriptions.Item>
              <Descriptions.Item label="دریافت کننده">{receiptData.collector?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="توضیحات" span={2}>{receiptData.fee?.description || 'ندارد'}</Descriptions.Item>
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