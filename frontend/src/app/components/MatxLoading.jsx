import React, { useState, useEffect } from 'react';
import './MatxLoading.css';

const MatxLoading = ({ isComplete = false, isSmall = false }) => {
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
    <div className={`matx-loading-small ${shouldExit ? 'exit-small' : ''} ${isSmall ? 'small-mode' : ''}`}>
      <div className="matx-loading-small-container">
        <div className={`sports-car-small ${shouldExit ? 'drive-away-small' : ''}`}>
          
          {/* ماشین اسپرت SVG سایز کوچک */}
          <svg viewBox="0 0 200 80" className="car-svg-small">
            {/* بدنه اصلی */}
            <path
              d="M15 55 L35 55 L40 35 L80 30 L120 30 L160 35 L185 55 L200 55 L200 65 L15 65 Z"
              fill="url(#carGradientSmall)"
              stroke="#c41e3a"
              strokeWidth="1.5"
            />
            
            {/* سقف */}
            <path
              d="M45 35 L60 20 L100 20 L115 35 Z"
              fill="#1a1a2e"
              stroke="#2c2c2c"
              strokeWidth="1"
            />
            
            {/* شیشه جلو */}
            <path
              d="M50 35 L65 23 L95 23 L105 35 Z"
              fill="#4facfe"
              opacity="0.8"
            />
            
            {/* شیشه عقب */}
            <path
              d="M110 35 L105 23 L75 23 L65 35 Z"
              fill="#4facfe"
              opacity="0.6"
            />
            
            {/* خطوط اسپرت */}
            <line x1="20" y1="48" x2="180" y2="48" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            
            {/* چراغ جلو LED */}
            <circle cx="195" cy="50" r="6" fill="#ffffff" />
            <circle cx="195" cy="50" r="3" fill="#00f2fe" />
            
            {/* چراغ عقب */}
            <circle cx="10" cy="50" r="5" fill="#ff0000" />
            
            {/* اسپویلر */}
            <path d="M160 30 L180 25 L185 30 Z" fill="#1a1a2e" />
            
            {/* چرخ جلو */}
            <circle cx="55" cy="65" r="14" fill="#2c2c2c" stroke="#555" strokeWidth="2" />
            <circle cx="55" cy="65" r="8" fill="#e0e0e0" />
            <circle cx="55" cy="65" r="3" fill="#999" />
            <line x1="55" y1="57" x2="55" y2="51" stroke="#999" strokeWidth="1.5" />
            <line x1="55" y1="73" x2="55" y2="79" stroke="#999" strokeWidth="1.5" />
            <line x1="47" y1="65" x2="41" y2="65" stroke="#999" strokeWidth="1.5" />
            <line x1="63" y1="65" x2="69" y2="65" stroke="#999" strokeWidth="1.5" />
            
            {/* چرخ عقب */}
            <circle cx="145" cy="65" r="14" fill="#2c2c2c" stroke="#555" strokeWidth="2" />
            <circle cx="145" cy="65" r="8" fill="#e0e0e0" />
            <circle cx="145" cy="65" r="3" fill="#999" />
            <line x1="145" y1="57" x2="145" y2="51" stroke="#999" strokeWidth="1.5" />
            <line x1="145" y1="73" x2="145" y2="79" stroke="#999" strokeWidth="1.5" />
            <line x1="137" y1="65" x2="131" y2="65" stroke="#999" strokeWidth="1.5" />
            <line x1="153" y1="65" x2="159" y2="65" stroke="#999" strokeWidth="1.5" />
            
            {/* دود */}
            <g className="smoke-group-small">
              <circle cx="15" cy="55" r="4" fill="rgba(150,150,150,0.6)" className="smoke-puff-small puff1-small" />
              <circle cx="8" cy="50" r="5" fill="rgba(130,130,130,0.5)" className="smoke-puff-small puff2-small" />
              <circle cx="3" cy="45" r="6" fill="rgba(110,110,110,0.4)" className="smoke-puff-small puff3-small" />
              <circle cx="-5" cy="40" r="7" fill="rgba(90,90,90,0.3)" className="smoke-puff-small puff4-small" />
            </g>
            
            <defs>
              <linearGradient id="carGradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ff3b3b' }} />
                <stop offset="50%" style={{ stopColor: '#ff6b6b' }} />
                <stop offset="100%" style={{ stopColor: '#c41e3a' }} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* خطوط حرکت */}
          <div className="motion-lines-small">
            <span className="line-small line1-small"></span>
            <span className="line-small line2-small"></span>
            <span className="line-small line3-small"></span>
          </div>
        </div>
        
        {/* متن لودینگ کوچک */}
        <div className="loading-text-small">
          <span>L</span>
          <span>O</span>
          <span>A</span>
          <span>D</span>
          <span>I</span>
          <span>N</span>
          <span>G</span>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      </div>
    </div>
  );
};

export default MatxLoading; 