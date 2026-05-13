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

const BenefitsChart = () => {
  const { api } = useAuth();
  const [chartType, setChartType] = useState('line');
  const [reportType, setReportType] = useState('monthly');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [reportType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/benefits/chart', {
        params: { type: reportType }
      });
      
      console.log('API Response:', response.data); // برای دیباگ
      
      // بررسی اینکه response.data آرایه است یا خیر
      let responseData = response.data;
      
      // اگر response.data یک شیء است و دارای خاصیت data است
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        if (responseData.data && Array.isArray(responseData.data)) {
          responseData = responseData.data;
        } else if (responseData.benefits && Array.isArray(responseData.benefits)) {
          responseData = responseData.benefits;
        } else {
          responseData = [];
        }
      }
      
      // اطمینان از اینکه responseData آرایه است
      if (!Array.isArray(responseData)) {
        console.warn('Response data is not an array:', responseData);
        responseData = [];
      }
      
      prepareChartData(responseData);
      
    } catch (error) {
      console.error('Error fetching benefits chart data:', error);
      setError('خطا در دریافت داده‌های چارت');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (data) => {
    if (!data || data.length === 0) {
      setChartData(null);
      return;
    }

    let labels = [];
    let values = [];

    if (reportType === 'monthly') {
      const months = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 
                      'میزان', 'عقرب', 'عقرب', 'قوس', 'جدی', 'حوت'];
      
      labels = data.map(item => {
        const monthIndex = parseInt(item.month) - 1;
        return months[monthIndex] + ' ' + item.year;
      });
      values = data.map(item => item.net_benefit || item.net_benefit === 0 ? item.net_benefit : 0);
    } 
    else if (reportType === 'daily') {
      labels = data.map(item => item.date || item.journal_date);
      values = data.map(item => item.net_benefit || 0);
    }
    else if (reportType === 'yearly') {
      labels = data.map(item => item.year);
      values = data.map(item => item.net_benefit || 0);
    }

    setChartData({
      labels: labels,
      datasets: [
        {
          label: 'سود خالص (افغانی)',
          data: values,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          tension: 0.3,
          fill: true,
        },
      ],
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        rtl: true,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'چارت سود و زیان',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.raw || 0;
            label += new Intl.NumberFormat('fa-IR').format(value) + ' ا';
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'مبلغ (افغانی)',
        },
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('fa-IR').format(value);
          }
        }
      },
      x: {
        title: {
          display: true,
          text: reportType === 'daily' ? 'تاریخ' : (reportType === 'monthly' ? 'ماه' : 'سال'),
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        }
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>در حال بارگذاری چارت...</div>
      </div>
    );
  }

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

  if (!chartData) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>هیچ داده‌ای برای نمایش وجود ندارد</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
          style={{ padding: '8px 16px', backgroundColor: '#0d47a1', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
        >
          بروزرسانی
        </button>
      </div>

      <div style={{ height: 400 }}>
        {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
        {chartType === 'bar' && <Bar data={chartData} options={chartOptions} />}
      </div>

      {/* نمایش خلاصه آمار */}
      {chartData && chartData.datasets[0]?.data?.length > 0 && (
        <div style={{ 
          marginTop: 20, 
          padding: 15, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <strong>بیشترین سود:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(Math.max(...chartData.datasets[0].data))} ریال
          </div>
          <div>
            <strong>کمترین سود:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(Math.min(...chartData.datasets[0].data))} ریال
          </div>
          <div>
            <strong>میانگین سود:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(
              chartData.datasets[0].data.reduce((a, b) => a + b, 0) / chartData.datasets[0].data.length
            )} ریال
          </div>
          <div>
            <strong>مجموع سود:</strong>{' '}
            {new Intl.NumberFormat('fa-IR').format(
              chartData.datasets[0].data.reduce((a, b) => a + b, 0)
            )} ریال
          </div>
        </div>
      )}
    </div>
  );
};

export default BenefitsChart;