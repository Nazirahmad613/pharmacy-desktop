// src/pages/Stock.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MainLayoutjur from '../../../../components/Mainlayoutjur';
import { FaBox, FaExclamationTriangle, FaCheckCircle, FaClock, FaChartLine, FaFilter, FaSearch, FaSortAmountDown, FaSortAmountUp, FaTag, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaBell, FaShoppingCart } from 'react-icons/fa';

const Stock = () => {
    const [stocks, setStocks] = useState([]);
    const [summary, setSummary] = useState(null);
    const [expiringItems, setExpiringItems] = useState([]);
    const [lowStockWarnings, setLowStockWarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterType, setFilterType] = useState('');
    const [sortField, setSortField] = useState('med_name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [authError, setAuthError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [debugInfo, setDebugInfo] = useState(null);
    const [showWarnings, setShowWarnings] = useState(false);
    
    // State for form
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStock, setEditingStock] = useState(null);
    const [formData, setFormData] = useState({
        med_id: '',
        supplier_id: '',
        type: '',
        exp_date: '',
        quantity: '',
        batch_number: '',
        purchase_price: ''
    });

    // ==================== توکن و احراز هویت ====================
    
    const getToken = () => {
        return localStorage.getItem('token') || 
               localStorage.getItem('auth_token') || 
               sessionStorage.getItem('token') ||
               sessionStorage.getItem('auth_token') ||
               localStorage.getItem('sanctum_token');
    };

    const getAuthHeaders = () => {
        const token = getToken();
        return {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem('sanctum_token');
        window.location.href = '/login';
    };

    // ==================== دریافت داده‌ها ====================

    const fetchStockData = async () => {
        try {
            const response = await axios.get('/api/stock', getAuthHeaders());
            if (response.data.success) {
                setStocks(response.data.data || []);
                setAuthError(false);
                setErrorMessage('');
            }
        } catch (error) {
            if (error.response?.status === 401) {
                setAuthError(true);
                setErrorMessage('احراز هویت ناموفق - لطفاً دوباره وارد شوید');
            } else if (error.response?.status === 500) {
                setErrorMessage('خطای سرور - لطفاً با پشتیبانی تماس بگیرید');
            } else if (error.code === 'ERR_NETWORK') {
                setErrorMessage('خطای شبکه - لطفاً اتصال اینترنت خود را بررسی کنید');
            } else {
                setErrorMessage(error.message || 'خطای ناشناخته رخ داده است');
            }
            setDebugInfo({
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await axios.get('/api/stock/summary', getAuthHeaders());
            if (response.data.success) {
                setSummary(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const fetchExpiringItems = async () => {
        try {
            const response = await axios.get('/api/stock/expiring', getAuthHeaders());
            if (response.data.success) {
                setExpiringItems(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching expiring items:', error);
        }
    };

    const fetchLowStockWarnings = async () => {
        try {
            const response = await axios.get('/api/stock/low-stock', getAuthHeaders());
            if (response.data.success) {
                setLowStockWarnings(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching low stock warnings:', error);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        setErrorMessage('');
        
        if (!getToken()) {
            setAuthError(true);
            setErrorMessage('توکن احراز هویت یافت نشد. لطفاً وارد شوید.');
            setLoading(false);
            return;
        }
        
        await fetchStockData();
        await fetchSummary();
        await fetchExpiringItems();
        await fetchLowStockWarnings();
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // ==================== توابع فرم ====================

    const handleFormChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAddNew = () => {
        setEditingStock(null);
        setFormData({
            med_id: '',
            supplier_id: '',
            type: '',
            exp_date: '',
            quantity: '',
            batch_number: '',
            purchase_price: ''
        });
        setIsFormOpen(true);
    };

    const handleEdit = (stock) => {
        setEditingStock(stock);
        setFormData({
            med_id: stock.med_id || '',
            supplier_id: stock.supplier_id || '',
            type: stock.type || '',
            exp_date: stock.exp_date || '',
            quantity: stock.quantity || '',
            batch_number: stock.batch_number || '',
            purchase_price: stock.purchase_price || ''
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingStock) {
                await axios.put(`/api/stock/${editingStock.stock_id}`, formData, getAuthHeaders());
            } else {
                await axios.post('/api/stock', formData, getAuthHeaders());
            }
            setIsFormOpen(false);
            loadAllData();
        } catch (error) {
            console.error('Error saving stock:', error);
            setErrorMessage('خطا در ذخیره اطلاعات');
        }
    };

    const handleDelete = async (stockId) => {
        if (window.confirm('آیا از حذف این آیتم اطمینان دارید؟')) {
            try {
                await axios.delete(`/api/stock/${stockId}`, getAuthHeaders());
                loadAllData();
            } catch (error) {
                console.error('Error deleting stock:', error);
                setErrorMessage('خطا در حذف اطلاعات');
            }
        }
    };

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingStock(null);
    };

    // ==================== توابع مرتب‌سازی و فیلتر ====================

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return <FaSortAmountDown className="inline mr-1 opacity-30" size={12} />;
        return sortDirection === 'asc' ? <FaSortAmountUp className="inline mr-1" size={12} /> : <FaSortAmountDown className="inline mr-1" size={12} />;
    };

    const getStatusBadge = (status, statusColor) => {
        const colors = {
            green: 'bg-green-100 text-green-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            orange: 'bg-orange-100 text-orange-800',
            red: 'bg-red-100 text-red-800',
            gray: 'bg-gray-100 text-gray-800',
        };

        const texts = {
            موجود: 'موجود',
            'موجودی کم': 'موجودی کم',
            'در حال انقضا': 'در حال انقضا',
            'در حال انقضا (فوری)': 'در حال انقضا (فوری)',
            'منقضی شده': 'منقضی شده',
            ناموجود: 'ناموجود',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[statusColor] || colors.gray}`}>
                {texts[status] || status}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const typeColors = {
            tablet: 'bg-blue-100 text-blue-800',
            capsule: 'bg-purple-100 text-purple-800',
            syrup: 'bg-green-100 text-green-800',
            injection: 'bg-red-100 text-red-800',
            ointment: 'bg-yellow-100 text-yellow-800',
            drop: 'bg-cyan-100 text-cyan-800',
            inhaler: 'bg-indigo-100 text-indigo-800',
            cream: 'bg-pink-100 text-pink-800',
            gel: 'bg-amber-100 text-amber-800',
            supplier: 'bg-orange-100 text-orange-800',
            other: 'bg-gray-100 text-gray-800',
        };

        const typeTexts = {
            tablet: 'قرص',
            capsule: 'کپسول',
            syrup: 'شربت',
            injection: 'آمپول',
            ointment: 'پماد',
            drop: 'قطره',
            inhaler: 'اسپری',
            cream: 'کرم',
            gel: 'ژل',
            supplier: 'تأمین‌کننده',
            other: 'سایر',
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
                {typeTexts[type] || type || 'نامشخص'}
            </span>
        );
    };

    const filteredStocks = stocks.filter(stock => {
        const matchesSearch = stock.med_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             stock.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSupplier = !filterSupplier || stock.supplier_name === filterSupplier;
        const matchesType = !filterType || stock.type === filterType;
        return matchesSearch && matchesSupplier && matchesType;
    });

    const uniqueSuppliers = [...new Set(stocks.map(s => s.supplier_name).filter(Boolean))];
    const uniqueTypes = [...new Set(stocks.map(s => s.type).filter(Boolean))];

    // کامپوننت SummaryCard با props صحیح
    const SummaryCard = ({ title, value, icon, color }) => {
        return (
            <div className="bg-white rounded-xl shadow-md p-4 flex-1 min-w-[160px] border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs mb-1">{title}</p>
                        <p className="text-2xl font-bold text-gray-800">{value?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-3xl opacity-70" style={{ color: color }}>{icon}</div>
                </div>
            </div>
        );
    };

    const getFilteredAndSortedData = () => {
        let data = [];
        
        if (activeTab === 'all') {
            data = [...filteredStocks];
        } else if (activeTab === 'expiring') {
            data = [...expiringItems];
        } else if (activeTab === 'lowstock') {
            data = [...filteredStocks.filter(s => s.status === 'موجودی کم' || s.quantity <= 5)];
        }
        
        data.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            
            if (sortField === 'quantity' || sortField === 'days_left') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            } else if (sortField === 'exp_date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        return data;
    };

    // ==================== رندر ====================

    if (loading) {
        return (
            <MainLayoutjur>
                <div className="flex justify-center items-center h-96 bg-white">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">در حال بارگذاری اطلاعات...</p>
                    </div>
                </div>
            </MainLayoutjur>
        );
    }

    if (authError) {
        return (
            <MainLayoutjur>
                <div className="flex justify-center items-center h-96 bg-white">
                    <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
                        <div className="text-red-500 text-6xl mb-4">
                            <FaExclamationTriangle className="mx-auto" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">خطای احراز هویت</h2>
                        <p className="text-gray-600 mb-4">{errorMessage || 'شما دسترسی به این صفحه ندارید. لطفاً دوباره وارد شوید.'}</p>
                        {debugInfo && (
                            <div className="bg-gray-100 rounded-lg p-3 mb-4 text-right text-sm">
                                <p className="text-gray-700">اطلاعات خطا:</p>
                                <pre className="text-xs text-red-600 overflow-auto">
                                    {JSON.stringify(debugInfo, null, 2)}
                                </pre>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center justify-center mx-auto gap-2"
                        >
                            <FaSignOutAlt />
                            رفتن به صفحه ورود
                        </button>
                    </div>
                </div>
            </MainLayoutjur>
        );
    }

    if (errorMessage && !authError) {
        return (
            <MainLayoutjur>
                <div className="flex justify-center items-center h-96 bg-white">
                    <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
                        <div className="text-orange-500 text-6xl mb-4">
                            <FaExclamationTriangle className="mx-auto" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">خطا در دریافت اطلاعات</h2>
                        <p className="text-gray-600 mb-4">{errorMessage}</p>
                        {debugInfo && (
                            <div className="bg-gray-100 rounded-lg p-3 mb-4 text-right text-sm">
                                <p className="text-gray-700">اطلاعات خطا:</p>
                                <pre className="text-xs text-red-600 overflow-auto">
                                    {JSON.stringify(debugInfo, null, 2)}
                                </pre>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                        >
                            تلاش مجدد
                        </button>
                    </div>
                </div>
            </MainLayoutjur>
        );
    }

    const displayData = getFilteredAndSortedData();

    return (
        <MainLayoutjur>
            <div className="p-6 bg-white min-h-screen">
                {/* Header with Add Button and Warning Bell */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">مدیریت موجودی انبار</h1>
                        <p className="text-gray-500 text-sm">مدیریت و نظارت بر موجودی داروها و اقلام انبار</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {lowStockWarnings.length > 0 && (
                            <button
                                onClick={() => setShowWarnings(!showWarnings)}
                                className="relative bg-orange-100 hover:bg-orange-200 text-orange-600 px-3 py-2 rounded-lg transition-colors"
                            >
                                <FaBell size={18} />
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {lowStockWarnings.length}
                                </span>
                            </button>
                        )}
                        <button
                            onClick={handleAddNew}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <FaPlus />
                            افزودن موجودی جدید
                        </button>
                    </div>
                </div>

                {/* پنل هشدار موجودی کم */}
                {showWarnings && lowStockWarnings.length > 0 && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                <FaExclamationTriangle className="text-red-600" />
                                هشدار! موجودی برخی داروها کمتر از حد مجاز است
                            </h3>
                            <button
                                onClick={() => setShowWarnings(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {lowStockWarnings.map((warning, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border border-red-100">
                                    <div>
                                        <span className="font-medium text-gray-800">{warning.med_name}</span>
                                        <span className="text-xs text-gray-500 mr-2">
                                            (حداقل نیاز: {warning.minimum_quantity})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold ${warning.current_stock <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                            موجودی: {warning.current_stock}
                                        </span>
                                        {warning.need_order > 0 && (
                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
                                                <FaShoppingCart size={10} />
                                                نیاز به سفارش: {warning.need_order}
                                            </span>
                                        )}
                                        {warning.percentage > 0 && warning.percentage <= 50 && (
                                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-red-500 h-2 rounded-full" 
                                                    style={{ width: `${warning.percentage}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Horizontal Form Section */}
                {isFormOpen && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingStock ? 'ویرایش موجودی' : 'افزودن موجودی جدید'}
                            </h3>
                            <button
                                onClick={handleCancel}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">شناسه دارو</label>
                                <input
                                    type="text"
                                    name="med_id"
                                    value={formData.med_id}
                                    onChange={handleFormChange}
                                    placeholder="شناسه دارو"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">شناسه تأمین‌کننده</label>
                                <input
                                    type="text"
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={handleFormChange}
                                    placeholder="شناسه تأمین‌کننده"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">نوعیت</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">انتخاب نوع</option>
                                    <option value="tablet">قرص</option>
                                    <option value="capsule">کپسول</option>
                                    <option value="syrup">شربت</option>
                                    <option value="injection">آمپول</option>
                                    <option value="ointment">پماد</option>
                                    <option value="drop">قطره</option>
                                    <option value="inhaler">اسپری</option>
                                    <option value="cream">کرم</option>
                                    <option value="gel">ژل</option>
                                    <option value="other">سایر</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ انقضا</label>
                                <input
                                    type="date"
                                    name="exp_date"
                                    value={formData.exp_date}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="w-[120px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">تعداد</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleFormChange}
                                    placeholder="تعداد"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <button
                                    onClick={handleSubmit}
                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <FaSave />
                                    {editingStock ? 'بروزرسانی' : 'ذخیره'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-5 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <FaTimes />
                                    انصراف
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Cards - نمایش افقی با flex-wrap */}
                {summary && (
                    <div className="flex flex-wrap gap-4 mb-6">
                        <SummaryCard 
                            title="کل اقلام موجود" 
                            value={summary.total_items} 
                            icon={<FaBox />} 
                            color="#3B82F6"
                        />
                        <SummaryCard 
                            title="انواع دارو" 
                            value={summary.total_medicines} 
                            icon={<FaChartLine />} 
                            color="#10B981"
                        />
                        <SummaryCard 
                            title="در حال انقضا" 
                            value={summary.expiring_soon} 
                            icon={<FaClock />} 
                            color="#F59E0B"
                        />
                        <SummaryCard 
                            title="منقضی شده" 
                            value={summary.expired} 
                            icon={<FaExclamationTriangle />} 
                            color="#EF4444"
                        />
                        <SummaryCard 
                            title="موجودی کم" 
                            value={lowStockWarnings.length} 
                            icon={<FaExclamationTriangle />} 
                            color="#F97316"
                        />
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-4">
                    <nav className="flex space-x-8 space-x-reverse">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'all'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <FaBox className="inline ml-2" />
                            همه اقلام
                        </button>
                        <button
                            onClick={() => setActiveTab('expiring')}
                            className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'expiring'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <FaClock className="inline ml-2" />
                            در حال انقضا
                        </button>
                        <button
                            onClick={() => setActiveTab('lowstock')}
                            className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'lowstock'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <FaExclamationTriangle className="inline ml-2" />
                            موجودی کم
                        </button>
                    </nav>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-5">
                    <div className="flex-1 min-w-[200px] relative">
                        <FaSearch className="absolute right-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="جستجوی نام دارو یا تأمین‌کننده..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        />
                    </div>
                    <div className="w-64 relative">
                        <FaFilter className="absolute right-3 top-3 text-gray-400" />
                        <select
                            value={filterSupplier}
                            onChange={(e) => setFilterSupplier(e.target.value)}
                            className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                            <option value="">همه تأمین‌کنندگان</option>
                            {uniqueSuppliers.map(supplier => (
                                <option key={supplier} value={supplier}>{supplier}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-64 relative">
                        <FaTag className="absolute right-3 top-3 text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                            <option value="">همه نوعیت‌ها</option>
                            {uniqueTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-500">
                        <span className="font-medium">{displayData.length}</span> آیتم
                    </div>
                </div>

                {/* Stock Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th onClick={() => handleSort('med_name')} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors">
                                        {getSortIcon('med_name')} نام دارو
                                    </th>
                                    <th onClick={() => handleSort('supplier_name')} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors">
                                        {getSortIcon('supplier_name')} تأمین‌کننده
                                    </th>
                                    <th onClick={() => handleSort('type')} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors">
                                        {getSortIcon('type')} نوعیت
                                    </th>
                                    <th onClick={() => handleSort('exp_date')} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors">
                                        {getSortIcon('exp_date')} تاریخ انقضا
                                    </th>
                                    <th onClick={() => handleSort('quantity')} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors">
                                        {getSortIcon('quantity')} موجودی
                                    </th>
                                    <th onClick={() => handleSort('status')} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors">
                                        {getSortIcon('status')} وضعیت
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">عملیات</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {displayData.length > 0 ? (
                                    displayData.map((stock, index) => (
                                        <tr key={stock.stock_id || index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{stock.med_name || 'نامشخص'}</div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">{stock.supplier_name || 'نامشخص'}</div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {getTypeBadge(stock.type)}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{stock.exp_date_fa || stock.exp_date}</div>
                                                {stock.days_left !== undefined && stock.days_left > 0 && (
                                                    <div className={`text-xs mt-0.5 font-medium ${
                                                        stock.days_left <= 7 ? 'text-red-600' : 
                                                        stock.days_left <= 15 ? 'text-orange-600' : 
                                                        stock.days_left <= 30 ? 'text-yellow-600' : 'text-green-600'
                                                    }`}>
                                                        {stock.days_left === 0 ? 'امروز' : `${stock.days_left} روز مانده`}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-base font-bold ${
                                                        stock.quantity <= 5 ? 'text-red-600' : 
                                                        stock.quantity <= 10 ? 'text-orange-600' : 
                                                        stock.quantity <= 20 ? 'text-yellow-600' : 'text-gray-900'
                                                    }`}>
                                                        {stock.quantity}
                                                    </span>
                                                    <span className="text-xs text-gray-400">عدد</span>
                                                </div>
                                                {stock.quantity <= 10 && stock.quantity > 0 && (
                                                    <div className="text-xs text-red-500 mt-0.5">نیاز به سفارش</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    {stock.status_color === 'green' && <FaCheckCircle className="text-green-600 text-sm" />}
                                                    {(stock.status_color === 'yellow' || stock.status_color === 'orange') && <FaClock className="text-orange-600 text-sm" />}
                                                    {stock.status_color === 'red' && <FaExclamationTriangle className="text-red-600 text-sm" />}
                                                    {getStatusBadge(stock.status, stock.status_color)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(stock)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="ویرایش"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(stock.stock_id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="حذف"
                                                    >
                                                        <FaTrash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-12 text-center">
                                            <FaBox className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                                            <h3 className="text-base font-medium text-gray-900 mb-1">هیچ داده‌ای یافت نشد</h3>
                                            <p className="text-sm text-gray-500">
                                                {searchTerm || filterSupplier || filterType ? 
                                                    'هیچ آیتمی با شرایط جستجوی شما وجود ندارد.' : 
                                                    'هنوز هیچ آیتمی در موجودی ثبت نشده است.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {displayData.length > 0 && (
                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                            <div className="flex flex-wrap justify-between items-center text-sm text-gray-600 gap-3">
                                <div>مجموع موجودی: <span className="font-bold text-gray-900">{displayData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toLocaleString()}</span> عدد</div>
                                <div>تعداد اقلام: <span className="font-bold text-gray-900">{displayData.length}</span></div>
                                <div>تعداد تأمین‌کنندگان: <span className="font-bold text-gray-900">{uniqueSuppliers.length}</span></div>
                                {lowStockWarnings.length > 0 && (
                                    <div className="text-red-500 flex items-center gap-1">
                                        <FaExclamationTriangle />
                                        {lowStockWarnings.length} دارو با موجودی کم
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayoutjur>
    );
};

export default Stock;