import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false, // چون از Bearer Token استفاده می‌کنی
  timeout: 10000, // جلوگیری از هنگ کردن
});

// ========================
// Request Interceptor
// ========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ========================
// Response Interceptor
// ========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // اگر سرور بالا نبود (Laravel هنوز بالا نشده)
    if (!error.response) {
      console.error("Server not reachable:", error.message);
      alert("سرور هنوز آماده نشده، لطفاً چند لحظه صبر کنید...");
      return Promise.reject(error);
    }

    // اگر توکن منقضی شد یا غیرمجاز بود
    if (error.response.status === 401) {
      localStorage.removeItem("token");

      // جلوگیری از loop
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;