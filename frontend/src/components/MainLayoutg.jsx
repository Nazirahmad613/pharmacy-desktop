import { useEffect, useState } from "react";
import "./MainLayoutg.css";

const backgrounds = [
  "/backgrounds/bg1.jpg",
  "/backgrounds/bg2.jpg",
  "/backgrounds/bg3.jpg",
];

export default function MainLayoutg({ children, title }) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // fade out

      setTimeout(() => {
        setIndex((p) => (p + 1) % backgrounds.length);
        setFade(true); // fade in
      }, 1000); // زمان fade
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="main-layout">
      <div
        className={`bg-image ${fade ? "fade-in" : "fade-out"}`}
        style={{ backgroundImage: `url(${backgrounds[index]})` }}
      />

      <div className="background-overlay">
        {title && <h1 className="layout-title">{title}</h1>}
        <div className="layout-content">{children}</div>
      </div>
    </div>
  );
}