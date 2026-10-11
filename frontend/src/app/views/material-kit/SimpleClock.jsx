// SimpleClock.jsx
import React, { useState, useEffect } from 'react';
import moment from 'moment-jalaali';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes } from '@emotion/react';
import { FaHeartbeat } from 'react-icons/fa';

moment.locale('fa');

/* ============================================================
   ماه‌های دری و روزهای هفته
   ============================================================ */
const dariMonths = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت',
];

const dariWeekDays = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه',
];

const toPersianNumber = (num) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
};

const formatTime12Hour = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'ب.ظ' : 'ق.ظ';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const fh = hours.toString().padStart(2, '0');
  const fm = minutes.toString().padStart(2, '0');
  const fs = seconds.toString().padStart(2, '0');
  return `${toPersianNumber(fh)}:${toPersianNumber(fm)}:${toPersianNumber(fs)} ${ampm}`;
};

const getPersianDate = (date) => {
  const m = moment(date);
  const year = m.jYear();
  const monthIndex = m.jMonth();
  const day = m.jDate();
  const weekDayIndex = date.getDay();
  const persianWeekDayIndex = (weekDayIndex + 1) % 7;
  const weekDayName = dariWeekDays[persianWeekDayIndex];
  const monthName = dariMonths[monthIndex];
  return `${weekDayName} ${toPersianNumber(day)} ${monthName} ${toPersianNumber(year)}`;
};

/* ============================================================
   انیمیشن‌ها (Keyframes)
   ============================================================ */

// ضربان قلب (مثل صفحه لاگین)
const heartBeat = keyframes`
  0%   { transform: scale(1); }
  14%  { transform: scale(1.22); }
  28%  { transform: scale(1); }
  42%  { transform: scale(1.15); }
  70%  { transform: scale(1); }
  100% { transform: scale(1); }
`;

// موج راداری دور قلب
const wavePulse = keyframes`
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
`;

// نوار ECG (خط ضربان قلب)
const scrollECG = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

// درخشش ملایم دور قلب
const heartGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 12px rgba(194, 6, 6, 0.9)); }
  50%      { filter: drop-shadow(0 0 22px rgba(194, 6, 6, 1)); }
`;

/* ============================================================
   کامپوننت قلب تپنده + نوار ECG
   ============================================================ */
const PulsingHeart = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 75,
        height: 75,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 50%, #081726 0%, #050e18 70%, #02070d 100%)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5), 0 0 20px rgba(152, 255, 76, 0.15)',
      }}
    >
      {/* ---------- خطوط شبکه مانیتور علائم حیاتی ---------- */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundSize: '10px 10px',
          backgroundImage: `
            linear-gradient(to right, rgba(152, 255, 76, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(152, 255, 76, 0.08) 1px, transparent 1px)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* ---------- نوار ECG متحرک در پایین ---------- */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '18%',
          left: 0,
          width: '200%',
          height: '30px',
          animation: `${scrollECG} 3s linear infinite`,
          pointerEvents: 'none',
        }}
      >
        <svg
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* درخشش زیر خط ECG */}
          <path
            d="M0,30 L60,30 L70,30 L75,12 L80,48 L87,3 L95,55 L103,20 L110,38 L118,30 L180,30 L190,30 L195,12 L200,48 L207,3 L215,55 L223,20 L230,38 L238,30 L300,30 L310,30 L315,12 L320,48 L327,3 L335,55 L343,20 L350,38 L358,30 L400,30"
            fill="none"
            stroke="rgba(152, 255, 76, 0.35)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'blur(3px)' }}
          />
          {/* خط اصلی ECG */}
          <path
            d="M0,30 L60,30 L70,30 L75,12 L80,48 L87,3 L95,55 L103,20 L110,38 L118,30 L180,30 L190,30 L195,12 L200,48 L207,3 L215,55 L223,20 L230,38 L238,30 L300,30 L310,30 L315,12 L320,48 L327,3 L335,55 L343,20 L350,38 L358,30 L400,30"
            fill="none"
            stroke="#98ff4c"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Box>

      {/* ---------- موج‌های راداری دور قلب ---------- */}
      <Box
        sx={{
          position: 'absolute',
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '1.5px solid #98ff4c',
          animation: `${wavePulse} 2.6s linear infinite`,
          opacity: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '1.5px solid #98ff4c',
          animation: `${wavePulse} 2.6s linear infinite`,
          animationDelay: '1.3s',
          opacity: 0,
        }}
      />

      {/* ---------- قلب تپنده ---------- */}
      <FaHeartbeat
        style={{
          fontSize: '38px',
          color: '#c20606',
          position: 'relative',
          zIndex: 2,
          animation: `${heartBeat} 1.3s ease-in-out infinite, ${heartGlow} 1.3s ease-in-out infinite`,
        }}
      />
    </Box>
  );
};

/* ============================================================
   کامپوننت اصلی ساعت
   ============================================================ */
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
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: '50px',
        padding: '10px 28px 10px 12px',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 12px 35px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.8)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        '&:hover': {
          boxShadow: '0 18px 45px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.9)',
          transform: 'translateY(-3px)',
        },
      }}
    >
      {/* بخش قلب تپنده */}
      <PulsingHeart />

      {/* بخش زمان و تاریخ */}
      <Box sx={{ textAlign: 'left', direction: 'ltr', ml: 1 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: '900',
            background: 'linear-gradient(135deg, #ea580c, #f59e0b)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '1.5px',
            lineHeight: 1.2,
            filter: 'drop-shadow(0px 2px 2px rgba(234, 88, 12, 0.2))',
          }}
        >
          {formatTime12Hour(currentTime)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            direction: 'rtl',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #312e81, #1e1b4b)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            marginTop: '4px',
            fontSize: '0.95rem',
          }}
        >
          {getPersianDate(currentTime)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default SimpleClock;