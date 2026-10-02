import { useState, useEffect, useCallback, useMemo } from "react";
import ReportLayout from "../../../../components/ReportLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import AdminRoute from "../AdminRoute";
import "../../../../components/ReportLayout";

// ============================================================
// ✅ دیکشنری لیبل فارسی رول‌ها
// ============================================================
const ROLE_LABELS = {
  ADMIN: "مدیر سیستم",
  SUPERADMIN: "مدیر ارشد",
  HOSPITALHEAD: "رئیس شفاخانه",
  MANAGER: "مدیر عمومی",
  DOCTOR: "داکتر",
  SPECIALISTDOCTOR: "داکتر متخصص",
  SURGEON: "جراح",
  NURSE: "نرس",
  HEADNURSE: "نرس سر",
  MIDWIFE: "قابله",
  PHARMACIST: "دواساز",
  PHARMACYASSISTANT: "دستیار دواخانه",
  LABTECHNICIAN: "تخنیکر لابراتوار",
  LABMANAGER: "مدیر لابراتوار",
  RADIOLOGIST: "رادیولوجیست",
  RADIOLOGYTECHNICIAN: "تخنیکر رادیولوژی",
  RECEPTIONIST: "استقبال",
  ACCOUNTANT: "حسابدار",
  FINANCEMANAGER: "مدیر مالی",
  CASHIER: "صندوق‌دار",
  HRMANAGER: "مدیر منابع بشری",
  HRSTAFF: "کارمند منابع بشری",
  STOCKMANAGER: "مدیر گدام",
  INVENTORYCLERK: "کارمند موجودی",
  ITSUPPORT: "پشتیبانی تخنیکی",
  SECURITY: "امنیت",
  CLEANER: "پاک‌کن",
  AMBULANCEDRIVER: "راننده امبولانس",
  PATIENT: "مریض",
  USER: "کاربر عادی",
};

