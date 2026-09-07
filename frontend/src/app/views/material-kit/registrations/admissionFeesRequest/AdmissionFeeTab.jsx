// src/app/pages/admission/AdmissionFeePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Card, Table, Button, Form, Input, Select, DatePicker, TimePicker,
  Modal, Space, Tag, Descriptions, Statistic, Row, Col, Divider,
  Tabs, Badge, Popconfirm, Tooltip, Avatar,
  List, Empty, Spin, InputNumber, message
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  PrinterOutlined, ReloadOutlined, DollarOutlined,
  FileTextOutlined, DeleteOutlined,
  EyeOutlined, UserOutlined,
  WarningOutlined, BellOutlined,
  SaveOutlined, ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

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
  }
};

const AdmissionFeePage = () => {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [feeForm] = Form.useForm();

  // State for data
  const [admission, setAdmission] = useState(null);
  const [fees, setFees] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [activeTab, setActiveTab] = useState('requests');

  // State for modals
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
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
    paid_requests: 0
  });

  // ============ بارگذاری اولیه ============
  useEffect(() => {
    if (admissionId) {
      fetchAdmissionData();
      fetchFeesData();
    }
    fetchAllRequests();
  }, [admissionId]);

  // ============ دریافت اطلاعات بستری ============
  const fetchAdmissionData = async () => {
    try {
      const response = await axios.get(`/api/admissions/${admissionId}`);
      setAdmission(response.data.data);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات بستری');
      navigate('/admissions');
    }
  };

  // ============ دریافت فیس‌های ثبت شده ============
  const fetchFeesData = async () => {
    setLoading(true);
    try {
      const url = admissionId 
        ? `/api/admission-fees/admission/${admissionId}`
        : '/api/admission-fees';
      
      const response = await axios.get(url);
      const data = response.data.data;

      let feesList = [];
      if (Array.isArray(data)) {
        feesList = data;
      } else if (data?.fees) {
        feesList = data.fees;
      } else {
        feesList = [];
      }

      setFees(feesList);

      // Update statistics
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
      toast.error('خطا در دریافت فیس‌ها');
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت تمام درخواست‌های بستری ============
  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admission-requests/all');
      
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setAllRequests(data.all_requests || []);
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        
        setStatistics(prev => ({
          ...prev,
          total_requests: data.all_requests?.length || 0,
          unpaid_requests: data.unpaid_requests?.length || 0,
          paid_requests: data.paid_requests?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('خطا در دریافت درخواست‌های بستری');
    } finally {
      setLoading(false);
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
        fee_date: values.fee_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        fee_time: values.fee_time?.format('HH:mm') || moment().format('HH:mm')
      };

      await axios.post('/api/admission-fees', data);
      toast.success('فیس بستری با موفقیت ایجاد شد');
      
      setModalVisible(false);
      feeForm.resetFields();
      fetchFeesData();
      fetchAllRequests();
      
      if (admissionId) {
        fetchAdmissionData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ایجاد فیس بستری');
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
          await axios.post(`/api/admission-fees/${id}/collect`);
          toast.success('فیس با موفقیت دریافت شد');
          fetchFeesData();
          fetchAllRequests();
          if (admissionId) {
            fetchAdmissionData();
          }
        } catch (error) {
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
          await axios.delete(`/api/admission-fees/${id}`);
          toast.success('فیس با موفقیت حذف شد');
          fetchFeesData();
          fetchAllRequests();
        } catch (error) {
          toast.error(error.response?.data?.message || 'خطا در حذف فیس');
        }
      }
    });
  };

  // ============ پرینت رسید ============
  const handlePrintReceipt = async (id) => {
    try {
      const response = await axios.get(`/api/admission-fees/${id}/print`);
      setReceiptData(response.data.data);
      setReceiptModal(true);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات برای پرینت');
    }
  };

  // ============ باز کردن فرم فیس ============
  const handleOpenFeeForm = (request = null) => {
    setSelectedRequest(request);
    setEditingFee(null);
    feeForm.resetFields();
    
    const defaultAmount = request?.amount || admission?.total_amount || 0;
    
    feeForm.setFieldsValue({
      amount: defaultAmount,
      paid_amount: 0,
      discount: 0,
      payment_method: 'cash',
      fee_date: moment(),
      fee_time: moment(),
      description: request 
        ? `بستری: ${request.admission_type || ''} - ${request.ward_name || ''}`
        : `بستری: ${admission?.ward?.name || ''}`,
      note: request 
        ? `درخواست بارکد: ${request.barcode || ''}`
        : ''
    });
    
    setModalVisible(true);
  };

  // ============ Helper Functions ============
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
      cancelled: { label: 'لغو شده', color: '#ef4444', icon: <CloseCircleOutlined /> }
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

  // ============ ستون‌های جدول فیس‌ها ============
  const feeColumns = [
    {
      title: 'شماره رسید',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'تاریخ',
      dataIndex: 'fee_date',
      key: 'fee_date',
      render: (date) => formatDate(date)
    },
    {
      title: 'ساعت',
      dataIndex: 'fee_time',
      key: 'fee_time',
      render: (time) => time ? moment(time, 'HH:mm:ss').format('HH:mm') : '-'
    },
    {
      title: 'مبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <span style={{ color: '#fcd34d' }}>💰 {amount?.toLocaleString()} AFN</span>
    },
    {
      title: 'پرداخت شده',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      render: (amount) => <span style={{ color: '#22c55e' }}>{amount?.toLocaleString()} AFN</span>
    },
    {
      title: 'باقیمانده',
      key: 'remaining',
      render: (_, record) => {
        const remaining = calculateRemaining(record.amount, record.paid_amount, record.discount);
        return <span style={{ color: remaining > 0 ? '#ef4444' : '#22c55e' }}>
          {remaining.toFixed(2)} AFN
        </span>;
      }
    },
    {
      title: 'نوع فیس',
      dataIndex: 'fee_type',
      key: 'fee_type',
      render: (type) => ({
        daily: 'روزانه',
        weekly: 'هفتگی',
        monthly: 'ماهانه',
        custom: 'سفارشی'
      }[type] || type)
    },
    {
      title: 'روش پرداخت',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method) => getMethodLabel(method)
    },
    {
      title: 'وضعیت',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const info = getStatusLabel(status);
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>;
      }
    },
    {
      title: 'عملیات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Tooltip title="دریافت فیس">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCollectFee(record.id)}
              >
                دریافت
              </Button>
            </Tooltip>
          )}
          <Tooltip title="پرینت رسید">
            <Button
              type="default"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintReceipt(record.id)}
            >
              پرینت
            </Button>
          </Tooltip>
          <Tooltip title="حذف">
            <Popconfirm
              title="آیا از حذف این فیس اطمینان دارید؟"
              onConfirm={() => handleDeleteFee(record.id)}
              okText="حذف"
              cancelText="انصراف"
            >
              <Button
                type="danger"
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // ============ دریافت درخواست‌های فیلتر شده ============
  const getFilteredRequests = () => {
    if (filterMode === 'unpaid') return unpaidRequests;
    if (filterMode === 'paid') return paidRequests;
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
          
          return (
            <div
              key={request.id || index}
              style={{
                ...styles.requestItem,
                borderRightColor: hasFeeRecord ? '#22c55e' : '#f59e0b'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderRightColor = '#ef4444';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderRightColor = hasFeeRecord ? '#22c55e' : '#f59e0b';
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
                  </div>

                  {/* اطلاعات مریض */}
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
                  </div>

                  {/* تاریخ و اطلاعات دیگر */}
                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '5px' }}>
                    📅 {formatDateTime(request.request_date || request.created_at)}
                    {request.status && (
                      <span style={{ marginRight: '15px' }}>
                        | وضعیت: {request.status_label || request.status}
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
                      </div>
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div style={{ display: 'flex', gap: '8px' }}>
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
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
                fetchFeesData();
                fetchAllRequests();
              }}
            >
              بروزرسانی
            </Button>
          </div>
        </div>

        {/* آمار */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
            <div style={{ color: '#fcd34d', fontWeight: 'bold', fontSize: '20px' }}>
              {statistics.total_amount.toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#22c55e', fontSize: '12px' }}>✅ پرداخت شده</span>
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '20px' }}>
              {statistics.paid_amount.toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#ef4444', fontSize: '12px' }}>⏳ پرداخت نشده</span>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>
              {statistics.pending_amount.toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ color: '#f59e0b', fontSize: '12px' }}>🟡 بدون فیس</span>
            <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '20px' }}>
              {statistics.unpaid_requests}
            </div>
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
      >
        <TabPane
          tab={<span><FileTextOutlined /> درخواست‌های بستری</span>}
          key="requests"
        >
          {/* فیلترها */}
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

          {/* لیست درخواست‌ها */}
          {renderRequestsList()}
        </TabPane>

        <TabPane
          tab={<span><DollarOutlined /> لیست فیس‌ها</span>}
          key="fees"
        >
          <Table
            columns={feeColumns}
            dataSource={fees}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1200 }}
          />
        </TabPane>

        <TabPane
          tab={<span><BellOutlined /> هشدارها</span>}
          key="alerts"
        >
          {fees.filter(f => f.status === 'pending').length > 0 ? (
            <List
              dataSource={fees.filter(f => f.status === 'pending')}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleCollectFee(item.id)}
                    >
                      دریافت
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                    title={
                      <span>
                        {item.receipt_number} - {item.amount?.toLocaleString()} AFN
                      </span>
                    }
                    description={
                      <div>
                        <p>بیمار: {item.patient?.full_name || 'نامشخص'}</p>
                        <p>تاریخ: {formatDateTime(item.created_at)}</p>
                        {moment().diff(moment(item.created_at), 'hours') > 24 && (
                          <Tag color="red">⏰ بیش از 24 ساعت گذشته</Tag>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="هیچ هشداری وجود ندارد" />
          )}
        </TabPane>
      </Tabs>

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
        destroyOnClose
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

        <Form
          form={feeForm}
          layout="vertical"
          onFinish={handleSubmitFee}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="مبلغ کل (AFN)"
                rules={[{ required: true, message: 'لطفاً مبلغ را وارد کنید' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={100}
                  placeholder="مبلغ را وارد کنید"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paid_amount"
                label="مبلغ پرداخت شده (AFN)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={100}
                  placeholder="مبلغ پرداخت شده"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="discount"
                label="تخفیف (%)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={1}
                  placeholder="درصد تخفیف"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payment_method"
                label="روش پرداخت"
                rules={[{ required: true, message: 'لطفاً روش پرداخت را انتخاب کنید' }]}
              >
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
                name="fee_date"
                label="تاریخ"
                rules={[{ required: true, message: 'لطفاً تاریخ را انتخاب کنید' }]}
              >
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fee_time"
                label="ساعت"
                rules={[{ required: true, message: 'لطفاً ساعت را انتخاب کنید' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="توضیحات"
          >
            <TextArea rows={2} placeholder="توضیحات اضافی..." />
          </Form.Item>

          <Form.Item
            name="note"
            label="یادداشت"
          >
            <TextArea rows={2} placeholder="یادداشت..." />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button onClick={() => {
                setModalVisible(false);
                feeForm.resetFields();
              }}>
                انصراف
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<SaveOutlined />}
              >
                {editingFee ? 'ذخیره تغییرات' : 'ثبت فیس'}
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
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            پرینت
          </Button>,
          <Button key="close" onClick={() => setReceiptModal(false)}>
            بستن
          </Button>
        ]}
        width={600}
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
                {receiptData.fee?.receipt_number}
              </Descriptions.Item>
              <Descriptions.Item label="نام بیمار" span={2}>
                {receiptData.patient?.full_name || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="کد ملی">
                {receiptData.patient?.national_id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="شماره تماس">
                {receiptData.patient?.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="بخش">
                {receiptData.admission?.ward?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="تخت">
                {receiptData.admission?.bed?.bed_number || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="تاریخ">
                {formatDate(receiptData.fee?.fee_date)}
              </Descriptions.Item>
              <Descriptions.Item label="ساعت">
                {receiptData.fee?.fee_time ? moment(receiptData.fee.fee_time, 'HH:mm:ss').format('HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="مبلغ" span={2}>
                <span style={{ color: '#fcd34d', fontWeight: 'bold' }}>
                  {receiptData.fee?.amount?.toLocaleString()} AFN
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="روش پرداخت">
                {getMethodLabel(receiptData.fee?.payment_method)}
              </Descriptions.Item>
              <Descriptions.Item label="وضعیت">
                {getStatusLabel(receiptData.fee?.status)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="دریافت کننده">
                {receiptData.collector?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="توضیحات" span={2}>
                {receiptData.fee?.description || 'ندارد'}
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