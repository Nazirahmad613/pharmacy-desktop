// SimpleClock.jsx
import React, { useState, useEffect } from 'react';
import moment from 'moment-jalaali';
import { Box, Typography, Paper } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { keyframes } from '@emotion/react';

moment.locale('fa');

// ماه‌های دری (افغانستان)
const dariMonths = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
];

// روزهای هفته (دری) – همان ترتیب معمول افغانستان
const dariWeekDays = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'
];

// تبدیل اعداد به رقم فارسی/دری
const toPersianNumber = (num) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
};

// فرمت ۱۲ ساعته با ق.ظ / ب.ظ
const formatTime12Hour = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'ب.ظ' : 'ق.ظ';
  hours = hours % 12;
  hours = hours ? hours : 12; // ساعت ۱۲ برای ۱۲:۰۰
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  return `${toPersianNumber(formattedHours)}:${toPersianNumber(formattedMinutes)}:${toPersianNumber(formattedSeconds)} ${ampm}`;
};

// دریافت تاریخ شمسی با ماه‌های دری
const getPersianDate = (date) => {
  const m = moment(date);
  const year = m.jYear();
  const monthIndex = m.jMonth();
  const day = m.jDate();
  const weekDayIndex = date.getDay();
  let persianWeekDayIndex = (weekDayIndex + 1) % 7;
  const weekDayName = dariWeekDays[persianWeekDayIndex];
  const monthName = dariMonths[monthIndex];
  return `${weekDayName} ${toPersianNumber(day)} ${monthName} ${toPersianNumber(year)}`;
};

// انیمیشن بال زدن پرنده
const flyAnimation = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const SimpleClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: '60px',
        padding: '8px 20px 8px 16px',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 12px 28px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* آیکون پرنده با انیمیشن */}
      <Box
        sx={{
          animation: `${flyAnimation} 2s infinite ease-in-out`,
          display: 'flex',
          alignItems: 'center',
          color: '#050505',
        }}
      >
        <FlightTakeoffIcon sx={{ fontSize: 32 }} />
      </Box>

      {/* بخش زمان و تاریخ */}
      <Box sx={{ textAlign: 'left', direction: 'ltr' }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #da8524, #d6a810)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: 'none',
            letterSpacing: '1px',
          }}
        >
          {formatTime12Hour(currentTime)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#555',
            direction: 'rtl',
            fontWeight: 500,
            background: 'linear-gradient(135deg, #6a11ff, #070708)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {getPersianDate(currentTime)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default SimpleClock;