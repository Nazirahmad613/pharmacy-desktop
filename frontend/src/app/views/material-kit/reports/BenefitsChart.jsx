// components/BenefitsChart.jsx
import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../../../contexts/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/* نام ماه‌های افغانی (ترتیب صحیح) */
const AFGHAN_MONTHS = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت',
];

const BenefitsChart = () => {
  const { api } = useAuth();

  const [chartType, setChartType]   = useState('line');     // line | bar
  const [reportType, setReportType] = useState('daily');    // daily | monthly | yearly
  const [chartData, setChartData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  /* ---------- دریافت داده از همان کنترلر گزارش ---------- */
  useEffect(() => {
    fetchData();
  }, [reportType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/benefits/chart', {
        params: { type: reportType },
      });

      console.log('Chart API Response:', response.data);

      /* پاسخ مستقیماً آرایه است (مثل index) */
      const responseData = Array.isArray(response.data) ? response.data : [];

      prepareChartData(responseData);

    } catch (err) {
      console.error('Error fetching benefits chart data:', err);
      setError('خطا در دریافت داده‌های چارت');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- آماده‌سازی داده‌های نمودار ---------- */
  const prepareChartData = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      setChartData(null);
      return;
    }

    let labels  = [];
    let values  = [];   // مفاد خالص
    let credits = [];   // درآمد
    let debits  = [];   // مصارف

    /* ---------- برچسب محور X ---------- */
    if (reportType === 'monthly') {
      labels = data.map((item) => {
        const idx  = parseInt(item.month, 10) - 1;
        const name = AFGHAN_MONTHS[idx] || `ماه ${item.month}`;
        return `${name} ${item.year}`;
      });
    } else if (reportType === 'daily') {
      labels = data.map((item) => item.journal_date || item.date || '');
    } else if (reportType === 'yearly') {
      labels = data.map((item) => String(item.year));
    }

    /* ---------- مقادیر ---------- */
    values  = data.map((item) => Number(item.net_benefit)  || 0);
    credits = data.map((item) => Number(item.total_credit) || 0);
    debits  = data.map((item) => Number(item.total_debit)  || 0);

    setChartData({
      labels,
      datasets: [
        {
          label: 'مفاد خالص (افغانی)',
          data: values,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.4)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'درآمد (افغانی)',
          data: credits,
          borderColor: 'rgb(75, 192, 75)',
          backgroundColor: 'rgba(75, 192, 75, 0.3)',
          tension: 0.3,
          fill: false,
        },
        {
          label: 'مصارف (افغانی)',
          data: debits,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.3)',
          tension: 0.3,
          fill: false,
        },
      ],
    });
  };

  /* ---------- گزینه‌های نمودار ---------- */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        rtl: true,
        labels: { font: { size: 12 } },
      },
      title: {
        display: true,
        text: 'چارت مفاد و زیان',
        font: { size: 16 },
      },
      tooltip: {
        rtl: true,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${new Intl.NumberFormat('fa-IR').format(value)} افغانی`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'مبلغ (افغانی)' },
        ticks: {
          callback: (value) => new Intl.NumberFormat('fa-IR').format(value),
        },
      },
      x: {
        title: {
          display: true,
          text:
            reportType === 'daily'
              ? 'تاریخ'
              : reportType === 'monthly'
              ? 'ماه'
              : 'سال',
        },
        ticks: { maxRotation: 45, minRotation: 45 },
      },
    },
  };

  /* ---------- حالت بارگذاری ---------- */
  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>در حال بارگذاری چارت...</div>
      </div>
    );
  }

  /* ---------- حالت خطا ---------- */
  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
        <div>{error}</div>
        <button
          onClick={fetchData}
          style={{ marginTop: 10, padding: '5px 10px', cursor: 'pointer' }}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  /* ---------- حالت بدون داده ---------- */
  if (!chartData) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ marginBottom: 10 }}>هیچ داده‌ای برای نمایش وجود ندارد</div>
        <button
          onClick={fetchData}
          style={{ padding: '5px 10px', cursor: 'pointer' }}
        >
          بروزرسانی
        </button>
      </div>
    );
  }

  /* ---------- محاسبات خلاصه (فقط روی مفاد خالص) ---------- */
  const netValues = chartData.datasets[0]?.data || [];
  const maxNet    = netValues.length ? Math.max(...netValues) : 0;
  const minNet    = netValues.length ? Math.min(...netValues) : 0;
  const sumNet    = netValues.reduce((a, b) => a + b, 0);
  const avgNet    = netValues.length ? sumNet / netValues.length : 0;

  /* ---------- رندر ---------- */
  return (
    <div style={{ padding: 20 }}>

      {/* ---------- نوار ابزار ---------- */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <label style={{ marginLeft: 8 }}>نوع گزارش:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc' }}
          >
            <option value="daily">روزانه</option>
            <option value="monthly">ماهانه</option>
            <option value="yearly">سالانه</option>
          </select>
        </div>

        <div>
          <label style={{ marginLeft: 8 }}>نوع چارت:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc' }}
          >
            <option value="line">چارت خطی</option>
            <option value="bar">چارت میله‌ای</option>
          </select>
        </div>

        <button
          onClick={fetchData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0d47a1',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          بروزرسانی
        </button>
      </div>

      {/* ---------- نمودار ---------- */}
      <div style={{ height: 400 }}>
        {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
        {chartType === 'bar'  && <Bar  data={chartData} options={chartOptions} />}
      </div>

      {/* ---------- خلاصه آمار ---------- */}
      {netValues.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <strong>بیشترین مفاد:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(maxNet)} افغانی
          </div>
          <div>
            <strong>کمترین مفاد:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(minNet)} افغانی
          </div>
          <div>
            <strong>میانگین مفاد:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(avgNet.toFixed(0))} افغانی
          </div>
          <div>
            <strong>مجموع مفاد:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(sumNet)} افغانی
          </div>
        </div>
      )}
    </div>
  );
};

export default BenefitsChart;