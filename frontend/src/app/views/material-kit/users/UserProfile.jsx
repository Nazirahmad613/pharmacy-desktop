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
import "../../../../components/ReportLayout";

export default function UsersPage() {
  const { user: currentUser, updateUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]); // ✅ بخش‌ها
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    password: "",
    password_confirmation: "",
    avatar: null,
    department_id: "", // ✅
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ✅ فیلترها
  const [filters, setFilters] = useState({
    search: "",
    department_id: "",
    role: "",
  });

  // ================= بررسی دسترسی =================
  const isAdminOrSuper =
    currentUser &&
    ["admin", "super_admin"].includes(
      (currentUser.role || "").toLowerCase()
    );

  // ================= دریافت داده‌ها =================
  useEffect(() => {
    Promise.all([
      api.get("/users"),
      api.get("/roles"),
      api.get("/departments"), // ✅
    ])
      .then(([usersRes, rolesRes, deptsRes]) => {
        setUsers(usersRes.data);
        setRoles(rolesRes.data);
        setDepartments(deptsRes.data.data || deptsRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("❌ خطا در دریافت اطلاعات");
        setLoading(false);
      });
  }, []);

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
  if (currentUser?.role === "hospital_head") {
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

  // ================= Dialog =================
  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.roles?.[0]?.name || "user",
        password: "",
        password_confirmation: "",
        avatar: null,
        department_id: user.department_id || "", // ✅
      });
      setAvatarPreview(user.avatar_url || null);
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        role: "user",
        password: "",
        password_confirmation: "",
        avatar: null,
        department_id: "",
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
    if (formData.password && formData.password !== formData.password_confirmation) {
      toast.error("❌ رمز عبور با تکرار آن مطابقت ندارد");
      return;
    }
    // ✅ اگر داکتر است، بخش الزامی
    if (isDoctorRole && !formData.department_id) {
      toast.error("❌ برای نقش داکتر، انتخاب بخش الزامی است");
      return;
    }

    setUploading(true);

    try {
      // آیا باید از FormData استفاده کنیم؟ (فایل داریم؟)
      const hasFile = formData.avatar instanceof File;

      if (hasFile) {
        // ============ با FormData (آواتار جدید) ============
        const fd = new FormData();
        fd.append("name", formData.name);
        fd.append("email", formData.email);
        fd.append("role", formData.role);

        if (formData.department_id) {
          fd.append("department_id", formData.department_id);
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
        // ============ با JSON (بدون آواتار) ============
        const payload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };

        if (formData.department_id) {
          payload.department_id = formData.department_id;
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

      if (err.response?.status === 422 && err.response.data?.errors) {
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

  // ✅ پردازش نتیجه ذخیره
  const applySaveResult = (res, isEdit) => {
    const savedUser = res.data.user || res.data;

    if (isEdit) {
      setUsers(users.map((u) => (u.id === editingUser.id ? savedUser : u)));
      if (currentUser && currentUser.id === editingUser.id) {
        updateUser(savedUser);
      }
      toast.success("✅ کاربر با موفقیت ویرایش شد");
    } else {
      setUsers([...users, savedUser]);
      toast.success("✅ کاربر با موفقیت اضافه شد");
    }
  };

  // ================= حذف =================
  const handleDelete = (id) => {
    if (window.confirm("آیا مطمئن هستید می‌خواهید این کاربر را حذف کنید؟")) {
      api
        .delete(`/users/${id}`)
        .then(() => {
          setUsers(users.filter((u) => u.id !== id));
          toast.success("✅ کاربر با موفقیت حذف شد");
        })
        .catch((err) => {
          console.error(err);
          toast.error("❌ خطا در حذف کاربر");
        });
    }
  };

  // ================= فیلتر کاربران =================
  const filteredUsers = users.filter((u) => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (
        !u.name?.toLowerCase().includes(s) &&
        !u.email?.toLowerCase().includes(s)
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

        <h1 className="report-title">مدیریت کاربران</h1>

        {/* ================= فیلترها ================= */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="جستجو (نام یا ایمیل)"
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
              <th style={thStyle}>نقش</th>
              {/* ✅ ستون بخش */}
              <th style={thStyle}>بخش</th>
              <th style={thStyle}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
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
              filteredUsers.map((u, index) => (
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
                    <FaKey style={{ marginLeft: 5, color: "#0d47a1" }} />
                  </td>
                  <td style={{ ...tdStyle, color: "#1565c0" }}>{u.email}</td>
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
                  {/* ✅ ستون بخش */}
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
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(u)}
                      sx={{ color: "#0d47a1" }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(u.id)}
                      sx={{ color: "#d32f2f" }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
              label={editingUser ? "تغییر پسورد (اختیاری)" : "پسورد"}
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={editingUser ? "تکرار پسورد (اختیاری)" : "تکرار پسورد"}
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

            {/* نقش */}
            <FormControl fullWidth>
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

            {/* ✅ بخش */}
            <FormControl fullWidth>
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