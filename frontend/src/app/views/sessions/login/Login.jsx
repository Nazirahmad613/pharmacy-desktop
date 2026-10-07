import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Formik } from "formik";
import * as Yup from "yup";
import { useAuth } from "app/contexts/AuthContext";
import { FaUser, FaLock, FaHeartbeat } from "react-icons/fa";
import FirstLogo from "app/components/firstLogo";

const initialValues = {
  email: "",
  password: "",
  remember: true
};

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email("ایمیل نادرست است")
    .required("ایمیل ضروری است"),
  password: Yup.string()
    .min(6, "رمز عبور حداقل ۶ حرف باشد")
    .required("رمز عبور ضروری است")
});

export default function Login() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleFormSubmit = async (values) => {
    try {
      setLoading(true);
      setLoginError("");
      await login(values.email, values.password);
      enqueueSnackbar("ورود موفقانه به سیستم شفاخانه انجام شد", { variant: "success" });
      navigate("/dashboard/default");
    } catch (error) {
      const message = error?.response?.data?.message || "ایمیل یا رمز عبور اشتباه است";
      setLoginError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      {/* پس‌زمینه مانیتور علائم حیاتی و خط ضربان قلب (ECG) */}
      <div className="hospital-ecg-background">
        {/* خطوط شبکه مانیتور شفاخانه */}
        <div className="medical-grid"></div>

        {/* امواج ضربان قلب متحرک در افق صفحه */}
        <div className="ecg-line-wrapper">
          <svg className="ecg-svg" viewBox="0 0 1200 150" preserveAspectRatio="none">
            <path
              className="ecg-path ecg-glow"
              d="M0,75 L200,75 L220,75 L230,40 L240,110 L255,20 L270,125 L285,60 L295,85 L310,75 L500,75 L520,75 L530,40 L540,110 L555,20 L570,125 L585,60 L595,85 L610,75 L800,75 L820,75 L830,40 L840,110 L855,20 L870,125 L885,60 L895,85 L910,75 L1100,75 L1200,75"
            />
            <path
              className="ecg-path"
              d="M0,75 L200,75 L220,75 L230,40 L240,110 L255,20 L270,125 L285,60 L295,85 L310,75 L500,75 L520,75 L530,40 L540,110 L555,20 L570,125 L585,60 L595,85 L610,75 L800,75 L820,75 L830,40 L840,110 L855,20 L870,125 L885,60 L895,85 L910,75 L1100,75 L1200,75"
            />
          </svg>
        </div>

        {/* قلب تپنده نئونی شناور در بالای صفحه */}
        <div className="floating-heart-hub">
          <div className="pulse-circle"></div>
          <div className="pulse-circle delay"></div>
          <FaHeartbeat className="beating-heart-icon" />
          <span className="heart-rate-text">72 BPM • NORMAL</span>
        </div>
      </div>

      {/* فرم لاگین */}
      <div className="container">
        <div className="login-box">
          <div className="logo-container">
            <FirstLogo />
          </div>

          <div className="title-area">
            <h2>ورود به سیستم شفاخانه</h2>
            <p className="subtitle">سیستم جامع مدیریت اطلاعات صحی و مراقبت مریضان</p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleFormSubmit}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit
            }) => (
              <form onSubmit={handleSubmit} noValidate>
                <div className="input-group">
                  <FaUser className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="ایمیل پرسونل / کارمند"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {touched.email && errors.email && (
                  <div className="error">{errors.email}</div>
                )}

                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="رمز عبور"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {values.password && (
                    <span
                      className="show-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "پنهان" : "نمایش"}
                    </span>
                  )}
                </div>
                {touched.password && errors.password && (
                  <div className="error">{errors.password}</div>
                )}

                {loginError && <div className="login-error">{loginError}</div>}

                <button
                  type="submit"
                  className="login-btn"
                  disabled={loading}
                >
                  {loading ? "در حال تصدیق هویت..." : "ورود"}
                </button>
              </form> 
            )}
          </Formik>
        </div>
      </div>

      {/* استایل کامل و انیمیشن‌های شفاخانه در همین فایل */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-page {
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at 50% 25%, #081726 0%, #050e18 60%, #02070d 100%);
          overflow: hidden;
          font-family: 'Vazirmatn', sans-serif;
          position: relative;
        }

        /* پس‌زمینه گرافیکی شفاخانه */
        .hospital-ecg-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        /* خطوط شطرنجی مانیتور علائم حیاتی */
        .medical-grid {
          position: absolute;
          width: 100%;
          height: 100%;
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(152, 255, 76, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(152, 255, 76, 0.04) 1px, transparent 1px);
        }

        /* قلب تپنده در پس‌زمینه با افکت رادار موجی */
        .floating-heart-hub {
          position: absolute;
          top: 8%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .beating-heart-icon {
          font-size: 50px;
          color: #c20606;
          filter: drop-shadow(0 0 16px rgba(167, 15, 15, 0.9));
          animation: heartBeat 1.3s ease-in-out infinite;
        }

        .heart-rate-text {
          color: #fcfbfb;
          font-size: 11px;
          letter-spacing: 2px;
          margin-top: 8px;
          font-weight: 600;
          opacity: 0.85;
          text-shadow: 0 0 8px rgba(233, 240, 239, 0.7);
        }

        .pulse-circle {
          position: absolute;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 1.5px solid #98ff4c;
          animation: wavePulse 2.6s linear infinite;
          opacity: 0;
        }

        .pulse-circle.delay {
          animation-delay: 1.3s;
        }

        @keyframes heartBeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.22); }
          28% { transform: scale(1); }
          42% { transform: scale(1.15); }
          70% { transform: scale(1); }
        }

        @keyframes wavePulse {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }

        /* نوار ضربان قلب متحرک (ECG Wave) */
        .ecg-line-wrapper {
          position: absolute;
          bottom: 12%;
          left: 0;
          width: 200%;
          height: 140px;
          display: flex;
          animation: scrollECG 4.5s linear infinite;
        }

        .ecg-svg {
          width: 100%;
          height: 100%;
        }

        .ecg-path {
          fill: none;
          stroke: #98ff4c;
          stroke-width: 2.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .ecg-glow {
          stroke-width: 7;
          stroke: rgba(152, 255, 76, 0.35);
          filter: blur(5px);
        }

        @keyframes scrollECG {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* کانتینر و باکس فرم ورود */
        .container {
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 10;
          padding: 20px;
        }

        .login-box {
          width: 420px;
          background: rgba(8, 18, 30, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(152, 255, 76, 0.85);
          padding: 36px 30px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          box-shadow: 0 0 25px rgba(152, 255, 76, 0.28), 0 20px 50px rgba(0, 0, 0, 0.85);
          direction: rtl;
          transition: 0.3s;
        }

        .login-box:hover {
          box-shadow: 0 0 35px rgba(152, 255, 76, 0.42), 0 25px 60px rgba(0, 0, 0, 0.9);
        }

        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 5px;
        }

        .logo-container svg,
        .logo-container img {
          filter: brightness(0) invert(1);
          transform: scale(1.05);
        }

        .title-area {
          text-align: center;
          margin-bottom: 8px;
        }

        .title-area h2 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .title-area .subtitle {
          color: #f7f8f9;
          font-size: 12px;
          margin-top: 4px;
        }

        /* ورودی‌ها و آیکون‌ها */
        .input-group {
          position: relative;
          margin-bottom: 6px;
        }

        .input-group input {
          width: 100%;
          padding: 13px 44px 13px 40px;
          border: 1px solid rgba(152, 255, 76, 0.25);
          outline: none;
          border-radius: 10px;
          background: rgba(14, 28, 46, 0.85);
          color: white;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .input-group input:focus {
          border-color: #98ff4c;
          box-shadow: 0 0 14px rgba(152, 255, 76, 0.35);
          background: rgba(14, 28, 46, 1);
        }

        .input-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #98ff4c;
          font-size: 16px;
        }

        .show-btn {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          cursor: pointer;
          color: #98ff4c;
          font-weight: bold;
          background: rgba(152, 255, 76, 0.15);
          padding: 4px 9px;
          border-radius: 20px;
          transition: 0.25s;
          user-select: none;
        }

        .show-btn:hover {
          background: rgba(152, 255, 76, 0.35);
        }

        .login-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          background: #3216a4;
          color: #eaeef3;
          font-size: 15px;
          transition: all 0.3s ease;
          margin-top: 10px;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(152, 255, 76, 0.35);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(152, 255, 76, 0.55);
        }

        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .error {
          font-size: 12px;
          color: #ff7676;
          margin-bottom: 8px;
          margin-top: -2px;
          padding-right: 6px;
        }

        .login-error {
          font-size: 13px;
          color: #ffd0c2;
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
          background: rgba(220, 53, 69, 0.25);
          border: 1px solid rgba(220, 53, 69, 0.4);
          padding: 9px;
          border-radius: 10px;
        }

        @media (max-width: 600px) {
          .login-box {
            width: 92%;
            padding: 28px 20px;
          }
          .title-area h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}