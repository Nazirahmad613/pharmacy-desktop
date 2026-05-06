import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Avatar,
  Typography,
  Grid,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
} from "@mui/material";
import {
  Save as SaveIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { useAuth } from "../../../contexts/AuthContext";
import api from "../../../../api";
import ReportLayout from "../../../../components/ReportLayout";
import { FaUserCircle, FaKey, FaEnvelope, FaUserTag } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        ...formData,
        name: user.name || "",
        email: user.email || "",
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("❌ حجم عکس نباید بیشتر از 2 مگابایت باشد");
        return;
      }
      if (!file.type.match(/image\/(jpeg|png|jpg|gif)/)) {
        toast.error("❌ فرمت عکس باید JPEG، PNG، JPG یا GIF باشد");
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateProfile = async () => {
    if (!formData.name.trim()) {
      toast.error("❌ نام خود را وارد کنید");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("❌ ایمیل خود را وارد کنید");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);

      if (avatar instanceof File) {
        formDataToSend.append("avatar", avatar);
      }

      if (formData.new_password) {
        if (formData.new_password.length < 6) {
          toast.error("❌ رمز عبور جدید باید حداقل 6 کاراکتر باشد");
          setLoading(false);
          return;
        }
        if (formData.new_password !== formData.new_password_confirmation) {
          toast.error("❌ رمز عبور جدید با تکرار آن مطابقت ندارد");
          setLoading(false);
          return;
        }
        if (!formData.current_password) {
          toast.error("❌ برای تغییر رمز عبور، رمز فعلی را وارد کنید");
          setLoading(false);
          return;
        }
        formDataToSend.append("current_password", formData.current_password);
        formDataToSend.append("new_password", formData.new_password);
      }

      formDataToSend.append("_method", "PUT");

   const token = localStorage.getItem("token");

const res = await api.post(`/profile`, formDataToSend, {
  headers: {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${token}`,
  },
});

      const updatedUser = res.data.user || res.data;
      updateUser(updatedUser);

      setFormData({
        ...formData,
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });

      setEditing(false);
      toast.success("✅ پروفایل با موفقیت به‌روزرسانی شد");
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "خطا در به‌روزرسانی پروفایل";
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      ...formData,
      name: user?.name || "",
      email: user?.email || "",
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    });
    setAvatar(null);
    setAvatarPreview(user?.avatar_url || null);
  };

  return (
    <ReportLayout>
<ToastContainer
  position="top-left"
  autoClose={1500}
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
    position: 'fixed',
    top: '20px',
    left: '20px',
    right: 'auto',
    width: 'auto',
    maxWidth: '350px',
    transform: 'none'
  }}
/>
      <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            {/* هدر */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                پروفایل کاربری
              </Typography>
              <Divider sx={{ my: 2 }} />
            </Box>

            {/* عکس پروفایل */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={avatarPreview}
                  alt={user?.name}
                  sx={{
                    width: 150,
                    height: 150,
                    cursor: editing ? "pointer" : "default",
                    border: "3px solid",
                    borderColor: "primary.main",
                  }}
                  onClick={() => editing && document.getElementById("avatar-input").click()}
                >
                  {!avatarPreview && <FaUserCircle style={{ fontSize: 100 }} />}
                </Avatar>
                {editing && (
                  <>
                    <input
                      id="avatar-input"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarChange}
                    />
                    <IconButton
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        bgcolor: "primary.main",
                        color: "white",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                      onClick={() => document.getElementById("avatar-input").click()}
                    >
                      <PhotoCameraIcon />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>

            {/* فرم اطلاعات */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="نام کامل"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FaUserTag />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ایمیل"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FaEnvelope />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {editing && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        تغییر رمز عبور (اختیاری)
                      </Typography>
                    </Divider>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="رمز عبور فعلی"
                      name="current_password"
                      type={showPassword ? "text" : "password"}
                      value={formData.current_password}
                      onChange={handleInputChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FaKey />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="رمز عبور جدید"
                      name="new_password"
                      type={showPassword ? "text" : "password"}
                      value={formData.new_password}
                      onChange={handleInputChange}
                      helperText="حداقل 6 کاراکتر"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="تکرار رمز عبور جدید"
                      name="new_password_confirmation"
                      type={showPassword ? "text" : "password"}
                      value={formData.new_password_confirmation}
                      onChange={handleInputChange}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  {!editing ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<EditIcon />}
                      onClick={() => setEditing(true)}
                    >
                      ویرایش پروفایل
                    </Button>
                  ) : (
                    <>
                      <Button variant="outlined" color="error" onClick={handleCancel} disabled={loading}>
                        انصراف
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                        onClick={handleUpdateProfile}
                        disabled={loading}
                      >
                        {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
                      </Button>
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* اطلاعات اضافی */}
            <Box sx={{ mt: 4, p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                اطلاعات حساب کاربری
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    نقش:
                  </Typography>
                  <Typography variant="body1">
                    {user?.roles?.map(r => r.name).join(", ") || "کاربر عادی"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    تاریخ عضویت:
                  </Typography>
                  <Typography variant="body1">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString("fa-IR") : "نامشخص"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </ReportLayout>
  );
}