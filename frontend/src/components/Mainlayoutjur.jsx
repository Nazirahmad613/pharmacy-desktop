import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import "./MainLayoutjur.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ اصلاح مسیر عکس‌ها
const backgrounds = [
  import.meta.env.BASE_URL + "backgrounds/bg1.jpg",
  import.meta.env.BASE_URL + "backgrounds/bg2.jpg",
  import.meta.env.BASE_URL + "backgrounds/bg3.jpg",
];

export default function MainLayoutjur({ children, title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);
  const isRTL = document.dir === "rtl";

  useEffect(() => {
    // پیش‌بارگذاری تصاویر
    backgrounds.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, 10000);

    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <>
      <div
        className="main-layout"
        style={{
          backgroundImage: `url(${backgrounds[currentIndex]})`,
        }}
      >
        <div className="background-overlay">
          {title && <h1 className="layout-title">{title}</h1>}
          <div className="layout-content">{children}</div>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <ToastContainer
            position={isRTL ? "top-left" : "top-right"}
            autoClose={3000}
            rtl={true}
            theme="colored"
            limit={5}
            style={{
              zIndex: 9999999999,
              position: "fixed",
              top: "20px",
              right: isRTL ? "auto" : "20px",
              left: isRTL ? "20px" : "auto",
            }}
          />,
          document.body
        )}
    </>
  );
}