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
              {/* گرادیان بدنه سفید سه‌بعدی */}
              <linearGradient id="ambulanceBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#f1f5f9" />
                <stop offset="80%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              {/* گرادیان نوار آبی بالای بدنه */}
              <linearGradient id="blueStripe" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>

              {/* گرادیان نوار قرمز پایین */}
              <linearGradient id="redStripe" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>

              {/* گرادیان کابین و شیشه */}
              <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
              </linearGradient>

              {/* گرادیان چرخ */}
              <radialGradient id="wheelGradient" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* گرادیان رینگ */}
              <radialGradient id="rimGradient" cx="40%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </radialGradient>

              {/* درخشش چراغ جلو */}
              <radialGradient id="headlightGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="40%" stopColor="#fef3c7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>

              {/* درخشش چراغ عقب قرمز */}
              <radialGradient id="taillightGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="40%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
              </radialGradient>

              {/* درخشش چراغ هشدار آبی */}
              <radialGradient id="sirenBlue" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="35%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
              </radialGradient>

              {/* درخشش چراغ هشدار قرمز */}
              <radialGradient id="sirenRed" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="35%" stopColor="#f87171" stopOpacity="1" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
              </radialGradient>

              {/* سایه بدنه */}
              <linearGradient id="bodyShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </linearGradient>

              <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="sirenGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* سایه زیر آمبولانس */}
            <ellipse cx="120" cy="92" rx="105" ry="5" fill="rgba(0,0,0,0.35)" />

            {/* === بدنه اصلی - لایه سایه === */}
            <path
              d="M14 62 L38 62 L44 40 L84 34 L172 34 L200 62 L228 62 L228 76 L14 76 Z"
              fill="url(#bodyShadow)"
            />

            {/* === بدنه اصلی - لایه سفید === */}
            <path
              d="M16 60 L38 60 L44 38 L84 32 L172 32 L198 60 L226 60 L226 72 L16 72 Z"
              fill="url(#ambulanceBody)"
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* === کابین (بخش جلو) === */}
            <path
              d="M160 34 L178 18 L212 18 L226 60 L160 60 Z"
              fill="url(#ambulanceBody)"
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* === شیشه جلو === */}
            <path
              d="M164 36 L180 21 L208 21 L218 58 L164 58 Z"
              fill="url(#glassGradient)"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="0.6"
            />
            {/* بازتاب شیشه جلو */}
            <path
              d="M168 38 L182 24 L194 24 L190 38 Z"
              fill="rgba(255,255,255,0.45)"
            />

            {/* === شیشه کناری کابین === */}
            <path
              d="M150 40 L158 38 L158 52 L150 52 Z"
              fill="url(#glassGradient)"
              opacity="0.85"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="0.5"
            />

            {/* === نوار آبی بالای بدنه === */}
            <rect x="18" y="42" width="140" height="5" fill="url(#blueStripe)" opacity="0.9" />

            {/* === نوار قرمز پایین بدنه === */}
            <rect x="18" y="58" width="206" height="4" fill="url(#redStripe)" opacity="0.95" />

            {/* === صلیب سرخ روی بدنه === */}
            <g transform="translate(85, 47)">
              <rect x="-2" y="-9" width="4" height="18" fill="#dc2626" />
              <rect x="-9" y="-2" width="18" height="4" fill="#dc2626" />
            </g>

            {/* === نوشته AMBULANCE (نمادین) === */}
            <text x="115" y="55" fontSize="6" fontWeight="bold" fill="#1d4ed8" fontFamily="Arial">
              AMBULANCE
            </text>

            {/* === خط درخشش روی سقف === */}
            <path
              d="M20 40 L42 40 L48 36 L84 32 L172 32 L198 58"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* === چراغ هشدار سقف (آبی و قرمز) === */}
            <rect x="100" y="24" width="34" height="8" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="0.6" />
            {/* چراغ آبی */}
            <ellipse cx="110" cy="28" rx="6" ry="3.5" fill="url(#sirenBlue)" filter="url(#sirenGlow)" className="siren-blue" />
            <ellipse cx="110" cy="28" rx="3" ry="2" fill="#60a5fa" />
            {/* چراغ قرمز */}
            <ellipse cx="124" cy="28" rx="6" ry="3.5" fill="url(#sirenRed)" filter="url(#sirenGlow)" className="siren-red" />
            <ellipse cx="124" cy="28" rx="3" ry="2" fill="#f87171" />

            {/* === چراغ جلو === */}
            <ellipse cx="228" cy="56" rx="9" ry="7" fill="url(#headlightGlow)" filter="url(#glowFilter)" />
            <ellipse cx="228" cy="56" rx="5" ry="4" fill="#ffffff" />
            <ellipse cx="228" cy="56" rx="2.5" ry="2" fill="#fef3c7" />

            {/* === چراغ عقب قرمز === */}
            <ellipse cx="14" cy="56" rx="7" ry="6" fill="url(#taillightGlow)" filter="url(#glowFilter)" />
            <ellipse cx="14" cy="56" rx="4" ry="3.5" fill="#ef4444" />
            <ellipse cx="14" cy="56" rx="2" ry="1.8" fill="#ffffff" opacity="0.8" />

            {/* === چرخ جلو === */}
            <ellipse cx="60" cy="76" rx="17" ry="16" fill="url(#wheelGradient)" />
            <ellipse cx="60" cy="76" rx="17" ry="16" fill="none" stroke="#0f172a" strokeWidth="1.2" />
            <ellipse cx="60" cy="76" rx="10" ry="9.5" fill="url(#rimGradient)" />
            <ellipse cx="60" cy="76" rx="10" ry="9.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="60" cy="76" r="3" fill="#475569" />
            <circle cx="60" cy="76" r="1.5" fill="#e2e8f0" />
            <line x1="60" y1="67" x2="60" y2="61" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="60" y1="85" x2="60" y2="91" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="51" y1="76" x2="45" y2="76" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="69" y1="76" x2="75" y2="76" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <ellipse cx="56" cy="72" rx="3" ry="2" fill="rgba(255,255,255,0.5)" />

            {/* === چرخ عقب === */}
            <ellipse cx="178" cy="76" rx="17" ry="16" fill="url(#wheelGradient)" />
            <ellipse cx="178" cy="76" rx="17" ry="16" fill="none" stroke="#0f172a" strokeWidth="1.2" />
            <ellipse cx="178" cy="76" rx="10" ry="9.5" fill="url(#rimGradient)" />
            <ellipse cx="178" cy="76" rx="10" ry="9.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="178" cy="76" r="3" fill="#475569" />
            <circle cx="178" cy="76" r="1.5" fill="#e2e8f0" />
            <line x1="178" y1="67" x2="178" y2="61" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="178" y1="85" x2="178" y2="91" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="169" y1="76" x2="163" y2="76" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="187" y1="76" x2="193" y2="76" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
            <ellipse cx="174" cy="72" rx="3" ry="2" fill="rgba(255,255,255,0.5)" />

            {/* === دود آبی روشن === */}
            <g className="smoke-group-small">
              <circle cx="14" cy="62" r="4" fill="rgba(96,165,250,0.65)" className="smoke-puff-small puff1-small" />
              <circle cx="6" cy="56" r="5" fill="rgba(96,165,250,0.55)" className="smoke-puff-small puff2-small" />
              <circle cx="0" cy="50" r="6" fill="rgba(59,130,246,0.45)" className="smoke-puff-small puff3-small" />
              <circle cx="-8" cy="44" r="7" fill="rgba(59,130,246,0.3)" className="smoke-puff-small puff4-small" />
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