import { useEffect, useState } from "react";
import "./MainLayoutjur.css";

const backgrounds = [
  "/backgrounds/bg1.jpg",
  "/backgrounds/bg2.jpg",
  "/backgrounds/bg3.jpg",
];

export default function MainLayoutjur({ children, title }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((p) => (p + 1) % backgrounds.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="main-layout"
      style={{ backgroundImage: `url(${backgrounds[index]})` }}
    >
      <div className="background-overlay">
        {title && <h1 className="layout-title">{title}</h1>}
        <div className="layout-content">{children}</div>
      </div>
    </div>
  );
}
