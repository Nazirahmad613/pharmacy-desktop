import { useState, useEffect } from "react";
import "./AnimatedBackground.css";

const images = [
  "https://picsum.photos/id/1015/1920/1080",
  "https://picsum.photos/id/1018/1920/1080",
  "https://picsum.photos/id/104/1920/1080",
];

export default function AnimatedBackground({ children }) {
  const [imageUrl, setImageUrl] = useState(images[0]);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let index = 0;
    
    const interval = setInterval(() => {
      // مرحله 1: محو شدن
      setOpacity(0);
      
      // مرحله 2: بعد از 1 ثانیه، تصویر را عوض کن
      setTimeout(() => {
        index = (index + 1) % images.length;
        setImageUrl(images[index]);
        
        // مرحله 3: بعد از 0.1 ثانیه، تصویر جدید را نشان بده
        setTimeout(() => {
          setOpacity(1);
        }, 100);
      }, 1000);
      
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-wrapper">
      <div
        className="bg-slide"
        style={{
          backgroundImage: `url(${imageUrl})`,
          opacity: opacity,
          transition: "opacity 1s ease-in-out",
        }}
      />
      <div className="bg-content">{children}</div>
    </div>
  );
}