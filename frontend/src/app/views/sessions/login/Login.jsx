import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Formik } from "formik";
import * as Yup from "yup";
import { useAuth } from "app/contexts/AuthContext";
import { FaUser, FaLock } from "react-icons/fa";
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
      enqueueSnackbar("ورود موفقانه انجام شد", { variant: "success" });
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
      <div className="glass-card">
        <div className="logo-container">
          <FirstLogo />
        </div>

        <h2>ورود به سیستم</h2>

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
                  placeholder="ایمیل"
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
                {loading ? "در حال ورود..." : "ورود"}
              </button>
            </form>
          )}
        </Formik>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600&display=swap');

        .login-page {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: url('https://images.pexels.com/photos/3735716/pexels-photo-3735716.jpeg?auto=compress&cs=tinysrgb&w=1600&q=100') no-repeat center center/cover;
          font-family: 'Vazirmatn', sans-serif;
          position: relative;
        }

        /* لایه آبی بسیار ملایم */
        .login-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 50, 100, 0.2);
        }

        .glass-card {
          width: 390px;
          padding: 45px;
          border-radius: 28px;
          background: rgba(20, 40, 70, 0.25);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 150, 255, 0.5);
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.4);
          color: white;
          position: relative;
          z-index: 1;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        
        .logo-container svg,
        .logo-container img {
          transform: scale(1.08);
        }

        .glass-card h2 {
          text-align: center;
          margin-bottom: 32px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 1px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .input-group input {
          width: 100%;
          padding: 14px 50px 14px 45px;
          border-radius: 14px;
          border: none;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
          transition: 0.3s;
          font-family: inherit;
          font-size: 15px;
        }

        .input-group input:focus {
          box-shadow: 0 0 0 3px rgba(0, 150, 255, 0.5);
          background: white;
        }

        .input-icon {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #0066cc;
          font-size: 18px;
        }

        .show-btn {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          cursor: pointer;
          color: #0066cc;
          font-weight: bold;
          background: rgba(200, 230, 255, 0.9);
          padding: 3px 8px;
          border-radius: 30px;
          transition: 0.2s;
        }

        .show-btn:hover {
          background: #b3d9ff;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #0099ff, #0066cc);
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s;
          margin-top: 16px;
          font-size: 16px;
          letter-spacing: 1px;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0, 100, 200, 0.4);
          background: linear-gradient(135deg, #0088ee, #0055bb);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error {
          font-size: 12px;
          color: #ffcccc;
          margin-bottom: 10px;
          margin-top: -8px;
          padding-right: 10px;
        }

        .login-error {
          font-size: 14px;
          color: #ffc9b3;
          font-weight: bold;
          margin-bottom: 14px;
          text-align: center;
          background: rgba(180, 60, 50, 0.25);
          padding: 8px;
          border-radius: 14px;
        }

        @media(max-width: 480px){
          .glass-card {
            width: 90%;
            padding: 32px 24px;
          }
          
          .logo-container svg,
          .logo-container img {
            transform: scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}