// ============================================================
// ✅ دیکشنری کامل لیبل پرمیشن‌ها
// ============================================================
const PERMISSION_LABELS = {
  // کاربران
  "VIEW-USERS": "مشاهده کاربران",
  "CREATE-USERS": "ایجاد کاربر",
  "EDIT-USERS": "ویرایش کاربر",
  "DELETE-USERS": "حذف کاربر",
  // رول‌ها
  "VIEW-ROLES": "مشاهده رول‌ها",
  "CREATE-ROLES": "ایجاد رول",
  "EDIT-ROLES": "ویرایش رول",
  "DELETE-ROLES": "حذف رول",
  // مجوزها
  "VIEW-PERMISSIONS": "مشاهده مجوزها",
  "CREATE-PERMISSIONS": "ایجاد مجوز",
  "EDIT-PERMISSIONS": "ویرایش مجوز",
  "DELETE-PERMISSIONS": "حذف مجوز",
  // داروها
  "VIEW-MEDICATIONS": "مشاهده داروها",
  "CREATE-MEDICATIONS": "ایجاد دارو",
  "EDIT-MEDICATIONS": "ویرایش دارو",
  "DELETE-MEDICATIONS": "حذف دارو",
  // ثبت‌نام
  "VIEW-REGISTRATIONS": "مشاهده ثبت‌نام‌ها",
  "CREATE-REGISTRATIONS": "ایجاد ثبت‌نام",
  "EDIT-REGISTRATIONS": "ویرایش ثبت‌نام",
  "DELETE-REGISTRATIONS": "حذف ثبت‌نام",
  // معالجات
  "VIEW-EXAMINATIONS": "مشاهده معالجات",
  "CREATE-EXAMINATIONS": "ایجاد معالجه",
  "EDIT-EXAMINATIONS": "ویرایش معالجه",
  "DELETE-EXAMINATIONS": "حذف معالجه",
  // لابراتوار
  "VIEW-LAB": "مشاهده لابراتوار",
  "CREATE-LAB": "ایجاد آزمایش",
  "EDIT-LAB": "ویرایش آزمایش",
  "DELETE-LAB": "حذف آزمایش",
  "APPROVE-LAB-RESULTS": "تأیید نتایج لابراتوار",
  // رادیولوژی
  "VIEW-RADIOLOGY": "مشاهده رادیولوژی",
  "CREATE-RADIOLOGY": "ایجاد تصویربرداری",
  "EDIT-RADIOLOGY": "ویرایش تصویربرداری",
  "DELETE-RADIOLOGY": "حذف تصویربرداری",
  "APPROVE-RADIOLOGY": "تأیید نتایج رادیولوژی",
  // دواخانه
  "VIEW-PHARMACY": "مشاهده دواخانه",
  "CREATE-PHARMACY": "ایجاد نسخه دواخانه",
  "EDIT-PHARMACY": "ویرایش نسخه دواخانه",
  "DELETE-PHARMACY": "حذف نسخه دواخانه",
  "DISPENSE-MEDICINE": "تحویل دارو",
  // نسخه‌ها
  "VIEW-PRESCRIPTIONS": "مشاهده نسخه‌ها",
  "CREATE-PRESCRIPTIONS": "ایجاد نسخه",
  "EDIT-PRESCRIPTIONS": "ویرایش نسخه",
  "DELETE-PRESCRIPTIONS": "حذف نسخه",
  // گدام
  "VIEW-STOCK": "مشاهده گدام",
  "CREATE-STOCK": "افزودن به گدام",
  "EDIT-STOCK": "ویرایش گدام",
  "DELETE-STOCK": "حذف از گدام",
  // حساب‌ها
  "VIEW-ACCOUNTS": "مشاهده حساب‌ها",
  "CREATE-ACCOUNTS": "ایجاد حساب",
  "EDIT-ACCOUNTS": "ویرایش حساب",
  "DELETE-ACCOUNTS": "حذف حساب",
  // فروشات
  "VIEW-SALES": "مشاهده فروشات",
  "CREATE-SALES": "ایجاد فروش",
  "EDIT-SALES": "ویرایش فروش",
  "DELETE-SALES": "حذف فروش",
  // خریدها
  "VIEW-PURCHASES": "مشاهده خریدها",
  "CREATE-PURCHASES": "ایجاد خرید",
  "EDIT-PURCHASES": "ویرایش خرید",
  "DELETE-PURCHASES": "حذف خرید",
  // پرداخت‌ها
  "VIEW-PAYMENT": "مشاهده پرداخت‌ها",
  "CREATE-PAYMENT": "ایجاد پرداخت",
  "EDIT-PAYMENT": "ویرایش پرداخت",
  "DELETE-PAYMENT": "حذف پرداخت",
  // تبدیلی‌ها
  "VIEW-CHANGES": "مشاهده تبدیلی‌ها",
  "CREATE-CHANGES": "ایجاد تبدیلی",
  "EDIT-CHANGES": "ویرایش تبدیلی",
  "DELETE-CHANGES": "حذف تبدیلی",
  // گزارشات
  "VIEW-REPORTS": "مشاهده گزارشات",
  "VIEW-FINANCIAL-REPORTS": "مشاهده گزارشات مالی",
  "VIEW-STOCK-REPORTS": "مشاهده گزارشات گدام",
  "VIEW-SALES-REPORTS": "مشاهده گزارشات فروش",
  "VIEW-HR-REPORTS": "مشاهده گزارشات منابع بشری",
  "VIEW-MEDICAL-REPORTS": "مشاهده گزارشات طبی",
  "EXPORT-REPORTS": "صادر کردن گزارشات",
  // بخش‌ها
  "VIEW-DEPARTMENTS": "مشاهده بخش‌ها",
  "CREATE-DEPARTMENTS": "ایجاد بخش",
  "EDIT-DEPARTMENTS": "ویرایش بخش",
  "DELETE-DEPARTMENTS": "حذف بخش",
  // دسته‌بندی‌ها
  "VIEW-CATEGORIES": "مشاهده دسته‌بندی‌ها",
  "CREATE-CATEGORIES": "ایجاد دسته‌بندی",
  "EDIT-CATEGORIES": "ویرایش دسته‌بندی",
  "DELETE-CATEGORIES": "حذف دسته‌بندی",
  // لاگ‌ها
  "VIEW-LOGS": "مشاهده لاگ‌ها",
  "DELETE-LOGS": "حذف لاگ‌ها",
  // تنظیمات
  "VIEW-SETTINGS": "مشاهده تنظیمات",
  "EDIT-SETTINGS": "ویرایش تنظیمات",
  // کارمندان
  "VIEW-EMPLOYEES": "مشاهده کارمندان",
  "CREATE-EMPLOYEES": "ایجاد کارمند",
  "EDIT-EMPLOYEES": "ویرایش کارمند",
  "DELETE-EMPLOYEES": "حذف کارمند",
  // حاضری
  "VIEW-ATTENDANCE": "مشاهده حاضری",
  "MANAGE-ATTENDANCE": "مدیریت حاضری",
  // معاشات
  "VIEW-PAYROLL": "مشاهده معاشات",
  "MANAGE-PAYROLL": "مدیریت معاشات",
  // ژورنال
  "VIEW-JOURNAL": "مشاهده ژورنال",
  "CREATE-JOURNAL": "ایجاد ژورنال",
  "EDIT-JOURNAL": "ویرایش ژورنال",
  "DELETE-JOURNAL": "حذف ژورنال",
  // داشبورد
  "VIEW-DASHBOARD": "مشاهده داشبورد",
  "VIEW-DASHBOARD-DAILY": "مشاهده گزارش روزانه",
  // مریضان
  "VIEW-PATIENTS": "مشاهده مریضان",
  "CREATE-PATIENTS": "ایجاد مریض",
  "EDIT-PATIENTS": "ویرایش مریض",
  "DELETE-PATIENTS": "حذف مریض",
  // داکتران
  "VIEW-DOCTORS": "مشاهده داکتران",
  "CREATE-DOCTORS": "ایجاد داکتر",
  "EDIT-DOCTORS": "ویرایش داکتر",
  "DELETE-DOCTORS": "حذف داکتر",
  // نرس‌ها
  "VIEW-NURSES": "مشاهده نرس‌ها",
  "CREATE-NURSES": "ایجاد نرس",
  "EDIT-NURSES": "ویرایش نرس",
  "DELETE-NURSES": "حذف نرس",
  // تدارکات
  "VIEW-SUPPLIERS": "مشاهده تأمین‌کنندگان",
  "CREATE-SUPPLIERS": "ایجاد تأمین‌کننده",
  "EDIT-SUPPLIERS": "ویرایش تأمین‌کننده",
  "DELETE-SUPPLIERS": "حذف تأمین‌کننده",
  // تنظیمات پیشرفته
  "VIEW-SYSTEM": "مشاهده سیستم",
  "MANAGE-SYSTEM": "مدیریت سیستم",
  "VIEW-BACKUP": "مشاهده پشتیبان",
  "CREATE-BACKUP": "ایجاد پشتیبان",
  "RESTORE-BACKUP": "بازگردانی پشتیبان",
};

