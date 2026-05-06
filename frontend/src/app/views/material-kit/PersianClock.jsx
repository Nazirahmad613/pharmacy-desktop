// PersianClock.jsx
import React, { useState, useEffect } from 'react';
import moment from 'moment-jalaali';

// پیکربندی moment برای استفاده از لوکِیل فارسی
moment.locale('fa');

// آرایه نام ماه‌های شمسی
const persianMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// آرایه نام روزهای هفته (اولین روز هفته در تقویم ایران شنبه است)
const persianWeekDays = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'
];

// تابع تبدیل اعداد انگلیسی به فارسی
const toPersianNumber = (num) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
};

// تابع فرمت زمان (ساعت:دقیقه:ثانیه)
const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${toPersianNumber(hours)}:${toPersianNumber(minutes)}:${toPersianNumber(seconds)}`;
};

// تابع دریافت تاریخ شمسی با فرمت فارسی
const getPersianDate = (date) => {
  const m = moment(date);
  const year = m.jYear();
  const monthIndex = m.jMonth(); // 0-based
  const day = m.jDate();
  // روز هفته (بر اساس شیء Date اصلی)
  const weekDayIndex = date.getDay(); // 0 = یکشنبه، اما در ایران شنبه اول است
  // تبدیل به ایندکس مناسب: 0->شنبه؟ در getDay یکشنبه 1 است، شنبه 0
  // یکشنبه: 1، دوشنبه: 2، ... جمعه: 6، شنبه: 0
  // برای تطبیق با آرایه persianWeekDays که شنبه ایندکس 0 دارد:
  let persianWeekDayIndex = (weekDayIndex + 1) % 7; // 0:شنبه, 1:یکشنبه, ... 6:جمعه
  const weekDayName = persianWeekDays[persianWeekDayIndex];
  const monthName = persianMonths[monthIndex];
  return `${weekDayName} ${toPersianNumber(day)} ${monthName} ${toPersianNumber(year)}`;
};

const PersianClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeString = formatTime(currentTime);
  const dateString = getPersianDate(currentTime);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.clockContainer}>
          <div style={styles.time}>{timeString}</div>
          <div style={styles.date}>{dateString}</div>
        </div>
        <div style={styles.footer}>
          <span>ساعت و تاریخ ایران</span>
        </div>
      </div>
    </div>
  );
};

// استایل‌های داخلی (می‌توانید به CSS خارجی منتقل کنید)
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
    fontFamily: "'Vazirmatn', 'Tahoma', 'Segoe UI', system-ui, sans-serif",
    padding: '20px',
  },
  card: {
    backdropFilter: 'blur(12px)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '2rem 3rem',
    textAlign: 'center',
    transition: 'transform 0.3s ease',
  },
  clockContainer: {
    marginBottom: '1rem',
  },
  time: {
    fontSize: '4rem',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    letterSpacing: '2px',
    marginBottom: '0.5rem',
    direction: 'ltr', // ساعت بهتر است چپ‌چین باشد
  },
  date: {
    fontSize: '1.6rem',
    color: '#f0f0f0',
    textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)',
    direction: 'rtl', // تاریخ فارسی راست‌چین
  },
  footer: {
    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
    paddingTop: '1rem',
    marginTop: '0.5rem',
    fontSize: '0.9rem',
    color: '#ddd',
    direction: 'rtl',
  },
};

export default PersianClock;