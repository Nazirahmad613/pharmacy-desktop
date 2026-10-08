import React, { useState, useEffect } from 'react';
import './MatxLoading.css';

const MatxLoading = ({ 
  isComplete = false, 
  isSmall = false,
  inline = false,
  text = 'LOADING...'
}) => {
  const [shouldExit, setShouldExit] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setShouldExit(true);
      const timer = setTimeout(() => setShouldRemove(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  if (shouldRemove) return null;

  return (
    <div className={`
      matx-loading-small 
      ${shouldExit ? 'exit-small' : ''} 
      ${isSmall ? 'small-mode' : ''}
      ${inline ? 'inline-mode' : ''}
    `}>
      <div className="matx-loading-small-container">
        <div className={`sports-car-small ${shouldExit ? 'drive-away-small' : ''}`}>
          
          <svg viewBox="0 0 240 100" className="car-svg-small">
            <defs>
              {/* گرادیان بدنه سفید لندکروزر آمبولانس */}
              <linearGradient id="ambulanceBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="65%" stopColor="#f8fafc" />
                <stop offset="88%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>

              {/* گرادیان نوار نارنجی-سرخ کابل آمبولانس */}
              <linearGradient id="redStripe" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff5722" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>

              {/* گرادیان شیشه‌های دودی آمبولانس */}
              <linearGradient id="darkWindow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="45%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* گرادیان تایرهای آفرود */}
              <radialGradient id="wheelGradient" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="55%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#090d16" />
              </radialGradient>

              {/* گرادیان رینگ فولادی نقره‌ای */}
              <radialGradient id="rimGradient" cx="40%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="55%" stopColor="#cbd5e1" />
                <stop offset="85%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </radialGradient>

              {/* درخشش چراغ جلو */}
              <radialGradient id="headlightGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="40%" stopColor="#fef08a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              {/* درخشش چراغ خطر سقفی */}
              <radialGradient id="sirenRed" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="30%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
              </radialGradient>

              {/* سایه شاسی زیرین */}
              <linearGradient id="chassisShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="sirenGlow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* سایه روی زمین */}
            <ellipse cx="122" cy="92" rx="102" ry="4.5" fill="rgba(0,0,0,0.38)" />

            {/* === دود اگزوز عقب === */}
            <g className="smoke-group-small">
              <circle cx="18" cy="75" r="4" fill="rgba(148,163,184,0.65)" className="smoke-puff-small puff1-small" />
              <circle cx="10" cy="70" r="5" fill="rgba(148,163,184,0.5)" className="smoke-puff-small puff2-small" />
              <circle cx="2" cy="64" r="6" fill="rgba(100,116,139,0.4)" className="smoke-puff-small puff3-small" />
              <circle cx="-6" cy="58" r="7" fill="rgba(100,116,139,0.25)" className="smoke-puff-small puff4-small" />
            </g>

            {/* === تایر زاپاس عقب (نصب شده روی دروازه پشت) === */}
            <g>
              {/* براکت نگهدارنده زاپاس */}
              <rect x="21" y="47" width="7" height="18" fill="#1e293b" />
              {/* تایر زاپاس */}
              <rect x="13" y="38" width="11" height="31" rx="3.5" fill="url(#wheelGradient)" stroke="#0f172a" strokeWidth="1" />
              {/* آج‌های تایر زاپاس */}
              <line x1="13" y1="43" x2="16" y2="43" stroke="#090d16" strokeWidth="1.2" />
              <line x1="13" y1="48" x2="16" y2="48" stroke="#090d16" strokeWidth="1.2" />
              <line x1="13" y1="53" x2="16" y2="53" stroke="#090d16" strokeWidth="1.2" />
              <line x1="13" y1="58" x2="16" y2="58" stroke="#090d16" strokeWidth="1.2" />
              <line x1="13" y1="63" x2="16" y2="63" stroke="#090d16" strokeWidth="1.2" />
              {/* رینگ زاپاس */}
              <ellipse cx="18" cy="53.5" rx="2" ry="8" fill="#94a3b8" />
            </g>

            {/* === شاسی، دیفرانسیل و رکاب زیر موتر === */}
            <path
              d="M28 70 L215 70 L212 76 L158 76 L142 78 L92 78 L40 75 Z"
              fill="url(#chassisShadow)"
            />
            {/* رکاب پله زیر دروازه */}
            <rect x="98" y="73" width="60" height="2.8" rx="1" fill="#334155" stroke="#0f172a" strokeWidth="0.5" />
            {/* گل‌پخش‌کن (Mudflap) عقب و جلو */}
            <polygon points="36,71 41,71 39,82 34,82" fill="#0f172a" />
            <polygon points="168,71 173,71 171,81 166,81" fill="#0f172a" />

            {/* === بدنه اصلی تویوتا لندکروزر شاسی‌بلند (رو به راست) === */}
            <path
              d="M24 71 
                 L31 20 
                 Q32 16 37 16 
                 L145 16 
                 Q151 16 154 20 
                 L173 45 
                 L219 49 
                 Q223 50 223 54 
                 L223 71 
                 L208 71 
                 L201 60 
                 L175 60 
                 L168 71 
                 L84 71 
                 L77 59 
                 L49 59 
                 L42 71 
                 Z"
              fill="url(#ambulanceBody)"
              stroke="#64748b"
              strokeWidth="0.9"
            />

            {/* سقف برجسته سفید لندکروزر */}
            <path
              d="M32 19 Q34 14.5 40 14.5 L143 14.5 Q148 14.5 152 19 Z"
              fill="#ffffff"
              stroke="#94a3b8"
              strokeWidth="0.6"
            />
            {/* خط ناودانی سقف */}
            <line x1="31" y1="19.5" x2="154" y2="19.5" stroke="#94a3b8" strokeWidth="1" />

            {/* === چراغ گردان تکی سرخ روی سقف (مشابه عکس کابل آمبولانس) === */}
            {/* پایه فلزی چراغ */}
            <rect x="122" y="13" width="11" height="2.2" rx="0.6" fill="#334155" stroke="#0f172a" strokeWidth="0.4" />
            {/* هاله نورانی چشمک‌زن */}
            <ellipse cx="127.5" cy="9.5" rx="9" ry="7" fill="url(#sirenRed)" filter="url(#sirenGlow)" className="siren-red" />
            {/* حباب استوانه‌ای سرخ چراغ خطر */}
            <path d="M123.5 13 L124.5 6.5 Q127.5 5.5 130.5 6.5 L131.5 13 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.5" />
            <path d="M125 12 L125.6 7.5 L127.2 7.5 L127 12 Z" fill="#fca5a5" opacity="0.85" />

            {/* === پنجره‌های عقب و جلو (شیشه‌های دودی) === */}
            {/* پنجره دوتکه عقب */}
            <rect x="36" y="22" width="38" height="19" rx="2.5" fill="url(#darkWindow)" stroke="#0f172a" strokeWidth="1.2" />
            <line x1="55" y1="22" x2="55" y2="41" stroke="#0f172a" strokeWidth="1.4" />
            {/* بازتاب نور روی شیشه عقب */}
            <polygon points="39,24 46,24 41,39 37,39" fill="rgba(255,255,255,0.12)" />

            {/* پنجره دوتکه وسط */}
            <rect x="79" y="22" width="38" height="19" rx="2.5" fill="url(#darkWindow)" stroke="#0f172a" strokeWidth="1.2" />
            <line x1="98" y1="22" x2="98" y2="41" stroke="#0f172a" strokeWidth="1.4" />
            {/* بازتاب نور روی شیشه وسط */}
            <polygon points="82,24 89,24 84,39 80,39" fill="rgba(255,255,255,0.12)" />

            {/* پنجره کابین راننده (جلو) */}
            <path
              d="M123 22 L149 22 L166 43 L123 43 Z"
              fill="url(#darkWindow)"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* بازتاب شیشه کابین */}
            <path d="M127 24 L138 24 L132 41 L125 41 Z" fill="rgba(255,255,255,0.16)" />

            {/* شیشه جلو (Windshield) */}
            <path
              d="M153 20 L172 44 L168 44 L150 21 Z"
              fill="#bae6fd"
              opacity="0.7"
            />

            {/* آیینه بغل سیاه */}
            <rect x="161" y="37" width="4.5" height="7.5" rx="1" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
            <line x1="161" y1="43" x2="158" y2="44.5" stroke="#0f172a" strokeWidth="1.2" />

            {/* خطوط دروازه کابین و دستگیره‌ها */}
            <line x1="120" y1="20" x2="120" y2="69" stroke="#94a3b8" strokeWidth="0.8" />
            <line x1="168" y1="44" x2="165" y2="69" stroke="#94a3b8" strokeWidth="0.8" />
            {/* دستگیره دروازه جلو */}
            <rect x="123" y="48.5" width="6" height="2" rx="0.6" fill="#1e293b" />
            {/* هواکش سیاه عقب */}
            <rect x="40" y="50" width="9" height="3.2" rx="0.6" fill="#1e293b" />

            {/* === نوار سرخ/نارنجی مشخصه آمبولانس کابل و نوشته‌های روی بدنه === */}
            {/* نوار عقب */}
            <rect x="25.5" y="45" width="9" height="3.8" fill="url(#redStripe)" />
            {/* نوار ممتد جلو تا کاپوت */}
            <path
              d="M119 45 L173 45 L221 49.5 L221 52.5 L173 48.8 L119 48.8 Z"
              fill="url(#redStripe)"
            />

            {/* نوشته: خدمات رایگان ۲۴ ساعته کابل آمبولانس */}
            <text
              x="77"
              y="48.2"
              fontSize="5.4"
              fontWeight="900"
              fill="#dc2626"
              textAnchor="middle"
              fontFamily="Tahoma, Arial, sans-serif"
            >
              خدمات رایگان ۲۴ ساعته کابل آمبولانس
            </text>

            {/* شماره تماس بزرگ: ۱۰۲ */}
            <text
              x="104"
              y="60"
              fontSize="10.5"
              fontWeight="900"
              fill="#dc2626"
              textAnchor="middle"
              fontFamily="Arial Black, Tahoma, sans-serif"
            >
              ۱۰۲
            </text>

            {/* === لوگوی دایره‌ای روی دروازه جلو (وزارت صحت عامه / کابل آمبولانس) === */}
            <g transform="translate(143, 57)">
              <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#dc2626" strokeWidth="0.9" />
              <circle cx="0" cy="0" r="6.4" fill="none" stroke="#1e293b" strokeWidth="0.35" strokeDasharray="1.5,0.8" />
              {/* نماد عصای طبی / هلال در مرکز لوگو */}
              <line x1="0" y1="-4.2" x2="0" y2="4.2" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M-2.2 -1.8 Q0 -3.8 2.2 -1.8 Q0 0.2 -2.2 1.8 Q0 3.8 2.2 1.8" fill="none" stroke="#dc2626" strokeWidth="0.8" />
            </g>

            {/* گلگیرهای برجسته بالای چرخ‌ها */}
            <path
              d="M40 71 L47 57 L79 57 L86 71"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <path
              d="M166 71 L173 58 L203 58 L210 71"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* === سپرهای آفرود سیاه (عقب و جلو) === */}
            {/* سپر عقب */}
            <rect x="17" y="67" width="14" height="5.5" rx="1" fill="#1e293b" stroke="#0f172a" strokeWidth="0.6" />
            {/* سپر جلو فلزی سیاه */}
            <path
              d="M217 65 L228 65 Q230 65 230 67.5 L230 72.5 Q230 74 228 74 L217 74 Z"
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth="0.7"
            />

            {/* === چراغ‌های جلو و عقب === */}
            {/* چراغ عقب عمودی (سرخ و نارنجی) */}
            <rect x="25" y="56" width="3.8" height="9.5" rx="0.8" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.5" />
            <rect x="25" y="61.5" width="3.8" height="4" fill="#f59e0b" />

            {/* چراغ جلو و راهنما (نارنجی و سفید درخشان) */}
            <ellipse cx="225" cy="56" rx="9" ry="6.5" fill="url(#headlightGlow)" filter="url(#glowFilter)" />
            <polygon points="218,52 223,53 223,60 218,60" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.4" />
            <polygon points="216,52 219.5,52.5 219.5,57 216,56.5" fill="#f97316" />

            {/* === چرخ عقب (تایر آفرود بزرگ با رینگ فولادی سوراخ‌دار) === */}
            <g>
              <circle cx="63" cy="76" r="16.5" fill="url(#wheelGradient)" stroke="#090d16" strokeWidth="1.2" />
              <circle cx="63" cy="76" r="13.5" fill="none" stroke="#334155" strokeWidth="0.6" strokeDasharray="3,2" />
              <circle cx="63" cy="76" r="9.5" fill="url(#rimGradient)" stroke="#475569" strokeWidth="0.8" />
              {/* سوراخ‌های رینگ فولادی لندکروزر */}
              <circle cx="63" cy="69.2" r="1.1" fill="#1e293b" />
              <circle cx="63" cy="82.8" r="1.1" fill="#1e293b" />
              <circle cx="56.2" cy="76" r="1.1" fill="#1e293b" />
              <circle cx="69.8" cy="76" r="1.1" fill="#1e293b" />
              <circle cx="58.2" cy="71.2" r="1.1" fill="#1e293b" />
              <circle cx="67.8" cy="80.8" r="1.1" fill="#1e293b" />
              <circle cx="67.8" cy="71.2" r="1.1" fill="#1e293b" />
              <circle cx="58.2" cy="80.8" r="1.1" fill="#1e293b" />
              {/* توپی وسط چرخ */}
              <circle cx="63" cy="76" r="3.5" fill="#334155" stroke="#0f172a" strokeWidth="0.6" />
              <circle cx="63" cy="76" r="1.5" fill="#94a3b8" />
            </g>

            {/* === چرخ جلو (تایر آفرود بزرگ با رینگ فولادی سوراخ‌دار) === */}
            <g>
              <circle cx="188" cy="76" r="16.5" fill="url(#wheelGradient)" stroke="#090d16" strokeWidth="1.2" />
              <circle cx="188" cy="76" r="13.5" fill="none" stroke="#334155" strokeWidth="0.6" strokeDasharray="3,2" />
              <circle cx="188" cy="76" r="9.5" fill="url(#rimGradient)" stroke="#475569" strokeWidth="0.8" />
              {/* سوراخ‌های رینگ فولادی لندکروزر */}
              <circle cx="188" cy="69.2" r="1.1" fill="#1e293b" />
              <circle cx="188" cy="82.8" r="1.1" fill="#1e293b" />
              <circle cx="181.2" cy="76" r="1.1" fill="#1e293b" />
              <circle cx="194.8" cy="76" r="1.1" fill="#1e293b" />
              <circle cx="183.2" cy="71.2" r="1.1" fill="#1e293b" />
              <circle cx="192.8" cy="80.8" r="1.1" fill="#1e293b" />
              <circle cx="192.8" cy="71.2" r="1.1" fill="#1e293b" />
              <circle cx="183.2" cy="80.8" r="1.1" fill="#1e293b" />
              {/* توپی وسط چرخ */}
              <circle cx="188" cy="76" r="3.5" fill="#334155" stroke="#0f172a" strokeWidth="0.6" />
              <circle cx="188" cy="76" r="1.5" fill="#94a3b8" />
            </g>
          </svg>
          
          <div className="motion-lines-small">
            <span className="line-small line1-small"></span>
            <span className="line-small line2-small"></span>
            <span className="line-small line3-small"></span>
          </div>
        </div>
        
        <div className="loading-text-small">
          {text.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatxLoading;