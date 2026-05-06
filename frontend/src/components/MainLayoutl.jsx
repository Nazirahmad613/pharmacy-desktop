  import React from "react";
import "./MainLayoutl.css";
import { useState,useEffect } from "react";
 const backgrounds = [
   "/backgrounds/bg1.jpg",
   "/backgrounds/bg2.jpg",
   "/backgrounds/bg3.jpg",
 ];
 
 export default function MainLayoutl({ children, title }) {
   const [index, setIndex] = useState(0);
 
   useEffect(() => {
     const interval = setInterval(() => {
       setIndex((prev) => (prev + 1) % backgrounds.length);
     }, 10000); // هر 5 ثانیه
 
     return () => clearInterval(interval);
   }, []);
 
   return (
     <div
       className="main-layout"
       style={{ backgroundImage: `url(${backgrounds[index]})` }}
     >
       {/* Overlay */}
       <div className="background-overlay">
         {title && <h1 className="layout-title">{title}</h1>}
 
         <div className="layout-content">{children}</div>
       </div>
     </div>
   );
 }
 