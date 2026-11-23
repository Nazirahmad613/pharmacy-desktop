// src/app/contexts/AuthContext.jsx
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

      // فقط اگر در صفحه setup یا signin نیستیم هدایت کن
      const currentHash = window.location.hash || "";
      if (
        !currentHash.includes("/session/signin") &&
        !currentHash.includes("/setup")
      ) {
        window.location.href = "#/session/signin";
      }
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
// HELPER: LOGO URL
// =====================================================

const getLogoUrl = (logoPath) => {
  if (!logoPath) return null;

  if (
    logoPath.startsWith("http://") ||
    logoPath.startsWith("https://")
  ) {
    return logoPath;
  }

  const cleanPath = logoPath.replace(/^\/+/, "");

  // اگر با storage شروع شود، دوباره اضافه نکن
  if (cleanPath.startsWith("storage/")) {
    return `${API_BASE_URL}/${cleanPath}`;
  }

  return `${API_BASE_URL}/storage/${cleanPath}`;
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
          if (typeof module === "string") return module;
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

  const hospitalName =
    settings.hospital_name ??
    settings.hospitalName ??
    data.hospital_name ??
    data.hospitalName ??
    "";

  const rawLogo =
    settings.logo ??
    settings.hospital_logo ??
    data.logo ??
    data.hospital_logo ??
    null;

  return {
    ...settings,
    hospital_name: hospitalName,
    logo: rawLogo,
    logo_url: getLogoUrl(rawLogo),
    enabled_modules: enabledModules,
    setup_completed: Boolean(setupCompleted),
  };
};

// =====================================================
// PROCESS USER DATA
// =====================================================

const processUserData = (userData) => {
  if (!userData) return null;

  const roles = Array.isArray(userData.roles) ? userData.roles : [];

  const userRoles = roles
    .map((role) => {
      if (typeof role === "string") return role;
      return role?.name;
    })
    .filter(Boolean);

  // Permissions
  const allPermissions = [];

  roles.forEach((role) => {
    if (!Array.isArray(role?.permissions)) return;
    role.permissions.forEach((permission) => {
      const permissionName =
        typeof permission === "object" ? permission?.name : permission;
      if (permissionName && !allPermissions.includes(permissionName)) {
        allPermissions.push(permissionName);
      }
    });
  });

  if (Array.isArray(userData.permissions)) {
    userData.permissions.forEach((permission) => {
      const permissionName =
        typeof permission === "object" ? permission?.name : permission;
      if (permissionName && !allPermissions.includes(permissionName)) {
        allPermissions.push(permissionName);
      }
    });
  }

  // Role helpers
  const hasRole = (roleName) => {
    if (Array.isArray(roleName)) {
      return roleName.some((role) => userRoles.includes(role));
    }
    return userRoles.includes(roleName);
  };

  const hasPermission = (permissionName) => {
    if (!permissionName) return true;
    if (Array.isArray(permissionName)) {
      return permissionName.some((p) => allPermissions.includes(p));
    }
    return allPermissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionList) => {
    if (!Array.isArray(permissionList) || permissionList.length === 0) {
      return true;
    }
    return permissionList.some((p) => allPermissions.includes(p));
  };

  const hasAllPermissions = (permissionList) => {
    if (!Array.isArray(permissionList) || permissionList.length === 0) {
      return true;
    }
    return permissionList.every((p) => allPermissions.includes(p));
  };

  // System settings
  const systemSettings = processSystemSettings(userData);
  const enabledModules = systemSettings.enabled_modules;

  const hasModule = (moduleKey) => {
    if (!moduleKey) return false;
    return enabledModules.includes(moduleKey);
  };

  return {
    ...userData,
    avatar_url: getAvatarUrl(userData),
    roles,
    role_names: userRoles,
    permissions: userData.permissions || [],
    all_permissions: allPermissions,

    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    hasModule,
    enabledModules,

    systemSettings,
    setupCompleted: systemSettings.setup_completed,
    hospitalName: systemSettings.hospital_name,
    hospitalLogo: systemSettings.logo_url,

    isAdmin: hasRole("admin") || hasRole("Admin"),
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

  if (!user || typeof user !== "object") return null;

  return {
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

    hospital_name:
      responseData.hospital_name ??
      responseData.hospitalName ??
      user.hospital_name,

    hospital_logo:
      responseData.hospital_logo ??
      responseData.hospitalLogo ??
      user.hospital_logo,
  };
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

    localStorage.setItem("user", JSON.stringify(rawUser));

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

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (mounted) setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
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
    const response = await api.post("/login", { email, password });

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

    const merged = { ...user, ...updatedData };
    return saveUser(merged);
  };

  // ===================================================
  // REFRESH USER
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
  // SET HOSPITAL SETTINGS (پس از Setup)
  // ===================================================

  const setHospitalSettings = useCallback((settings) => {
    if (!settings) return;

    setUser((prevUser) => {
      if (!prevUser) return prevUser;

      const newEnabledModules = normalizeModules(
        settings.enabled_modules ?? prevUser.enabledModules
      );

      const newSystemSettings = {
        ...(prevUser.systemSettings || {}),
        hospital_name:
          settings.hospital_name ?? prevUser.systemSettings?.hospital_name,
        logo: settings.logo_url ?? prevUser.systemSettings?.logo,
        logo_url: settings.logo_url ?? prevUser.systemSettings?.logo_url,
        enabled_modules: newEnabledModules,
        setup_completed: true,
      };

      return {
        ...prevUser,
        enabledModules: newEnabledModules,
        setupCompleted: true,
        hospitalName:
          settings.hospital_name ?? prevUser.hospitalName,
        hospitalLogo: settings.logo_url ?? prevUser.hospitalLogo,
        systemSettings: newSystemSettings,
      };
    });
  }, []);

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
    setHospitalSettings,

    // System setup
    enabledModules: user?.enabledModules || [],
    setupCompleted: user?.setupCompleted ?? false,
    hospitalName: user?.hospitalName || "",
    hospitalLogo: user?.hospitalLogo || null,
    hospitalSettings: user?.systemSettings || null,

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
    throw new Error("useAuth باید داخل AuthProvider باشد");
  }
  return context;
};

export default AuthContext;