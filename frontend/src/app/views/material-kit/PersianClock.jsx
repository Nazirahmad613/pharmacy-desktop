import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';

// ---------------------------------------------------------
// 1. کامپوننت هواپیمای سه‌بعدی (3D Airplane)
// ---------------------------------------------------------
const RealisticAirplane = () => {
  // در اینجا از یک مدل 3D آماده با فرمت gltf استفاده شده است.
  // شما می‌توانید فایل .glb یا .gltf هواپیمای فوق‌واقعی خود را دانلود کرده و آدرس آن را اینجا قرار دهید.
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/airplane/model.gltf');
  const planeRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // حرکت دایره‌ای هواپیما دور ساعت
    const radius = 6;
    const speed = 0.8;
    
    planeRef.current.position.x = Math.sin(t * speed) * radius;
    planeRef.current.position.z = Math.cos(t * speed) * radius;
    
    // تنظیم جهت دماغه هواپیما به سمت مسیر حرکت
    planeRef.current.rotation.y = (t * speed) + Math.PI / 2;
    
    // تکان‌های طبیعی بال‌ها (Banking) هنگام پرواز
    planeRef.current.rotation.z = Math.sin(t * 2) * 0.1;
    planeRef.current.position.y = Math.sin(t * 1.5) * 0.5 + 1; // بالا و پایین رفتن نرم
  });

  return (
    <primitive 
      ref={planeRef} 
      object={scene} 
      scale={0.8} 
      castShadow 
    />
  );
};

// ---------------------------------------------------------
// 2. کامپوننت اصلی ساعت و رابط کاربری (UI)
// ---------------------------------------------------------
const PersianClock = () => {
  const [time, setTime] = useState(new Date());

  // به‌روزرسانی زمان هر یک ثانیه
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // استفاده از Intl بومی مرورگر برای تبدیل دقیق و سریع به فارسی
  const timeString = new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(time);

  const dateString = new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(time);

  return (
    <div style={styles.container}>
      {/* بخش سه‌بعدی پس‌زمینه */}
      <div style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 4, 12], fov: 50 }}>
          {/* نورپردازی محیطی برای واقعی‌تر شدن مدل */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" /> {/* ایجاد بازتاب نور واقعی روی بدنه طیاره */}
          
          <Suspense fallback={null}>
            <RealisticAirplane />
          </Suspense>

          {/* سایه داینامیک زیر هواپیما */}
          <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={20} blur={2} far={10} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* بخش شیشه‌ای (Glassmorphism) ساعت روی پس‌زمینه */}
      <div style={styles.glassCard}>
        <div style={styles.timeLabel}>زمان به وقت محلی</div>
        <div style={styles.time}>{timeString}</div>
        <div style={styles.date}>{dateString}</div>
        <div style={styles.glowLine}></div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// 3. استایل‌های مدرن CSS in JS
// ---------------------------------------------------------
const styles = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0f172a', // پس‌زمینه تاریک و شیک
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif",
  },
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1, // Canvas زیر کارت قرار می‌گیرد
  },
  glassCard: {
    position: 'relative',
    zIndex: 10, // کارت روی محیط سه‌بعدی قرار می‌گیرد
    background: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
    padding: '3rem 4rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'transform 0.4s ease',
  },
  timeLabel: {
    color: '#94a3b8',
    fontSize: '1.2rem',
    letterSpacing: '2px',
    marginBottom: '10px',
  },
  time: {
    fontSize: '5.5rem',
    fontWeight: '800',
    color: '#ffffff',
    textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
    direction: 'ltr',
    letterSpacing: '4px',
    lineHeight: '1.2',
  },
  date: {
    fontSize: '1.8rem',
    color: '#cbd5e1',
    marginTop: '10px',
    fontWeight: '300',
  },
  glowLine: {
    width: '50%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
    marginTop: '2rem',
    borderRadius: '50%',
    boxShadow: '0 0 15px #38bdf8',
  }
};

export default PersianClock;