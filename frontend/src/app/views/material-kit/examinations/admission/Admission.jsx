// resources/js/pages/Admission/AdmissionPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Form, Input, Select, Button, Card, DatePicker, TimePicker, Space, 
  Table, Tag, Modal, Descriptions, Tabs, Statistic, Row, Col,
  Steps, Badge, Progress, Alert, Divider,
  Empty, Spin, Avatar, Tooltip, List,
  InputNumber, message
} from 'antd';
import { 
  PlusOutlined, CheckCircleOutlined, ClockCircleOutlined, 
  CloseCircleOutlined, PrinterOutlined, EyeOutlined,
  UserOutlined, MedicineBoxOutlined,
  DollarOutlined, FileTextOutlined, ReloadOutlined,
  SearchOutlined, FilterOutlined,
  WarningOutlined, BellOutlined,
  ArrowRightOutlined, ArrowLeftOutlined, SaveOutlined,
  CheckOutlined, ExclamationCircleOutlined,
  HospitalOutlined, BedOutlined, UserAddOutlined
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
  card: {
    marginBottom: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  patientCard: {
    background: '#1f2937',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '10px',
    borderRight: '4px solid #3b82f6',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  patientCardHover: {
    borderRightColor: '#ef4444',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  stepContainer: {
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    marginBottom: '20px'
  }
};

const AdmissionPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [feeForm] = Form.useForm();
  
  // State for data
  const [patients, setPatients] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [fees, setFees] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientData, setSelectedPatientData] = useState(null);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    discharged: 0,
    pending: 0,
    pending_fees: 0,
    total_fees: 0
  });
  
  // State for fee management
  const [feeStatistics, setFeeStatistics] = useState({
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    total_fees: 0,
    pending_fees: 0,
    paid_fees: 0
  });
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Steps configuration
  const steps = [
    {
      title: 'انتخاب بیمار',
      icon: <UserOutlined />,
      content: 'بیمار مورد نظر را از لیست انتخاب کنید'
    },
    {
      title: 'اطلاعات بستری',
      icon: <MedicineBoxOutlined />,
      content: 'اطلاعات بستری را وارد کنید'
    },
    {
      title: 'تایید و ثبت',
      icon: <CheckCircleOutlined />,
      content: 'اطلاعات را تایید و ثبت کنید'
    }
  ];

  useEffect(() => {
    fetchInitialData();
    fetchStatistics();
    fetchPendingAlerts();
    fetchPendingPatients();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [patientsRes, wardsRes, doctorsRes, admissionsRes, feesRes] = await Promise.all([
        axios.get('/api/patients'),
        axios.get('/api/wards'),
        axios.get('/api/doctors'),
        axios.get('/api/admissions'),
        axios.get('/api/admission-fees')
      ]);
      setPatients(patientsRes.data.data || []);
      setWards(wardsRes.data.data || []);
      setDoctors(doctorsRes.data.data || []);
      setAdmissions(admissionsRes.data.data || []);
      setFees(feesRes.data.data || []);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // دریافت بیماران در انتظار بستری
  const fetchPendingPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/patients/pending-admission');
      if (response.data?.data) {
        setPendingPatients(response.data.data);
        setStatistics(prev => ({
          ...prev,
          pending: response.data.data.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching pending patients:', error);
      // اگر API وجود نداشت، از لیست بیماران استفاده کن
      setPendingPatients(patients.filter(p => p.status === 'pending' || !p.admission_id));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/admissions/statistics');
      if (response.data?.data) {
        setStatistics(prev => ({
          ...prev,
          total: response.data.data.total || 0,
          active: response.data.data.active || 0,
          discharged: response.data.data.discharged || 0,
          pending_fees: response.data.data.pending_fees || 0,
          total_fees: response.data.data.total_fees || 0
        }));
      }
    } catch (error) {
      console.error('Statistics error:', error);
    }
  };

  const fetchPendingAlerts = async () => {
    try {
      const response = await axios.get('/api/admission-fees/pending/alerts');
      if (response.data?.data) {
        setPendingAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Alerts error:', error);
    }
  };

  const handleWardChange = async (wardId) => {
    try {
      const response = await axios.get(`/api/wards/${wardId}/beds`);
      setBeds(response.data.data || []);
      form.setFieldValue('bed_id', undefined);
    } catch (error) {
      toast.error('خطا در دریافت تخت‌ها');
    }
  };

  // دریافت اطلاعات کامل بیمار
  const fetchPatientDetails = async (patientId) => {
    try {
      const response = await axios.get(`/api/patients/${patientId}`);
      if (response.data?.data) {
        setSelectedPatientData(response.data.data);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      toast.error('خطا در دریافت اطلاعات بیمار');
    }
    return null;
  };

  // انتخاب بیمار از لیست
  const handleSelectPatient = async (patient) => {
    setLoading(true);
    try {
      // دریافت اطلاعات کامل بیمار
      const patientData = await fetchPatientDetails(patient.id);
      if (patientData) {
        setSelectedPatient(patientData);
        // پر کردن فرم با اطلاعات بیمار
        form.setFieldsValue({
          patient_id: patientData.id,
          patient_name: patientData.full_name || `${patientData.first_name || ''} ${patientData.last_name || ''}`,
          national_id: patientData.national_id,
          phone: patientData.phone || patientData.mobile,
          age: patientData.age,
          gender: patientData.gender
        });
        // رفتن به مرحله بعد
        setCurrentStep(1);
        toast.success(`✅ بیمار ${patientData.full_name || 'انتخاب شد'}`);
      }
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات بیمار');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        patient_id: selectedPatient?.id,
        doctor_id: values.doctor_id,
        ward_id: values.ward_id,
        bed_id: values.bed_id,
        admission_date: values.admission_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        expected_discharge_date: values.expected_discharge_date?.format('YYYY-MM-DD') || null,
        diagnosis: values.diagnosis,
        notes: values.notes,
        status: 'admitted'
      };

      const response = await axios.post('/api/admissions', payload);
      toast.success('بیمار با موفقیت بستری شد');
      setAdmissions(prev => [response.data.data, ...prev]);
      form.resetFields();
      setBeds([]);
      setSelectedPatient(null);
      setSelectedPatientData(null);
      setCurrentStep(0);
      fetchStatistics();
      fetchPendingPatients();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در بستری بیمار');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeeSubmit = async (values) => {
    setSubmitting(true);
    try {
      const data = {
        ...values,
        admission_request_id: selectedAdmission?.id,
        patient_id: selectedAdmission?.patient_id,
        fee_date: values.fee_date?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD'),
        fee_time: values.fee_time?.format('HH:mm') || moment().format('HH:mm')
      };
      
      await axios.post('/api/admission-fees', data);
      toast.success('فیس بستری با موفقیت ایجاد شد');
      setFeeModalVisible(false);
      feeForm.resetFields();
      fetchInitialData();
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ایجاد فیس بستری');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCollectFee = async (id) => {
    Modal.confirm({
      title: 'تایید دریافت فیس',
      content: 'آیا از دریافت این فیس اطمینان دارید؟',
      onOk: async () => {
        try {
          await axios.post(`/api/admission-fees/${id}/collect`);
          toast.success('فیس با موفقیت دریافت شد');
          fetchInitialData();
          fetchStatistics();
        } catch (error) {
          toast.error(error.response?.data?.message || 'خطا در دریافت فیس');
        }
      }
    });
  };

  const handleDischarge = async (id) => {
    Modal.confirm({
      title: 'تایید ترخیص',
      content: 'آیا از ترخیص این بیمار اطمینان دارید؟',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          await axios.post(`/api/admissions/${id}/discharge`);
          toast.success('بیمار با موفقیت ترخیص شد');
          fetchInitialData();
          fetchStatistics();
          fetchPendingPatients();
        } catch (error) {
          toast.error(error.response?.data?.message || 'خطا در ترخیص بیمار');
        }
      }
    });
  };

  const handlePrintReceipt = async (id) => {
    try {
      const response = await axios.get(`/api/admission-fees/${id}/print`);
      setReceiptData(response.data.data);
      setReceiptModal(true);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات برای پرینت');
    }
  };

  const handleViewDetails = (admission) => {
    setSelectedAdmission(admission);
    setModalVisible(true);
    axios.get(`/api/admission-fees/admission/${admission.id}`)
      .then(response => {
        if (response.data?.data) {
          setFeeStatistics({
            total_amount: response.data.data.total_amount || 0,
            paid_amount: response.data.data.paid_amount || 0,
            pending_amount: response.data.data.pending_amount || 0,
            total_fees: response.data.data.fees?.length || 0,
            pending_fees: response.data.data.fees?.filter(f => f.status === 'pending').length || 0,
            paid_fees: response.data.data.fees?.filter(f => f.status === 'paid').length || 0
          });
        }
      })
      .catch(error => console.error('Error loading fees:', error));
  };

  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // فیلتر کردن بیماران در انتظار
  const getFilteredPendingPatients = () => {
    if (!searchText) return pendingPatients;
    return pendingPatients.filter(p => 
      (p.full_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (p.national_id || '').includes(searchText) ||
      (p.phone || '').includes(searchText)
    );
  };

  // Columns for admissions table
  const admissionColumns = [
    {
      title: 'شماره',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 60
    },
    {
      title: 'نام بیمار',
      dataIndex: ['patient', 'full_name'],
      key: 'patient',
      render: (name, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <span>{name || record.patient?.first_name || 'نامشخص'}</span>
        </Space>
      )
    },
    {
      title: 'بخش',
      dataIndex: ['ward', 'name'],
      key: 'ward',
      render: (name) => name || '-'
    },
    {
      title: 'تخت',
      dataIndex: ['bed', 'bed_number'],
      key: 'bed',
      render: (number) => number || '-'
    },
    {
      title: 'پزشک معالج',
      dataIndex: ['doctor', 'name'],
      key: 'doctor',
      render: (name) => name || '-'
    },
    {
      title: 'تاریخ بستری',
      dataIndex: 'admission_date',
      key: 'admission_date',
      render: (date) => date ? moment(date).format('YYYY/MM/DD') : '-'
    },
    {
      title: 'وضعیت',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: <Tag color="orange" icon={<ClockCircleOutlined />}>در انتظار</Tag>,
          admitted: <Tag color="green" icon={<CheckCircleOutlined />}>بستری</Tag>,
          discharged: <Tag color="blue" icon={<CloseCircleOutlined />}>ترخیص شده</Tag>,
          cancelled: <Tag color="red" icon={<CloseCircleOutlined />}>لغو شده</Tag>
        };
        return statusMap[status] || <Tag>{status}</Tag>;
      }
    },
    {
      title: 'وضعیت پرداخت',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => {
        const map = {
          pending: <Tag color="red">پرداخت نشده</Tag>,
          partial: <Tag color="orange">پرداخت جزئی</Tag>,
          paid: <Tag color="green">پرداخت کامل</Tag>
        };
        return map[status] || status;
      }
    },
    {
      title: 'عملیات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="جزئیات">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'admitted' && (
            <Tooltip title="ترخیص">
              <Button
                type="danger"
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleDischarge(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'admitted' && (
            <Tooltip title="ثبت فیس">
              <Button
                type="default"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => {
                  setSelectedAdmission(record);
                  setFeeModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // Columns for fees table
  const feeColumns = [
    {
      title: 'شماره رسید',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      render: (text) => text || '-'
    },
    {
      title: 'تاریخ',
      dataIndex: 'fee_date',
      key: 'fee_date',
      render: (date) => date ? moment(date).format('YYYY/MM/DD') : '-'
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
      render: (amount) => amount ? `${amount.toLocaleString()} AFN` : '0 AFN'
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
      }[type] || type || '-')
    },
    {
      title: 'وضعیت',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const map = {
          pending: <Tag color="orange" icon={<ClockCircleOutlined />}>در انتظار</Tag>,
          paid: <Tag color="green" icon={<CheckCircleOutlined />}>دریافت شده</Tag>,
          cancelled: <Tag color="red" icon={<CloseCircleOutlined />}>لغو شده</Tag>
        };
        return map[status] || status;
      }
    },
    {
      title: 'عملیات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCollectFee(record.id)}
            >
              دریافت
            </Button>
          )}
          <Button
            type="default"
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => handlePrintReceipt(record.id)}
          >
            پرینت
          </Button>
        </Space>
      )
    }
  ];

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#1890ff' }}>
              <UserAddOutlined /> انتخاب بیمار برای بستری
            </h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              لطفاً بیمار مورد نظر را از لیست بیماران در انتظار بستری انتخاب کنید
            </p>
            
            {/* جستجو */}
            <Input
              placeholder="جستجوی بیمار..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: '16px', width: '100%' }}
              allowClear
            />
            
            {/* لیست بیماران در انتظار */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <p style={{ color: '#9ca3af', marginTop: '10px' }}>در حال بارگذاری...</p>
              </div>
            ) : getFilteredPendingPatients().length === 0 ? (
              <Empty 
                description={
                  <span>
                    {searchText ? 'بیماری با این مشخصات یافت نشد' : 'هیچ بیماری در انتظار بستری وجود ندارد'}
                  </span>
                }
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getFilteredPendingPatients().map((patient) => (
                  <div
                    key={patient.id}
                    style={styles.patientCard}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderRightColor = '#ef4444';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderRightColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Avatar size="large" icon={<UserOutlined />} style={{ backgroundColor: '#3b82f6' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px' }}>
                          {patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          <span>کد ملی: {patient.national_id || '-'}</span>
                          <span style={{ marginLeft: '15px' }}>📞 {patient.phone || patient.mobile || '-'}</span>
                          <span style={{ marginLeft: '15px' }}>🎂 {patient.age || '-'} سال</span>
                          <span style={{ marginLeft: '15px' }}>⚤ {patient.gender === 'male' ? 'مرد' : patient.gender === 'female' ? 'زن' : '-'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      count="در انتظار بستری" 
                      style={{ backgroundColor: '#f59e0b' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#1890ff' }}>
              <HospitalOutlined /> اطلاعات بستری
            </h3>
            
            {/* اطلاعات بیمار انتخاب شده */}
            {selectedPatient && (
              <Card size="small" style={{ marginBottom: '20px', background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="نام بیمار">
                    <strong>{selectedPatient.full_name || selectedPatient.first_name || 'نامشخص'}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="کد ملی">{selectedPatient.national_id || '-'}</Descriptions.Item>
                  <Descriptions.Item label="شماره تماس">{selectedPatient.phone || selectedPatient.mobile || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="doctor_id"
                    label="پزشک معالج"
                    rules={[{ required: true, message: 'لطفاً پزشک را انتخاب کنید' }]}
                  >
                    <Select placeholder="انتخاب پزشک">
                      {doctors.map(doctor => (
                        <Option key={doctor.id} value={doctor.id}>
                          {doctor.name || 'نامشخص'} - {doctor.specialization || ''}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="ward_id"
                    label="بخش"
                    rules={[{ required: true, message: 'لطفاً بخش را انتخاب کنید' }]}
                  >
                    <Select
                      placeholder="انتخاب بخش"
                      onChange={handleWardChange}
                    >
                      {wards.map(ward => (
                        <Option key={ward.id} value={ward.id}>
                          {ward.name || 'نامشخص'} (تخت‌های موجود: {ward.available_beds || 0})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="bed_id"
                    label="تخت"
                    rules={[{ required: true, message: 'لطفاً تخت را انتخاب کنید' }]}
                  >
                    <Select
                      placeholder="انتخاب تخت"
                      disabled={!form.getFieldValue('ward_id')}
                    >
                      {beds.map(bed => (
                        <Option key={bed.id} value={bed.id}>
                          <BedOutlined /> {bed.bed_number || '-'} - {bed.status === 'available' ? 'موجود' : 'اشغال'}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="admission_date"
                    label="تاریخ بستری"
                    rules={[{ required: true, message: 'لطفاً تاریخ را انتخاب کنید' }]}
                  >
                    <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} defaultValue={moment()} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="expected_discharge_date"
                    label="تاریخ پیش‌بینی ترخیص"
                  >
                    <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  {/* فضای خالی برای هماهنگی */}
                </Col>
              </Row>
              <Form.Item
                name="diagnosis"
                label="تشخیص"
                rules={[{ required: true, message: 'لطفاً تشخیص را وارد کنید' }]}
              >
                <TextArea rows={3} placeholder="تشخیص بیماری" />
              </Form.Item>
              <Form.Item
                name="notes"
                label="یادداشت"
              >
                <TextArea rows={2} placeholder="یادداشت‌های اضافی" />
              </Form.Item>
            </Form>
          </div>
        );
      case 2:
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#52c41a' }}>
              <CheckCircleOutlined /> تایید و ثبت
            </h3>
            <Alert
              message="تایید نهایی"
              description="لطفاً اطلاعات وارد شده را بررسی کنید و در صورت صحت، دکمه ثبت را بزنید."
              type="info"
              showIcon
              style={{ marginBottom: '20px' }}
            />
            <Descriptions bordered column={2}>
              <Descriptions.Item label="بیمار">
                {selectedPatient?.full_name || selectedPatient?.first_name || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="کد ملی">
                {selectedPatient?.national_id || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="بخش">
                {wards.find(w => w.id === form.getFieldValue('ward_id'))?.name || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="تخت">
                {beds.find(b => b.id === form.getFieldValue('bed_id'))?.bed_number || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="پزشک">
                {doctors.find(d => d.id === form.getFieldValue('doctor_id'))?.name || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="تاریخ بستری">
                {form.getFieldValue('admission_date')?.format('YYYY/MM/DD') || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="تاریخ پیش‌بینی ترخیص">
                {form.getFieldValue('expected_discharge_date')?.format('YYYY/MM/DD') || 'تعیین نشده'}
              </Descriptions.Item>
              <Descriptions.Item label="تشخیص" span={2}>
                {form.getFieldValue('diagnosis') || 'نامشخص'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header with Statistics */}
      <Card style={styles.card}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="در انتظار بستری"
              value={statistics.pending || 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="کل بستری‌ها"
              value={statistics.total || 0}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="بستری‌های فعال"
              value={statistics.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="ترخیص شده‌ها"
              value={statistics.discharged || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="فیس‌های در انتظار"
              value={pendingAlerts.length || 0}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={
                pendingAlerts.length > 0 && (
                  <Button
                    type="link"
                    size="small"
                    icon={<BellOutlined />}
                    onClick={() => setAlertModalVisible(true)}
                  >
                    مشاهده
                  </Button>
                )
              }
            />
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        style={{ background: 'white', borderRadius: '12px', padding: '20px' }}
      >
        <TabPane
          tab={<span><UserAddOutlined /> بستری بیمار</span>}
          key="pending"
        >
          <Card style={styles.card}>
            <div style={styles.stepContainer}>
              <Steps current={currentStep}>
                {steps.map(step => (
                  <Steps.Step key={step.title} title={step.title} icon={step.icon} />
                ))}
              </Steps>
              <div style={{ marginTop: '20px' }}>
                {renderStepContent()}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  icon={<ArrowLeftOutlined />}
                >
                  قبلی
                </Button>
                {currentStep === 2 ? (
                  <Button
                    type="primary"
                    onClick={form.submit}
                    loading={submitting}
                    icon={<SaveOutlined />}
                    size="large"
                  >
                    ثبت بستری
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={handleNextStep}
                    icon={<ArrowRightOutlined />}
                    disabled={currentStep === 0 && !selectedPatient}
                    size="large"
                  >
                    بعدی
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </TabPane>

        <TabPane
          tab={<span><UserOutlined /> لیست بیماران بستری</span>}
          key="list"
        >
          <Card style={styles.card}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input
                  placeholder="جستجوی بیمار..."
                  prefix={<SearchOutlined />}
                  style={{ width: 250 }}
                />
                <Select defaultValue="all" style={{ width: 150 }}>
                  <Option value="all">همه</Option>
                  <Option value="admitted">بستری</Option>
                  <Option value="discharged">ترخیص شده</Option>
                  <Option value="pending">در انتظار</Option>
                </Select>
              </Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchInitialData();
                  fetchStatistics();
                  fetchPendingPatients();
                }}
              >
                بروزرسانی
              </Button>
            </div>
            <Table
              columns={admissionColumns}
              dataSource={admissions}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={<span><DollarOutlined /> مدیریت فیس‌ها</span>}
          key="fees"
        >
          <Card style={styles.card}>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={6}>
                <Statistic
                  title="کل فیس‌ها"
                  value={feeStatistics.total_fees || 0}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="مبلغ کل"
                  value={feeStatistics.total_amount || 0}
                  prefix={<DollarOutlined />}
                  suffix="AFN"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="پرداخت شده"
                  value={feeStatistics.paid_amount || 0}
                  prefix={<CheckCircleOutlined />}
                  suffix="AFN"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="پرداخت نشده"
                  value={feeStatistics.pending_amount || 0}
                  prefix={<ClockCircleOutlined />}
                  suffix="AFN"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>

            <Table
              columns={feeColumns}
              dataSource={fees}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={<span><BellOutlined /> هشدارها</span>}
          key="alerts"
        >
          <Card style={styles.card}>
            {pendingAlerts.length > 0 ? (
              <List
                dataSource={pendingAlerts}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleCollectFee(item.id)}
                      >
                        دریافت فیس
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                      title={`بیمار: ${item.patient?.full_name || 'نامشخص'}`}
                      description={
                        <div>
                          <p>شماره رسید: {item.receipt_number || '-'}</p>
                          <p>مبلغ: {item.amount ? item.amount.toLocaleString() : 0} AFN</p>
                          <p>مدت زمان انتظار: {item.created_at ? moment(item.created_at).fromNow() : '-'}</p>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="هیچ هشداری وجود ندارد" />
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* Modal for Admission Details */}
      <Modal
        title="جزئیات بستری"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            بستن
          </Button>,
          <Button
            key="fees"
            type="primary"
            onClick={() => setFeeModalVisible(true)}
            icon={<DollarOutlined />}
          >
            ثبت فیس جدید
          </Button>
        ]}
        width={800}
      >
        {selectedAdmission && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="نام بیمار" span={2}>
                {selectedAdmission.patient?.full_name || selectedAdmission.patient?.first_name || 'نامشخص'}
              </Descriptions.Item>
              <Descriptions.Item label="کد ملی">
                {selectedAdmission.patient?.national_id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="شماره تماس">
                {selectedAdmission.patient?.phone || selectedAdmission.patient?.mobile || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="بخش">
                {selectedAdmission.ward?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="تخت">
                {selectedAdmission.bed?.bed_number || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="پزشک معالج">
                {selectedAdmission.doctor?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="تاریخ بستری">
                {selectedAdmission.admission_date ? moment(selectedAdmission.admission_date).format('YYYY/MM/DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="تشخیص" span={2}>
                {selectedAdmission.diagnosis || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="وضعیت بستری">
                <Tag color={selectedAdmission.status === 'admitted' ? 'green' : 'blue'}>
                  {selectedAdmission.status === 'admitted' ? 'بستری' : 'ترخیص شده'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="وضعیت پرداخت">
                <Tag color={
                  selectedAdmission.payment_status === 'paid' ? 'green' :
                  selectedAdmission.payment_status === 'partial' ? 'orange' : 'red'
                }>
                  {selectedAdmission.payment_status === 'paid' ? 'پرداخت کامل' :
                   selectedAdmission.payment_status === 'partial' ? 'پرداخت جزئی' : 'پرداخت نشده'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider>فیس‌های این بستری</Divider>
            <Table
              columns={feeColumns}
              dataSource={selectedAdmission.fees || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </>
        )}
      </Modal>

      {/* Modal for Fee Registration */}
      <Modal
        title="ثبت فیس بستری جدید"
        open={feeModalVisible}
        onCancel={() => setFeeModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={feeForm}
          layout="vertical"
          onFinish={handleFeeSubmit}
        >
          <Form.Item
            name="amount"
            label="مبلغ"
            rules={[{ required: true, message: 'لطفاً مبلغ را وارد کنید' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="AFN"
              min={0}
              step={100}
            />
          </Form.Item>

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

          <Form.Item
            name="payment_method"
            label="روش پرداخت"
            rules={[{ required: true, message: 'لطفاً روش پرداخت را انتخاب کنید' }]}
          >
            <Select>
              <Option value="cash">نقدی</Option>
              <Option value="card">کارت</Option>
              <Option value="bank_transfer">انتقال بانکی</Option>
              <Option value="insurance">بیمه</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fee_date"
                label="تاریخ"
                rules={[{ required: true, message: 'لطفاً تاریخ را انتخاب کنید' }]}
              >
                <DatePicker format="YYYY/MM/DD" style={{ width: '100%' }} defaultValue={moment()} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fee_time"
                label="ساعت"
                rules={[{ required: true, message: 'لطفاً ساعت را انتخاب کنید' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} defaultValue={moment()} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="توضیحات"
          >
            <TextArea rows={3} placeholder="توضیحات اضافی" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                ثبت فیس
              </Button>
              <Button onClick={() => setFeeModalVisible(false)}>
                لغو
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for Receipt Print */}
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
                {receiptData.fee?.receipt_number || '-'}
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
                {receiptData.fee?.fee_date ? moment(receiptData.fee.fee_date).format('YYYY/MM/DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="ساعت">
                {receiptData.fee?.fee_time ? moment(receiptData.fee.fee_time, 'HH:mm:ss').format('HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="مبلغ" span={2}>
                <span style={{ color: '#fcd34d', fontWeight: 'bold' }}>
                  {receiptData.fee?.amount ? receiptData.fee.amount.toLocaleString() : 0} AFN
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="وضعیت">
                {receiptData.fee?.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}
              </Descriptions.Item>
              <Descriptions.Item label="دریافت کننده">
                {receiptData.collector?.name || '-'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Alert Modal for pending fees */}
      <Modal
        title="هشدارهای فیس بستری"
        open={alertModalVisible}
        onCancel={() => setAlertModalVisible(false)}
        footer={null}
        width={700}
      >
        {pendingAlerts.length > 0 ? (
          <List
            dataSource={pendingAlerts}
            renderItem={(item) => (
              <List.Item>
                <Card style={{ width: '100%' }}>
                  <Row>
                    <Col span={8}>
                      <strong>بیمار:</strong> {item.patient?.full_name || 'نامشخص'}
                    </Col>
                    <Col span={8}>
                      <strong>مبلغ:</strong> {item.amount ? item.amount.toLocaleString() : 0} AFN
                    </Col>
                    <Col span={8}>
                      <strong>مدت انتظار:</strong> {item.created_at ? moment(item.created_at).fromNow() : '-'}
                    </Col>
                  </Row>
                  <div style={{ marginTop: 10 }}>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleCollectFee(item.id)}
                      icon={<CheckCircleOutlined />}
                    >
                      دریافت فیس
                    </Button>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="هیچ هشداری وجود ندارد" />
        )}
      </Modal>
    </div>
  );
};

export default AdmissionPage;