// ============================================================
// توابع کمک برای گرفتن لیبل
// ============================================================
const getRoleLabel = (role) => {
  if (role?.display_name) return role.display_name;
  return ROLE_LABELS[role?.name] || role?.name || "-";
};

const getPermissionLabel = (perm) => {
  if (!perm) return "-";
  if (perm.display_name) return perm.display_name;
  return PERMISSION_LABELS[perm.name] || perm.name || "-";
};

// نرمال‌سازی برای جستجوی فارسی/انگلیسی
const normalize = (str) =>
  String(str ?? "")
    .toLowerCase()
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " "); // نیم‌فاصله

// ============================================================
// کامپوننت اصلی
// ============================================================
export default function RolesPermissionsPage() {
  const { api } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [newPermission, setNewPermission] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleSearchQuery, setRoleSearchQuery] = useState("");

  const [rolesCurrentPage, setRolesCurrentPage] = useState(1);
  const [rolesPerPage] = useState(5);

  const [loading, setLoading] = useState({
    roles: false,
    permissions: false,
    addRole: false,
    addPermission: false,
    deleteRole: null,
    deletePermission: null,
    assignPermissions: null,
    removePermission: null,
  });

  const fetchRoles = useCallback(async () => {
    setLoading((prev) => ({ ...prev, roles: true }));
    try {
      const res = await api.get("/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error("خطا در بارگذاری رول‌ها");
    } finally {
      setLoading((prev) => ({ ...prev, roles: false }));
    }
  }, [api]);

  const fetchPermissions = useCallback(async () => {
    setLoading((prev) => ({ ...prev, permissions: true }));
    try {
      const res = await api.get("/permissions");
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      toast.error("خطا در بارگذاری پرمیشن‌ها");
    } finally {
      setLoading((prev) => ({ ...prev, permissions: false }));
    }
  }, [api]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // ✅ ریست صفحه هنگام تغییر جستجو
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setRolesCurrentPage(1);
  }, [roleSearchQuery]);

  const handleAddRole = async () => {
    if (!newRole.trim()) {
      toast.warning("نام رول را وارد کنید");
      return;
    }

    setLoading((prev) => ({ ...prev, addRole: true }));
    try {
      const response = await api.post("/roles", { name: newRole.trim() });
      toast.success(response.data.message || "رول با موفقیت اضافه شد");
      setNewRole("");
      await fetchRoles();
    } catch (err) {
      console.error("Error adding role:", err);
      const errorMessage = err.response?.data?.error || "خطا در ایجاد رول جدید";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, addRole: false }));
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("آیا از حذف این رول اطمینان دارید؟")) return;

    setLoading((prev) => ({ ...prev, deleteRole: roleId }));
    try {
      const response = await api.delete(`/roles/${roleId}`);
      toast.success(response.data.message || "رول با موفقیت حذف شد");
      await fetchRoles();
    } catch (err) {
      console.error("Error deleting role:", err);
      const errorMessage = err.response?.data?.error || "خطا در حذف رول";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, deleteRole: null }));
    }
  };

  const handleAddPermission = async () => {
    if (!newPermission.trim()) {
      toast.warning("نام پرمیشن را وارد کنید");
      return;
    }

    setLoading((prev) => ({ ...prev, addPermission: true }));
    try {
      const response = await api.post("/permissions", {
        name: newPermission.trim(),
      });
      toast.success(response.data.message || "پرمیشن با موفقیت اضافه شد");
      setNewPermission("");
      await fetchPermissions();
    } catch (err) {
      console.error("Error adding permission:", err);
      const errorMessage =
        err.response?.data?.error || "خطا در ایجاد پرمیشن جدید";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, addPermission: false }));
    }
  };

  const handleDeletePermission = async (permId) => {
    if (!window.confirm("آیا از حذف این پرمیشن اطمینان دارید؟")) return;

    setLoading((prev) => ({ ...prev, deletePermission: permId }));
    try {
      const response = await api.delete(`/permissions/${permId}`);
      toast.success(response.data.message || "پرمیشن با موفقیت حذف شد");

      setSelectedPermissions((prev) => {
        const newState = { ...prev };
        Object.keys(newState).forEach((roleId) => {
          newState[roleId] = newState[roleId].filter((id) => id !== permId);
        });
        return newState;
      });

      await fetchPermissions();
      await fetchRoles();
    } catch (err) {
      console.error("Error deleting permission:", err);
      const errorMessage = err.response?.data?.error || "خطا در حذف پرمیشن";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, deletePermission: null }));
    }
  };

  const handleAssignPermissions = async (roleId) => {
    const selectedPerms = selectedPermissions[roleId] || [];
    if (selectedPerms.length === 0) {
      toast.warning("حداقل یک پرمیشن انتخاب کنید");
      return;
    }

    setLoading((prev) => ({ ...prev, assignPermissions: roleId }));
    try {
      const response = await api.post(`/roles/${roleId}/permissions`, {
        permissions: selectedPerms,
      });

      toast.success(
        response.data.message || "پرمیشن‌ها با موفقیت اختصاص داده شدند"
      );

      setSelectedPermissions((prev) => ({ ...prev, [roleId]: [] }));
      await fetchRoles();
    } catch (err) {
      console.error("Error assigning permissions:", err);
      const errorMessage =
        err.response?.data?.error || "خطا در اختصاص پرمیشن‌ها";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, assignPermissions: null }));
    }
  };

  const handleRemovePermissionFromRole = async (
    roleId,
    permissionId,
    permissionName
  ) => {
    const label = getPermissionLabel({ name: permissionName });
    if (
      !window.confirm(
        `آیا از حذف پرمیشن "${label}" از این رول اطمینان دارید؟`
      )
    ) {
      return;
    }

    setLoading((prev) => ({
      ...prev,
      removePermission: `${roleId}-${permissionId}`,
    }));
    try {
      const response = await api.delete(
        `/roles/${roleId}/permissions/${permissionId}`
      );
      toast.success(
        response.data.message || "پرمیشن با موفقیت از رول حذف شد"
      );
      await fetchRoles();
    } catch (err) {
      console.error("Error removing permission from role:", err);
      const errorMessage =
        err.response?.data?.error || "خطا در حذف پرمیشن از رول";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, removePermission: null }));
    }
  };

  const handleSelectPermission = (roleId, permissionId) => {
    setSelectedPermissions((prev) => {
      const currentSelected = prev[roleId] || [];
      const newSelected = currentSelected.includes(permissionId)
        ? currentSelected.filter((id) => id !== permissionId)
        : [...currentSelected, permissionId];

      return { ...prev, [roleId]: newSelected };
    });
  };

  // ============================================================
  // ✅ فیلتر پرمیشن‌ها (توسط نام انگلیسی یا لیبل فارسی)
  // ============================================================
  const filteredPermissions = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return permissions;

    return permissions.filter((perm) => {
      const label = normalize(getPermissionLabel(perm));
      const name = normalize(perm.name);
      return label.includes(q) || name.includes(q);
    });
  }, [permissions, searchQuery]);

  // ============================================================
  // ✅ فیلتر رول‌ها
  // ============================================================
  const filteredRoles = useMemo(() => {
    const q = normalize(roleSearchQuery);
    if (!q) return roles;

    return roles.filter((role) => {
      const label = normalize(getRoleLabel(role));
      const name = normalize(role.name);
      return label.includes(q) || name.includes(q);
    });
  }, [roles, roleSearchQuery]);

  // ✅ صفحه‌بندی پرمیشن‌ها
  const permIndexOfLast = currentPage * perPage;
  const permIndexOfFirst = permIndexOfLast - perPage;
  const currentPermissions = filteredPermissions.slice(
    permIndexOfFirst,
    permIndexOfLast
  );
  const permTotalPages = Math.ceil(filteredPermissions.length / perPage);

  // ✅ صفحه‌بندی رول‌ها
  const rolesIndexOfLast = rolesCurrentPage * rolesPerPage;
  const rolesIndexOfFirst = rolesIndexOfLast - rolesPerPage;
  const currentRoles = filteredRoles.slice(rolesIndexOfFirst, rolesIndexOfLast);
  const rolesTotalPages = Math.ceil(filteredRoles.length / rolesPerPage);

  return (
    <ReportLayout>
      <AdminRoute>
        <div className="report-page" dir="rtl">
          <h1 className="report-title">مدیریت رول‌ها و پرمیشن‌ها</h1>

          {(loading.roles || loading.permissions) && (
            <div className="loading-box">
              <p>در حال بارگذاری...</p>
            </div>
          )}

          <div className="filter-section">
            <div>
              <input
                type="text"
                placeholder="نام رول جدید (مثلاً DOCTOR)"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={loading.addRole}
              />
              <button
                onClick={handleAddRole}
                disabled={loading.addRole}
                style={{
                  backgroundColor: "#0d47a1",
                  color: "white",
                  border: "none",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  marginRight: "8px",
                  cursor: "pointer",
                }}
              >
                {loading.addRole ? "در حال اضافه کردن..." : "اضافه کردن رول"}
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder="نام پرمیشن جدید (مثلاً VIEW-LAB)"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                disabled={loading.addPermission}
              />
              <button
                onClick={handleAddPermission}
                disabled={loading.addPermission}
                style={{
                  backgroundColor: "#6a1b9a",
                  color: "white",
                  border: "none",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  marginRight: "8px",
                  cursor: "pointer",
                }}
              >
                {loading.addPermission
                  ? "در حال اضافه کردن..."
                  : "اضافه کردن پرمیشن"}
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Roles Table */}
          {/* ============================================================ */}
          <div style={{ marginBottom: "40px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                marginBottom: "15px",
              }}
            >
              لیست رول‌ها ({filteredRoles.length})
            </h2>

            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="جستجوی رول‌ها (فارسی یا انگلیسی)"
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                style={{
                  padding: "10px",
                  width: "100%",
                  maxWidth: "400px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {loading.roles ? (
              <div className="loading-box">در حال بارگذاری رول‌ها...</div>
            ) : (
              <>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <thead style={{ backgroundColor: "#f5f5f5" }}>
                    <tr>
                      <th style={thStyle}>نام رول</th>
                      <th style={thStyle}>نام سیستمی</th>
                      <th style={thStyle}>پرمیشن‌های فعلی</th>
                      <th style={thStyle}>انتخاب پرمیشن جدید</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoles.length > 0 ? (
                      currentRoles.map((role) => (
                        <tr
                          key={role.id}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: "600",
                              color: "#0d47a1",
                            }}
                          >
                            {getRoleLabel(role)}
                          </td>

                          <td
                            style={{
                              padding: "12px",
                              fontFamily: "monospace",
                              fontSize: "12px",
                              color: "#666",
                            }}
                          >
                            {role.name}
                          </td>

                          <td style={{ padding: "12px" }}>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "5px",
                              }}
                            >
                              {role.permissions && role.permissions.length > 0 ? (
                                role.permissions.map((perm) => (
                                  <span
                                    key={perm.id}
                                    style={{
                                      backgroundColor: "#e3f2fd",
                                      color: "#0d47a1",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {getPermissionLabel(perm)}
                                    <button
                                      onClick={() =>
                                        handleRemovePermissionFromRole(
                                          role.id,
                                          perm.id,
                                          perm.name
                                        )
                                      }
                                      style={{
                                        marginRight: "6px",
                                        color: "#d32f2f",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                      }}
                                      disabled={
                                        loading.removePermission ===
                                        `${role.id}-${perm.id}`
                                      }
                                    >
                                      {loading.removePermission ===
                                      `${role.id}-${perm.id}`
                                        ? "..."
                                        : "×"}
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: "#999", fontSize: "13px" }}>
                                  بدون پرمیشن
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: "12px" }}>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                                maxHeight: "120px",
                                overflowY: "auto",
                                padding: "5px",
                              }}
                            >
                              {permissions.map((perm) => {
                                const isSelected =
                                  selectedPermissions[role.id]?.includes(
                                    perm.id
                                  );
                                const isAlreadyAssigned =
                                  role.permissions?.some(
                                    (p) => p.id === perm.id
                                  );

                                return (
                                  <button
                                    key={perm.id}
                                    onClick={() =>
                                      handleSelectPermission(role.id, perm.id)
                                    }
                                    disabled={
                                      isAlreadyAssigned ||
                                      loading.assignPermissions === role.id
                                    }
                                    title={perm.name}
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: "12px",
                                      borderRadius: "6px",
                                      border: "none",
                                      cursor:
                                        isAlreadyAssigned ||
                                        loading.assignPermissions === role.id
                                          ? "not-allowed"
                                          : "pointer",
                                      backgroundColor: isSelected
                                        ? "#2e7d32"
                                        : isAlreadyAssigned
                                        ? "#bdbdbd"
                                        : "#e0e0e0",
                                      color: isSelected
                                        ? "white"
                                        : isAlreadyAssigned
                                        ? "white"
                                        : "#333",
                                    }}
                                  >
                                    {getPermissionLabel(perm)}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                onClick={() => handleAssignPermissions(role.id)}
                                disabled={
                                  loading.assignPermissions === role.id ||
                                  !selectedPermissions[role.id]?.length
                                }
                                style={{
                                  backgroundColor: "#2e7d32",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor:
                                    loading.assignPermissions === role.id ||
                                    !selectedPermissions[role.id]?.length
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {loading.assignPermissions === role.id
                                  ? "در حال اختصاص..."
                                  : "اختصاص"}
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id)}
                                disabled={loading.deleteRole === role.id}
                                style={{
                                  backgroundColor: "#d32f2f",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor:
                                    loading.deleteRole === role.id
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {loading.deleteRole === role.id
                                  ? "در حال حذف..."
                                  : "حذف رول"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#999",
                          }}
                        >
                          هیچ رولی یافت نشد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {rolesTotalPages > 1 && (
                  <div
                    className="pagination-wrapper"
                    style={{ marginTop: "20px" }}
                  >
                    <button
                      onClick={() =>
                        setRolesCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={rolesCurrentPage === 1}
                    >
                      قبلی
                    </button>
                    {Array.from({ length: rolesTotalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setRolesCurrentPage(i + 1)}
                        className={
                          rolesCurrentPage === i + 1 ? "active-page" : ""
                        }
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setRolesCurrentPage((prev) =>
                          Math.min(prev + 1, rolesTotalPages)
                        )
                      }
                      disabled={rolesCurrentPage === rolesTotalPages}
                    >
                      بعدی
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ============================================================ */}
          {/* Permissions Table */}
          {/* ============================================================ */}
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                marginBottom: "15px",
              }}
            >
              لیست پرمیشن‌ها ({filteredPermissions.length})
            </h2>

            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="جستجوی پرمیشن‌ها (فارسی یا انگلیسی)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "10px",
                  width: "100%",
                  maxWidth: "400px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {loading.permissions ? (
              <div className="loading-box">در حال بارگذاری پرمیشن‌ها...</div>
            ) : (
              <>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <thead style={{ backgroundColor: "#f5f5f5" }}>
                    <tr>
                      <th style={thStyle}>نام پرمیشن</th>
                      <th style={thStyle}>نام سیستمی</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPermissions.length > 0 ? (
                      currentPermissions.map((perm) => (
                        <tr
                          key={perm.id}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: "500",
                              color: "#6a1b9a",
                            }}
                          >
                            {getPermissionLabel(perm)}
                          </td>

                          <td
                            style={{
                              padding: "12px",
                              fontFamily: "monospace",
                              fontSize: "12px",
                              color: "#666",
                            }}
                          >
                            {perm.name}
                          </td>

                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <button
                              onClick={() => handleDeletePermission(perm.id)}
                              disabled={loading.deletePermission === perm.id}
                              style={{
                                backgroundColor: "#d32f2f",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                cursor:
                                  loading.deletePermission === perm.id
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {loading.deletePermission === perm.id
                                ? "در حال حذف..."
                                : "حذف"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="3"
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#999",
                          }}
                        >
                          هیچ پرمیشنی یافت نشد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {permTotalPages > 1 && (
                  <div
                    className="pagination-wrapper"
                    style={{ marginTop: "20px" }}
                  >
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      قبلی
                    </button>
                    {Array.from({ length: permTotalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={currentPage === i + 1 ? "active-page" : ""}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, permTotalPages)
                        )
                      }
                      disabled={currentPage === permTotalPages}
                    >
                      بعدی
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <ToastContainer
            position="top-center"
            rtl={true}
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnHover
            draggable
            pauseOnFocusLoss
            limit={3}
            style={{ zIndex: 9999, marginTop: "60px" }}
            toastStyle={{
              backgroundColor: "#fff",
              color: "#333",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              fontFamily: "inherit",
            }}
          />
        </div>
      </AdminRoute>
    </ReportLayout>
  );
}

// ============================================================
// استایل مشترک هدر جدول
// ============================================================
const thStyle = {
  borderBottom: "1px solid #ddd",
  padding: "12px",
  textAlign: "right",
};