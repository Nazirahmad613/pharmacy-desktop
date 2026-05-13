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
 // ================= PROCESS USER =================
const processUserData = (userData) => {
  if (!userData) return null;

  // ✅ اگر userData قبلاً پردازش شده بود
  if (userData.hasPermission && typeof userData.hasPermission === 'function') {
    return userData;
  }

  // ✅ استخراج نقش‌های کاربر
  const userRoles = userData.roles?.map(role => role.name) || [];
  
  // ✅ استخراج تمام پرمیشن‌های کاربر
  let allPermissions = [];
  
  // از roles
  if (userData.roles && Array.isArray(userData.roles)) {
    userData.roles.forEach(role => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(perm => {
          const permName = typeof perm === 'object' ? perm.name : perm;
          if (!allPermissions.includes(permName)) {
            allPermissions.push(permName);
          }
        });
      }
    });
  }
  
  // از permissions مستقیم
  if (userData.permissions && Array.isArray(userData.permissions)) {
    userData.permissions.forEach(perm => {
      const permName = typeof perm === 'object' ? perm.name : perm;
      if (!allPermissions.includes(permName)) {
        allPermissions.push(permName);
      }
    });
  }

  // ✅ متدهای کمکی برای بررسی دسترسی
  const hasRole = (roleName) => {
    // پشتیبانی از roleName به صورت string یا array
    if (Array.isArray(roleName)) {
      return roleName.some(role => userRoles.includes(role));
    }
    return userRoles.includes(roleName);
  };

  const hasPermission = (permissionName) => {
    if (!permissionName) return true;
    // پشتیبانی از permissionName به صورت string یا array
    if (Array.isArray(permissionName)) {
      return permissionName.some(perm => allPermissions.includes(perm));
    }
    return allPermissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionList) => {
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.some(perm => allPermissions.includes(perm));
  };

  const hasAllPermissions = (permissionList) => {
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.every(perm => allPermissions.includes(perm));
  };

  const result = {
    ...userData,
    avatar_url: getAvatarUrl(userData),
    roles: userData.roles || [],
    role_names: userRoles,
    permissions: userData.permissions || [],
    all_permissions: allPermissions,
    // متدهای کمکی
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // برای راحتی کار
    isAdmin: hasRole('admin') || hasRole('Admin'),
    isSuperAdmin: hasRole('super_admin'),
    isHospitalHead: hasRole('hospital_head'),
    isUser: hasRole('user'),
  };
  
  // ✅ برای دیباگ
  console.log("Processed user:", {
    name: result.name,
    roles: result.role_names,
    permissions: result.all_permissions,
    isAdmin: result.isAdmin
  });
  
  return result;
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
        const processedUser = processUserData(rawUser);
        setUser(processedUser);
        
        // ✅ برای دیباگ
        console.log("User loaded:", {
          name: processedUser.name,
          roles: processedUser.role_names,
          permissions: processedUser.all_permissions,
          isAdmin: processedUser.isAdmin
        });
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
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
    
    // ✅ برای دیباگ
    console.log("User logged in:", {
      name: processedUser.name,
      roles: processedUser.role_names,
      permissions: processedUser.all_permissions,
      isAdmin: processedUser.isAdmin
    });

    return { ...res.data, user: processedUser };
  };

  // LOGOUT
  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      window.location.href = "#/session/signin";
    }
  };

  // UPDATE USER
  const updateUser = (updatedData) => {
    const updatedUser = {
      ...user,
      ...updatedData,
      avatar_url: getAvatarUrl({ ...user, ...updatedData }),
    };
    // ✅ دوباره پردازش کن
    const processedUser = processUserData(updatedUser);
    setUser(processedUser);
    return processedUser;
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