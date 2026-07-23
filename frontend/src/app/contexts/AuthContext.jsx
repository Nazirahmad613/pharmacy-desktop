import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// ================= API =================
const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    Accept: "application/json",
  },
});

// ================= REQUEST INTERCEPTOR =================
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

// ================= RESPONSE INTERCEPTOR =================
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "#/session/signin";
    }

    return Promise.reject(error);
  }
);

// ================= CONTEXT =================
const AuthContext = createContext(null);

// ================= GET AVATAR URL =================
 

const getAvatarUrl = (userData) => {
  if (!userData) return null;

  if (userData.avatar_url) {
    return `${userData.avatar_url}?t=${Date.now()}`;
  }

  if (userData.avatar) {
    const cleanPath = userData.avatar.replace(/^\/+/, "");

    if (
      cleanPath.startsWith("http://") ||
      cleanPath.startsWith("https://")
    ) {
      return `${cleanPath}?t=${Date.now()}`;
    }

    return `${API_BASE_URL}/storage/${cleanPath}?t=${Date.now()}`;
  }

  return null;
};

// ================= PROCESS USER =================
const processUserData = (userData) => {
  if (!userData) return null;

  // اگر قبلاً process شده بود
  if (
    userData.hasPermission &&
    typeof userData.hasPermission === "function"
  ) {
    return userData;
  }

  // ================= ROLES =================
  const userRoles =
    userData.roles?.map((role) => role.name) || [];

  // ================= PERMISSIONS =================
  let allPermissions = [];

  // از roles
  if (userData.roles && Array.isArray(userData.roles)) {
    userData.roles.forEach((role) => {
      if (
        role.permissions &&
        Array.isArray(role.permissions)
      ) {
        role.permissions.forEach((perm) => {
          const permName =
            typeof perm === "object" ? perm.name : perm;

          if (!allPermissions.includes(permName)) {
            allPermissions.push(permName);
          }
        });
      }
    });
  }

  // permissions مستقیم
  if (
    userData.permissions &&
    Array.isArray(userData.permissions)
  ) {
    userData.permissions.forEach((perm) => {
      const permName =
        typeof perm === "object" ? perm.name : perm;

      if (!allPermissions.includes(permName)) {
        allPermissions.push(permName);
      }
    });
  }

  // ================= ROLE CHECK =================
  const hasRole = (roleName) => {
    if (Array.isArray(roleName)) {
      return roleName.some((role) =>
        userRoles.includes(role)
      );
    }

    return userRoles.includes(roleName);
  };

  // ================= PERMISSION CHECK =================
  const hasPermission = (permissionName) => {
    if (!permissionName) return true;

    if (Array.isArray(permissionName)) {
      return permissionName.some((perm) =>
        allPermissions.includes(perm)
      );
    }

    return allPermissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionList) => {
    if (!permissionList || permissionList.length === 0)
      return true;

    return permissionList.some((perm) =>
      allPermissions.includes(perm)
    );
  };

  const hasAllPermissions = (permissionList) => {
    if (!permissionList || permissionList.length === 0)
      return true;

    return permissionList.every((perm) =>
      allPermissions.includes(perm)
    );
  };

  // ================= FINAL USER =================
  const result = {
    ...userData,

    // همیشه avatar_url معتبر
    avatar_url: getAvatarUrl(userData),

    roles: userData.roles || [],

    role_names: userRoles,

    permissions: userData.permissions || [],

    all_permissions: allPermissions,

    // helpers
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // shortcuts
    isAdmin:
      hasRole("admin") || hasRole("Admin"),

    isSuperAdmin: hasRole("super_admin"),

    isHospitalHead: hasRole("hospital_head"),

    isUser: hasRole("user"),
  };

  // DEBUG
  console.log("Processed user => ", result);

  return result;
};

// ================= PROVIDER =================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // ================= CHECK AUTH =================
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    // اول user ذخیره‌شده را نمایش بده
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        setUser(processUserData(parsedUser));
      } catch (error) {
        console.error("Stored user parse error:", error);
      }
    }

    // سپس user تازه را از API بگیر
    api
      .get("/me")
      .then((res) => {
        const rawUser = res.data.user ?? res.data;
console.log("ME RESPONSE => ", res.data);
        const processedUser =
          processUserData(rawUser);

        setUser(processedUser);

        // ذخیره user جدید
        localStorage.setItem(
          "user",
          JSON.stringify(rawUser)
        );

        console.log("Fresh user loaded => ", processedUser);
      })
      .catch((err) => {
        console.error("Auth check failed:", err);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ================= LOGIN =================
  const login = async (email, password) => {
    const res = await api.post("/login", {
      email,
      password,
    });

    localStorage.setItem("token", res.data.token);

    const processedUser = processUserData(
      res.data.user
    );

    setUser(processedUser);

    // ذخیره user
    localStorage.setItem(
      "user",
      JSON.stringify(res.data.user)
    );

    console.log("User logged in => ", processedUser);

    return {
      ...res.data,
      user: processedUser,
    };
  };

  // ================= LOGOUT =================
  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");

      localStorage.removeItem("user");

      setUser(null);

      window.location.href = "#/session/signin";
    }
  };

  // ================= UPDATE USER =================
  const updateUser = (updatedData) => {
    const updatedUser = {
      ...user,
      ...updatedData,
    };

    const processedUser =
      processUserData(updatedUser);

    setUser(processedUser);

    // ذخیره localStorage
    localStorage.setItem(
      "user",
      JSON.stringify(updatedUser)
    );

    return processedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        api,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ================= HOOK =================
export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth باید داخل AuthProvider باشد"
    );
  }

  return ctx;
};

export default AuthContext;