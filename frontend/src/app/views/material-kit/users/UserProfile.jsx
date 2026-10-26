import { useEffect, useState } from "react";
import api from "../../../../api";
import ReportLayout from "../../../../components/ReportLayout";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Avatar,
  Chip,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaKey, FaUserCircle } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../../contexts/AuthContext";

export default function UsersPage() {
  const { user: currentUser, updateUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    password: "",
    password_confirmation: "",
    avatar: null,
    department_id: "",
    tazkira_number: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    department_id: "",
    role: "",
  });

  // ================= بررسی دسترسی =================
  const currentRole = (currentUser?.role || "").toLowerCase();
  const isAdminOrSuper = ["admin", "super_admin"].includes(currentRole);
  const isHospitalHead = currentRole === "hospital_head";

  // ✅ آیا کاربر مجاز به مدیریت سایر کاربران است؟
  const canManageUsers = isAdminOrSuper;

  // ✅ آیا کاربر فقط می‌تواند حساب خودش را ببیند/ویرایش کند؟
  const isSelfServiceOnly = !canManageUsers && !isHospitalHead;

  // ================= دریافت داده‌ها =================
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    Promise.all([
      api.get("/users"),
      api.get("/roles"),
      api.get("/departments"),
    ])
      .then(([usersRes, rolesRes, deptsRes]) => {
        // ✅ اگر کاربر عادی است، فقط خودش را نمایش بده
        if (isSelfServiceOnly && currentUser?.id) {
          const all = Array.isArray(usersRes.data)
            ? usersRes.data
            : usersRes.data?.data || [];
          const onlyMe = all.filter((u) => u.id === currentUser.id);
          setUsers(onlyMe.length ? onlyMe : currentUser ? [currentUser] : []);
        } else {
          setUsers(
            Array.isArray(usersRes.data)
              ? usersRes.data
              : usersRes.data?.data || []
          );
        }

        setRoles(
          Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data?.data || []
        );
        setDepartments(deptsRes.data.data || deptsRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("❌ خطا در دریافت اطلاعات");
        setLoading(false);
      });
  }, [currentUser?.id, isSelfServiceOnly]);

  // ================= Loading =================
  if (loading) {
    return (
      <ReportLayout>
        <div className="report-page">
          <div className="loading-box">
            <CircularProgress />
          </div>
        </div>
      </ReportLayout>
    );
  }

  // ================= عدم دسترسی hospital_head =================
  if (isHospitalHead) {
    return (
      <ReportLayout>
        <div className="report-page">
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <h2 className="report-title">
              شما فقط اجازه مشاهده گزارش‌ها را دارید
            </h2>
            <NavLink to="/reports" style={{ textDecoration: "none" }}>
              <Button variant="contained" color="primary" sx={{ mt: 2 }}>
                مشاهده گزارش‌ها
              </Button>
            </NavLink>
          </div>
        </div>
      </ReportLayout>
    );
  }

  // ================= بررسی مجوز ویرایش یک کاربر خاص =================
  const canEditUser = (targetUser) => {
    if (!currentUser) return false;
    if (canManageUsers) return true; // ادمین همه را می‌تواند
    // کاربر عادی فقط خودش را
    return targetUser?.id === currentUser.id;
  };

  // ================= بررسی مجوز حذف =================
  const canDeleteUser = (targetUser) => {
    if (!currentUser) return false;
    if (!canManageUsers) return false; // فقط ادمین
    // ادمین نتواند خودش را حذف کند
    return targetUser?.id !== currentUser.id;
  };

  // ================= Dialog =================
  const handleOpenDialog = (user = null) => {
    if (user) {
      // ✅ بررسی مجوز
      if (!canEditUser(user)) {
        toast.error("❌ شما فقط می‌توانید حساب خودتان را ویرایش کنید");
        return;
      }

      setEditingUser(user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.roles?.[0]?.name || user.role || "user",
        password: "",
        password_confirmation: "",
        avatar: null,
        department_id: user.department_id || "",
        tazkira_number: user.tazkira_number || "",
      });
      setAvatarPreview(user.avatar_url || null);
    } else {
      // ✅ فقط ادمین می‌تواند کاربر جدید بسازد
      if (!canManageUsers) {
        toast.error("❌ شما اجازه افزودن کاربر جدید را ندارید");
        return;
      }
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        role: "user",
        password: "",
        password_confirmation: "",
        avatar: null,
        department_id: "",
        tazkira_number: "",
      });
      setAvatarPreview(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, avatar: file });
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ✅ تشخیص نقش داکتر
  const isDoctorRole =
    formData.role &&
    ["doctor", "Doctor", "داکتر", "دکتر"].includes(formData.role);

  // ================= ذخیره =================
  const handleSave = async () => {
    // ✅ بررسی مجوز نهایی قبل از ذخیره
    if (editingUser && !canEditUser(editingUser)) {
      toast.error("❌ شما مجاز به ویرایش این کاربر نیستید");
      return;
    }
    if (!editingUser && !canManageUsers) {
      toast.error("❌ شما مجاز به افزودن کاربر جدید نیستید");
      return;
    }

    // اعتبارسنجی سمت کلاینت
    if (!formData.name?.trim()) {
      toast.error("❌ نام کاربر را وارد کنید");
      return;
    }
    if (!formData.email?.trim()) {
      toast.error("❌ ایمیل کاربر را وارد کنید");
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error("❌ رمز عبور را وارد کنید");
      return;
    }
    if (
      formData.password &&
      formData.password !== formData.password_confirmation
    ) {
      toast.error("❌ رمز عبور با تکرار آن مطابقت ندارد");
      return;
    }
    if (isDoctorRole && !formData.department_id) {
      toast.error("❌ برای نقش داکتر، انتخاب بخش الزامی است");
      return;
    }

    setUploading(true);

    try {
      const hasFile = formData.avatar instanceof File;

      // ✅ برای کاربر عادی، نقش و بخش را دستکاری نکن
      const payloadRole = isSelfServiceOnly
        ? editingUser?.roles?.[0]?.name || editingUser?.role || formData.role
        : formData.role;

      const payloadDepartmentId = isSelfServiceOnly
        ? editingUser?.department_id || ""
        : formData.department_id;

      if (hasFile) {
        const fd = new FormData();
        fd.append("name", formData.name);
        fd.append("email", formData.email);
        fd.append("role", payloadRole);

        if (payloadDepartmentId) {
          fd.append("department_id", payloadDepartmentId);
        }
        if (
          formData.tazkira_number &&
          formData.tazkira_number.trim() !== ""
        ) {
          fd.append("tazkira_number", formData.tazkira_number.trim());
        }
        if (formData.password) {
          fd.append("password", formData.password);
          fd.append("password_confirmation", formData.password_confirmation);
        }
        fd.append("avatar", formData.avatar);

        if (editingUser) {
          fd.append("_method", "PUT");
        }

        const res = editingUser
          ? await api.post(`/users/${editingUser.id}`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
            })
          : await api.post("/users", fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });

        applySaveResult(res, editingUser);
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: payloadRole,
        };

        if (payloadDepartmentId) {
          payload.department_id = payloadDepartmentId;
        }
        if (
          formData.tazkira_number &&
          formData.tazkira_number.trim() !== ""
        ) {
          payload.tazkira_number = formData.tazkira_number.trim();
        }
        if (formData.password) {
          payload.password = formData.password;
          payload.password_confirmation = formData.password_confirmation;
        }

        const res = editingUser
          ? await api.put(`/users/${editingUser.id}`, payload)
          : await api.post("/users", payload);

        applySaveResult(res, editingUser);
      }

      handleCloseDialog();
    } catch (err) {
      console.error("Error details:", err);

      if (err.response?.status === 403) {
        toast.error("⛔ شما اجازه انجام این عملیات را ندارید");
      } else if (err.response?.status === 422 && err.response.data?.errors) {
        Object.values(err.response.data.errors)
          .flat()
          .forEach((msg) => toast.error(`❌ ${msg}`));
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else if (err.response?.status === 500) {
        toast.error("❌ خطای سرور - لطفاً با پشتیبانی تماس بگیرید");
      } else {
        toast.error("❌ خطا در ارتباط با سرور");
      }
    } finally {
      setUploading(false);
    }
  };

  const applySaveResult = (res, isEdit) => {
    const savedUser = res.data.user || res.data;

    if (isEdit) {
      setUsers(users.map((u) => (u.id === editingUser.id ? savedUser : u)));

      // ✅ فقط کاربر لاگین‌شده می‌تواند پروفایل خودش را تغییر دهد
      if (currentUser && currentUser.id === editingUser.id) {
        updateUser(savedUser);
        toast.success("✅ پروفایل شما با موفقیت به‌روزرسانی شد");
      } else {
        toast.success("✅ کاربر با موفقیت ویرایش شد");
      }
    } else {
      setUsers([...users, savedUser]);
      toast.success("✅ کاربر با موفقیت اضافه شد");
    }
  };

  // ================= حذف =================
  const handleDelete = (user) => {
    if (!canDeleteUser(user)) {
      toast.error(
        user?.id === currentUser?.id
          ? "❌ نمی‌توانید حساب خودتان را حذف کنید"
          : "❌ شما اجازه حذف کاربر را ندارید"
      );
      return;
    }

    if (
      window.confirm(
        `آیا مطمئن هستید می‌خواهید کاربر "${user.name}" را حذف کنید؟`
      )
    ) {
      api
        .delete(`/users/${user.id}`)
        .then(() => {
          setUsers(users.filter((u) => u.id !== user.id));
          toast.success("✅ کاربر با موفقیت حذف شد");
        })
        .catch((err) => {
          console.error(err);
          if (err.response?.status === 403) {
            toast.error("⛔ شما اجازه حذف این کاربر را ندارید");
          } else {
            toast.error("❌ خطا در حذف کاربر");
          }
        });
    }
  };

  // ================= فیلتر کاربران =================
  const filteredUsers = users.filter((u) => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (
        !u.name?.toLowerCase().includes(s) &&
        !u.email?.toLowerCase().includes(s) &&
        !u.tazkira_number?.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    if (filters.department_id && u.department_id != filters.department_id) {
      return false;
    }
    if (filters.role) {
      const userRoleNames = u.roles?.map((r) => r.name) || [];
      if (!userRoleNames.includes(filters.role)) return false;
    }
    return true;
  });

  // ================= عنوان صفحه =================
  const pageTitle = isSelfServiceOnly
    ? "حساب کاربری من"
    : "مدیریت کاربران";

  // ================= رندر =================
  return (
    <ReportLayout>
      <div className="report-page">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={true}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          limit={5}
          style={{
            zIndex: 9999999,
            position: "fixed",
            top: "20px",
            right: "20px",
            left: "auto",
            width: "auto",
            maxWidth: "350px",
            transform: "none",
          }}
        />

        <h1 className="report-title">{pageTitle}</h1>

        {/* ================= فیلترها — فقط برای ادمین ================= */}
        {canManageUsers && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="جستجو (نام، ایمیل یا نمبر تذکره)"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>فیلتر بخش</InputLabel>
                <Select
                  value={filters.department_id}
                  label="فیلتر بخش"
                  onChange={(e) =>
                    setFilters({ ...filters, department_id: e.target.value })
                  }
                >
                  <MenuItem value="">همه بخش‌ها</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>فیلتر نقش</InputLabel>
                <Select
                  value={filters.role}
                  label="فیلتر نقش"
                  onChange={(e) =>
                    setFilters({ ...filters, role: e.target.value })
                  }
                >
                  <MenuItem value="">همه نقش‌ها</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* ================= جدول ================= */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
          }}
        >
          <thead style={{ backgroundColor: "#0d47a1", color: "white" }}>
            <tr>
              <th style={thStyle}>عکس</th>
              <th style={thStyle}>نام</th>
              <th style={thStyle}>ایمیل</th>
              <th style={thStyle}>نمبر تذکره</th>
              <th style={thStyle}>نقش</th>
              <th style={thStyle}>بخش</th>
              <th style={thStyle}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "#888",
                  }}
                >
                  کاربری یافت نشد
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, index) => {
                const editable = canEditUser(u);
                const deletable = canDeleteUser(u);

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom:
                        index !== filteredUsers.length - 1
                          ? "2px solid #64b5f6"
                          : "none",
                      transition: "0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f7ff";
                      e.currentTarget.style.transform = "translateX(-3px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <td style={tdStyle}>
                      <Avatar
                        src={u.avatar_url}
                        alt={u.name}
                        sx={{ width: 45, height: 45, margin: "0 auto" }}
                      >
                        {!u.avatar_url && <FaUserCircle />}
                      </Avatar>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: "500" }}>
                      {u.name}{" "}
                      {u.id === currentUser?.id && (
                        <span
                          style={{
                            fontSize: 11,
                            backgroundColor: "#fff3e0",
                            color: "#e65100",
                            padding: "2px 6px",
                            borderRadius: 8,
                            marginLeft: 4,
                          }}
                        >
                          شما
                        </span>
                      )}
                      <FaKey style={{ marginLeft: 5, color: "#0d47a1" }} />
                    </td>
                    <td style={{ ...tdStyle, color: "#1565c0" }}>
                      {u.email}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: "monospace",
                        color: "#455a64",
                      }}
                    >
                      {u.tazkira_number ? (
                        u.tazkira_number
                      ) : (
                        <span style={{ color: "#bbb" }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          backgroundColor:
                            u.roles && u.roles[0]?.name === "super_admin"
                              ? "#d32f2f"
                              : "#0d47a1",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {u.roles && u.roles.length > 0
                          ? u.roles.map((r) => r.name).join(", ")
                          : "بدون رول"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {u.department ? (
                        <Chip
                          label={u.department.name}
                          size="small"
                          sx={{
                            backgroundColor: "#e8f5e9",
                            color: "#2e7d32",
                            fontWeight: "bold",
                          }}
                        />
                      ) : (
                        <span style={{ color: "#bbb" }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {editable && (
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(u)}
                          sx={{ color: "#0d47a1" }}
                          title="ویرایش"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {deletable && (
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(u)}
                          sx={{ color: "#d32f2f" }}
                          title="حذف"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                      {!editable && !deletable && (
                        <span style={{ color: "#bbb", fontSize: 12 }}>
                          بدون دسترسی
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ✅ دکمه افزودن — فقط ادمین */}
        {canManageUsers && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Button
              variant="contained"
              onClick={() => handleOpenDialog()}
              sx={{
                backgroundColor: "#0d47a1",
                color: "white",
                padding: "10px 20px",
                borderRadius: "8px",
                "&:hover": { backgroundColor: "#1565c0" },
              }}
            >
              افزودن کاربر جدید
            </Button>
          </Box>
        )}

        {/* ================= Dialog ================= */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ backgroundColor: "#0d47a1", color: "white" }}>
            {editingUser ? "ویرایش کاربر" : "افزودن کاربر"}
          </DialogTitle>
          <DialogContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 2,
              pt: 2,
            }}
          >
            {/* آواتار */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <Avatar
                  src={avatarPreview || editingUser?.avatar_url}
                  alt={formData.name || "Avatar"}
                  sx={{
                    width: 100,
                    height: 100,
                    cursor: "pointer",
                    margin: "0 auto",
                  }}
                  onClick={() =>
                    document.getElementById("avatar-input").click()
                  }
                >
                  {!avatarPreview && !editingUser?.avatar_url && (
                    <FaUserCircle style={{ fontSize: 80 }} />
                  )}
                </Avatar>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    document.getElementById("avatar-input").click()
                  }
                  sx={{ mt: 1, display: "block", mx: "auto" }}
                >
                  انتخاب عکس
                </Button>
              </Box>
            </Box>

            <TextField
              label="نام"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="ایمیل"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              fullWidth
              required
            />

            <TextField
              label="نمبر تذکره"
              value={formData.tazkira_number}
              onChange={(e) =>
                setFormData({ ...formData, tazkira_number: e.target.value })
              }
              placeholder="مثلاً 1401-1234567"
              fullWidth
              inputProps={{ maxLength: 50 }}
            />

            <TextField
              label={editingUser ? "تغییر پسورد (اختیاری)" : "پسورد"}
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={
                editingUser ? "تکرار پسورد (اختیاری)" : "تکرار پسورد"
              }
              type="password"
              value={formData.password_confirmation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password_confirmation: e.target.value,
                })
              }
              fullWidth
              error={
                formData.password !== formData.password_confirmation &&
                formData.password !== ""
              }
              helperText={
                formData.password !== formData.password_confirmation &&
                formData.password !== ""
                  ? "رمز عبور مطابقت ندارد"
                  : ""
              }
            />

            {/* ✅ نقش — فقط ادمین قابل تغییر است */}
            <FormControl fullWidth disabled={!canManageUsers}>
              <InputLabel>نقش</InputLabel>
              <Select
                value={formData.role}
                label="نقش"
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <MenuItem value="user">User</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
                <MenuItem value="hospital_head">رئیس عمومی شفاخانه</MenuItem>
                {isAdminOrSuper && (
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                )}
              </Select>
            </FormControl>

            {/* ✅ بخش — فقط ادمین قابل تغییر است */}
            <FormControl fullWidth disabled={!canManageUsers}>
              <InputLabel>
                بخش {isDoctorRole ? "*" : "(اختیاری)"}
              </InputLabel>
              <Select
                value={formData.department_id}
                label={`بخش ${isDoctorRole ? "*" : "(اختیاری)"}`}
                onChange={(e) =>
                  setFormData({ ...formData, department_id: e.target.value })
                }
              >
                <MenuItem value="">— انتخاب بخش —</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name} {dept.code ? `(${dept.code})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {isDoctorRole && !formData.department_id && (
              <p style={{ color: "#d32f2f", fontSize: 13, margin: 0 }}>
                برای نقش داکتر، انتخاب بخش الزامی است.
              </p>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>لغو</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={uploading}
              sx={{ backgroundColor: "#0d47a1" }}
            >
              {uploading ? (
                <CircularProgress size={24} />
              ) : editingUser ? (
                "ذخیره تغییرات"
              ) : (
                "افزودن"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </ReportLayout>
  );
}

// ================= استایل‌ها =================
const thStyle = {
  padding: "15px",
  textAlign: "center",
  borderBottom: "2px solid #64b5f6",
};

const tdStyle = {
  padding: "12px",
  textAlign: "center",
};