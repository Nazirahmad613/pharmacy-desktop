import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Formik } from "formik";
import * as Yup from "yup";
import { useAuth } from "app/contexts/AuthContext";
import { FaUser, FaLock, FaFacebookF, FaInstagram } from "react-icons/fa";

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
  const [loginError, setLoginError] = useState(""); // خطای ورود

  const handleFormSubmit = async (values) => {
    try {
      setLoading(true);
      setLoginError(""); // پاک کردن خطای قبلی
      await login(values.email, values.password);
      enqueueSnackbar("ورود موفقانه انجام شد", { variant: "success" });
      navigate("/dashboard/default");
    } catch (error) {
      // گرفتن پیام خطای درست
      const message = error?.response?.data?.message || "ایمیل یا رمز عبور اشتباه است";
      setLoginError(message); // نمایش خطا در فرم
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      <div className="glass-card">
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

              {/* Email */}
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

              {/* Password */}
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

              {/* خطای ورود اشتباه */}
              {loginError && <div className="login-error">{loginError}</div>}

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? "در حال ورود..." : "ورود"}
              </button>

              <div className="or">یا ورود با</div>

              <div className="social">
                <button type="button" className="facebook">
                  <FaFacebookF /> فیسبوک
                </button>
                <button type="button" className="instagram">
                  <FaInstagram /> اینستاگرام
                </button>
              </div>

              <div className="signup">
                حساب ندارید؟
                <NavLink to="/session/signup"> ثبت نام</NavLink>
              </div>
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
          background: url('https://images.unsplash.com/photo-1506744038136-46273834b3fb') no-repeat center center/cover;
          font-family: 'Vazirmatn', sans-serif;
        }

        .glass-card {
          width: 390px;
          padding: 45px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(22px);
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          color: white;
        }

        .glass-card h2 {
          text-align: center;
          margin-bottom: 30px;
          font-weight: 600;
        }

        .input-group {
          position: relative;
          margin-bottom: 18px;
        }

        .input-group input {
          width: 100%;
          padding: 14px 50px 14px 45px;
          border-radius: 10px;
          border: none;
          outline: none;
          background: rgba(255,255,255,0.9);
          transition: 0.3s;
          font-family: inherit;
        }

        .input-group input:focus {
          box-shadow: 0 0 12px #4facfe;
        }

        .input-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #333;
        }

        .show-btn {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          cursor: pointer;
          color: #007bff;
          font-weight: bold;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(to right,#4facfe,#00f2fe);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.3);
        }

        .or {
          text-align: center;
          margin: 20px 0;
        }

        .social {
          display: flex;
          gap: 10px;
        }

        .social button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.3s;
          font-family: inherit;
        }

        .facebook {
          background: #3b5998;
        }

        .instagram {
          background: linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);
        }

        .social button:hover {
          transform: scale(1.05);
        }

        .signup {
          text-align: center;
          margin-top: 22px;
          font-size: 14px;
        }

        .signup a {
          color: #4facfe;
          margin-right: 5px;
          text-decoration: none;
        }

        .error {
          font-size: 12px;
          color: #ffd2d2;
          margin-bottom: 10px;
        }

        @media(max-width: 480px){
          .glass-card {
            width: 90%;
            padding: 30px;
          }
        }

          .login-error {
  font-size: 14px;
  color: #ff4d4f;
  font-weight: bold;
  margin-bottom: 12px;
  text-align: center;
}

        
      `}</style>
    </div>
  );
}