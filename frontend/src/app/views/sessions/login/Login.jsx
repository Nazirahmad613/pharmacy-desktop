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
      <div className="container">
        {/* باکس لاگین */}
        <div className="login-box">
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
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-page {
          width: 100%;
          height: 100vh;
          background: #07111f;
          overflow: hidden;
          font-family: 'Vazirmatn', sans-serif;
          position: relative;
        }

        .container {
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        /* باکس لاگین - همیشه فعال و با افکت نور */
        .login-box {
          width: 390px;
          background: #09111e;
          border: 2px solid #98ff4c;
          padding: 35px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
          box-shadow: 0 0 15px #98ff4c, 0 0 30px #98ff4c;
          direction: rtl;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .logo-container svg,
        .logo-container img {
          filter: brightness(0) invert(1);
          transform: scale(1.08);
        }

        .login-box h2 {
          color: white;
          text-align: center;
          margin-bottom: 10px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        /* استایل فرم و اینپوت‌ها */
        .input-group {
          position: relative;
          margin-bottom: 5px;
        }

        .input-group input {
          width: 100%;
          padding: 12px 45px 12px 40px;
          border: none;
          outline: none;
          border-radius: 8px;
          background: #152133;
          color: white;
          font-family: inherit;
          font-size: 14px;
          transition: 0.3s;
        }

        .input-group input:focus {
          box-shadow: 0 0 0 2px #98ff4c;
        }

        .input-icon {
          position: absolute;
          right: 12px;
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
          background: rgba(152, 255, 76, 0.2);
          padding: 3px 8px;
          border-radius: 30px;
          transition: 0.2s;
        }

        .show-btn:hover {
          background: rgba(152, 255, 76, 0.4);
        }

        .login-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          background: #98ff4c;
          color: #07111f;
          font-size: 16px;
          transition: 0.3s;
          margin-top: 10px;
          font-family: inherit;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(152, 255, 76, 0.4);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error {
          font-size: 11px;
          color: #ff8888;
          margin-bottom: 8px;
          margin-top: -3px;
          padding-right: 10px;
        }

        .login-error {
          font-size: 13px;
          color: #ffc9b3;
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
          background: rgba(180, 60, 50, 0.3);
          padding: 8px;
          border-radius: 10px;
        }

        /* واکنشگرایی */
        @media (max-width: 900px) {
          .login-box {
            width: 90%;
            padding: 25px;
          }
        }

        @media (max-width: 480px) {
          .login-box {
            width: 95%;
            padding: 20px;
          }
          
          .logo-container svg,
          .logo-container img {
            transform: scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}