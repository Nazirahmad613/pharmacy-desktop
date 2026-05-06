import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// ================= API =================
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
  },
});

// ================= INTERCEPTOR =================
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

// ================= RESPONSE HANDLER =================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      // 🔥 مهم: برای Electron + HashRouter
      window.location.href = "#/session/signin";
    }
    return Promise.reject(error);
  }
);

// ================= CONTEXT =================
const AuthContext = createContext(null);

// ================= AVATAR =================
const getAvatarUrl = (userData) => {
  if (!userData) return null;

  if (userData.avatar_url) {
    return userData.avatar_url;
  }

  if (userData.avatar) {
    if (
      userData.avatar.startsWith("http://") ||
      userData.avatar.startsWith("https://")
    ) {
      return userData.avatar;
    }

    const cleanPath = userData.avatar.replace(/^\/+/, "");
    return `http://localhost:8000/storage/${cleanPath}`;
  }

  return null;
};

// ================= PROCESS USER =================
const processUserData = (userData) => {
  if (!userData) return null;

  return {
    ...userData,
    avatar_url: getAvatarUrl(userData),
  };
};

// ================= PROVIDER =================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // CHECK AUTH
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/me")
      .then((res) => {
        const rawUser = res.data.user ?? res.data;
        setUser(processUserData(rawUser));
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // LOGIN
  const login = async (email, password) => {
    const res = await api.post("/login", { email, password });

    localStorage.setItem("token", res.data.token);

    const processedUser = processUserData(res.data.user);
    setUser(processedUser);

    return { ...res.data, user: processedUser };
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);

    // 🔥 مهم برای Electron
    window.location.href = "#/session/signin";
  };

  // UPDATE USER
  const updateUser = (updatedData) => {
    const updatedUser = {
      ...user,
      ...updatedData,
      avatar_url: getAvatarUrl({ ...user, ...updatedData }),
    };
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, api, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ================= HOOK =================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth باید داخل AuthProvider باشد");
  return ctx;
};

export default AuthContext;