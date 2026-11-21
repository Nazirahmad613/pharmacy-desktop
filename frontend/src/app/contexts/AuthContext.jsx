
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import axios from "axios";

// =====================================================
// API CONFIGURATION
// =====================================================

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    Accept: "application/json",
  },
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

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

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

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

// =====================================================
// AUTH CONTEXT
// =====================================================

const AuthContext = createContext(null);

// =====================================================
// HELPER: AVATAR URL
// =====================================================

const getAvatarUrl = (userData) => {
  if (!userData) return null;

  if (userData.avatar_url) {
    if (
      userData.avatar_url.startsWith("http://") ||
      userData.avatar_url.startsWith("https://")
    ) {
      return `${userData.avatar_url}?t=${Date.now()}`;
    }

    return `${API_BASE_URL}${userData.avatar_url}?t=${Date.now()}`;
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

// =====================================================
// HELPER: NORMALIZE MODULES
// =====================================================

const normalizeModules = (modules) => {
  if (!Array.isArray(modules)) return [];

  return [
    ...new Set(
      modules
        .map((module) => {
          if (typeof module === "string") {
            return module;
          }

          if (module && typeof module === "object") {
            return module.key || module.module_key || module.name;
          }

          return null;
        })
        .filter(Boolean)
    ),
  ];
};

// =====================================================
// HELPER: PROCESS SYSTEM SETTINGS
// =====================================================

const processSystemSettings = (data = {}) => {
  const settings =
    data.system_settings ||
    data.systemSettings ||
    data.hospital_setup ||
    data.hospitalSetup ||
    data.settings ||
    {};

  const enabledModules = normalizeModules(
    data.enabled_modules ??
    data.enabledModules ??
    settings.enabled_modules ??
    settings.enabledModules
  );

  const setupCompleted =
    data.setup_completed ??
    data.setupCompleted ??
    settings.setup_completed ??
    settings.setupCompleted ??
    false;

  return {
    ...settings,

    hospital_name:
      settings.hospital_name ??
      settings.hospitalName ??
      data.hospital_name ??
      data.hospitalName ??
      "",

    logo:
      settings.logo ??
      data.logo ??
      null,

    enabled_modules: enabledModules,

    setup_completed: Boolean(setupCompleted),
  };
};

// =====================================================
// PROCESS USER DATA
// =====================================================

const processUserData = (userData) => {
  if (!userData) return null;

  // ===================================================
  // ROLES
  // ===================================================

  const roles = Array.isArray(userData.roles)
    ? userData.roles
    : [];

  const userRoles = roles
    .map((role) => {
      if (typeof role === "string") return role;

      return role?.name;
    })
    .filter(Boolean);

  // ===================================================
  // PERMISSIONS
  // ===================================================

  const allPermissions = [];

  // Permissions from roles
  roles.forEach((role) => {
    if (!Array.isArray(role?.permissions)) return;

    role.permissions.forEach((permission) => {
      const permissionName =
        typeof permission === "object"
          ? permission?.name
          : permission;

      if (
        permissionName &&
        !allPermissions.includes(permissionName)
      ) {
        allPermissions.push(permissionName);
      }
    });
  });

  // Direct permissions
  if (Array.isArray(userData.permissions)) {
    userData.permissions.forEach((permission) => {
      const permissionName =
        typeof permission === "object"
          ? permission?.name
          : permission;

      if (
        permissionName &&
        !allPermissions.includes(permissionName)
      ) {
        allPermissions.push(permissionName);
      }
    });
  }

  // ===================================================
  // ROLE CHECK
  // ===================================================

  const hasRole = (roleName) => {
    if (Array.isArray(roleName)) {
      return roleName.some((role) =>
        userRoles.includes(role)
      );
    }

    return userRoles.includes(roleName);
  };

  // ===================================================
  // PERMISSION CHECK
  // ===================================================

  const hasPermission = (permissionName) => {
    if (!permissionName) return true;

    if (Array.isArray(permissionName)) {
      return permissionName.some((permission) =>
        allPermissions.includes(permission)
      );
    }

    return allPermissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionList) => {
    if (!Array.isArray(permissionList) || permissionList.length === 0) {
      return true;
    }

    return permissionList.some((permission) =>
      allPermissions.includes(permission)
    );
  };

  const hasAllPermissions = (permissionList) => {
    if (!Array.isArray(permissionList) || permissionList.length === 0) {
      return true;
    }

    return permissionList.every((permission) =>
      allPermissions.includes(permission)
    );
  };

  // ===================================================
  // SYSTEM SETTINGS
  // ===================================================

  const systemSettings = processSystemSettings(userData);

  const enabledModules = systemSettings.enabled_modules;

  const hasModule = (moduleKey) => {
    if (!moduleKey) return false;

    return enabledModules.includes(moduleKey);
  };

  // ===================================================
  // FINAL USER OBJECT
  // ===================================================

  return {
    ...userData,

    avatar_url: getAvatarUrl(userData),

    roles,

    role_names: userRoles,

    permissions: userData.permissions || [],

    all_permissions: allPermissions,

    // Role helpers
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Module helpers
    hasModule,
    enabledModules,

    // System settings
    systemSettings,

    setupCompleted: systemSettings.setup_completed,

    hospitalName: systemSettings.hospital_name,

    hospitalLogo: systemSettings.logo,

    // Role shortcuts
    isAdmin:
      hasRole("admin") || hasRole("Admin"),

    isSuperAdmin: hasRole("super_admin"),

    isHospitalHead: hasRole("hospital_head"),

    isUser: hasRole("user"),
  };
};

// =====================================================
// EXTRACT USER FROM API RESPONSE
// =====================================================

const extractUser = (responseData) => {
  if (!responseData) return null;

  const user = responseData.user ?? responseData;

  if (!user || typeof user !== "object") {
    return null;
  }

  // اگر تنظیمات سیستم جدا از user ارسال شده باشد
  const systemData = {
    ...user,

    system_settings:
      responseData.system_settings ??
      responseData.systemSettings ??
      responseData.hospital_setup ??
      responseData.hospitalSetup ??
      user.system_settings,

    enabled_modules:
      responseData.enabled_modules ??
      responseData.enabledModules ??
      user.enabled_modules,

    setup_completed:
      responseData.setup_completed ??
      responseData.setupCompleted ??
      user.setup_completed,
  };

  return systemData;
};

// =====================================================
// AUTH PROVIDER
// =====================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // ===================================================
  // SAVE USER
  // ===================================================

  const saveUser = useCallback((rawUser) => {
    if (!rawUser) {
      setUser(null);
      localStorage.removeItem("user");
      return null;
    }

    const processedUser = processUserData(rawUser);

    setUser(processedUser);

    // فقط برای نمایش سریع اطلاعات کاربر
    // منبع اصلی تنظیمات سیستم همچنان Backend است.
    localStorage.setItem(
      "user",
      JSON.stringify(rawUser)
    );

    return processedUser;
  }, []);

  // ===================================================
  // CHECK AUTHENTICATION
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const checkAuthentication = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }

        return;
      }

      // نمایش سریع اطلاعات ذخیره‌شده
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          if (mounted) {
            setUser(processUserData(parsedUser));
          }
        } catch (error) {
          console.error("Stored user parse error:", error);
          localStorage.removeItem("user");
        }
      }

      try {
        // دریافت اطلاعات تازه از Backend
        const response = await api.get("/me");

        const rawUser = extractUser(response.data);

        if (!rawUser) {
          throw new Error("Invalid user response from server.");
        }

        if (mounted) {
          saveUser(rawUser);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (error.response?.status !== 401) {
          // خطای شبکه یا سرور: نشست را بی‌دلیل حذف نکن.
          // اطلاعات قبلی کاربر در صورت موجود بودن باقی می‌ماند.
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          if (mounted) {
            setUser(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [saveUser]);

  // ===================================================
  // LOGIN
  // ===================================================

  const login = async (email, password) => {
    const response = await api.post("/login", {
      email,
      password,
    });

    const token = response.data.token;

    if (!token) {
      throw new Error("Login response does not contain a token.");
    }

    localStorage.setItem("token", token);

    const rawUser = extractUser(response.data);

    if (!rawUser) {
      throw new Error("Login response does not contain user data.");
    }

    const processedUser = saveUser(rawUser);

    return {
      ...response.data,
      user: processedUser,
    };
  };

  // ===================================================
  // LOGOUT
  // ===================================================

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

  // ===================================================
  // UPDATE USER
  // ===================================================

  const updateUser = (updatedData) => {
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updatedData,
    };

    return saveUser(updatedUser);
  };

  // ===================================================
  // REFRESH USER AND SYSTEM SETTINGS
  // ===================================================

  const refreshUser = async () => {
    const response = await api.get("/me");

    const rawUser = extractUser(response.data);

    if (!rawUser) {
      throw new Error("Invalid user response from server.");
    }

    return saveUser(rawUser);
  };

  // ===================================================
  // CONTEXT VALUE
  // ===================================================

  const contextValue = {
    user,
    loading,

    login,
    logout,

    api,

    updateUser,
    refreshUser,

    // Convenient access to system setup
    enabledModules: user?.enabledModules || [],

    setupCompleted: user?.setupCompleted ?? false,

    hospitalName: user?.hospitalName || "",

    hospitalLogo: user?.hospitalLogo || null,

    hasModule: user?.hasModule || (() => false),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// =====================================================
// AUTH HOOK
// =====================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth باید داخل AuthProvider باشد"
    );
  }

  return context;
};

export default AuthContext;
