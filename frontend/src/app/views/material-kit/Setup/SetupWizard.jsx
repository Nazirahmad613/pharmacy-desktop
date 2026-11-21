// app/pages/Setup/SetupWizard.jsx
import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  Collapse,
  IconButton,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AppsIcon from "@mui/icons-material/Apps";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useNavigate } from "react-router-dom";
import { useAuth } from "app/contexts/AuthContext";
import {
  AVAILABLE_MODULES,
  MODULE_GROUPS,
  DEFAULT_MODULES,
} from "app/constants/modules";

export default function SetupWizard() {
  const { api, setHospitalSettings } = useAuth();
  const navigate = useNavigate();

  const [hospitalName, setHospitalName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedModules, setSelectedModules] = useState(DEFAULT_MODULES);
  const [openGroups, setOpenGroups] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const toggleModule = (key) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const selectAllInGroup = (group) => {
    const keys = MODULE_GROUPS[group].map((m) => m.key);
    setSelectedModules((prev) => Array.from(new Set([...prev, ...keys])));
  };

  const deselectAllInGroup = (group) => {
    const keys = MODULE_GROUPS[group].map((m) => m.key);
    setSelectedModules((prev) => prev.filter((k) => !keys.includes(k)));
  };

  const toggleAll = () => {
    if (selectedModules.length === AVAILABLE_MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(AVAILABLE_MODULES.map((m) => m.key));
    }
  };

  const canSubmit =
    hospitalName.trim().length >= 2 && selectedModules.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("hospital_name", hospitalName.trim());
      if (logoFile) formData.append("hospital_logo", logoFile);
      selectedModules.forEach((m) => formData.append("enabled_modules[]", m));

      const res = await api.post("/hospital-settings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setHospitalSettings?.({
        hospital_name: res.data.setting.hospital_name,
        enabled_modules: res.data.setting.enabled_modules,
        logo_url: res.data.logo_url,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          "خطا در ذخیره تنظیمات. لطفاً دوباره تلاش کنید."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        py: { xs: 3, md: 6 },
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 860, mx: "auto" }}>
        {/* هدر */}
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "18px",
              bgcolor: "#eff6ff",
              border: "1px solid #dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1d4ed8",
            }}
          >
            <LocalHospitalIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
            خوش آمدید! تنظیمات اولیه شفاخانه
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748b", textAlign: "center", maxWidth: 520 }}
          >
            لطفاً نام، لوگو و ماژول‌های مورد نیاز شفاخانه خود را انتخاب کنید.
            این تنظیمات فقط یک بار ثبت می‌شود.
          </Typography>
        </Stack>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
            {errorMsg}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          {/* نام شفاخانه */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            نام شفاخانه
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="مثلاً: شفاخانه حوزوی کابل"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
          />

          {/* لوگو */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            لوگوی شفاخانه
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Avatar
              src={logoPreview || undefined}
              variant="rounded"
              sx={{
                width: 80,
                height: 80,
                bgcolor: "#f1f5f9",
                border: "2px dashed #cbd5e1",
                color: "#94a3b8",
              }}
            >
              <LocalHospitalIcon />
            </Avatar>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{
                borderRadius: "10px",
                borderColor: "#cbd5e1",
                color: "#334155",
              }}
            >
              انتخاب لوگو
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoChange}
              />
            </Button>
            {logoFile && (
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                {logoFile.name}
              </Typography>
            )}
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* ماژول‌ها */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
            flexWrap="wrap"
            gap={1}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <AppsIcon sx={{ color: "#1d4ed8" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                ماژول‌های ضروری
              </Typography>
              <Chip
                label={`${selectedModules.length} از ${AVAILABLE_MODULES.length}`}
                size="small"
                sx={{ bgcolor: "#eff6ff", color: "#1d4ed8" }}
              />
            </Stack>

            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={toggleAll}
              sx={{ fontWeight: 600 }}
            >
              {selectedModules.length === AVAILABLE_MODULES.length
                ? "لغو انتخاب همه"
                : "انتخاب همه"}
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            فقط بخش‌هایی که شفاخانه شما به آن نیاز دارد را انتخاب کنید. بعداً
            از بخش تنظیمات قابل تغییر است.
          </Typography>

          {/* گروه‌بندی ماژول‌ها */}
          <Stack spacing={1.5}>
            {Object.entries(MODULE_GROUPS).map(([group, mods]) => {
              const isOpen = openGroups[group] !== false; // پیش‌فرض باز
              const selectedCount = mods.filter((m) =>
                selectedModules.includes(m.key)
              ).length;

              return (
                <Box
                  key={group}
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    bgcolor: "#ffffff",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 1.8,
                      py: 1.2,
                      bgcolor: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleGroup(group)}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton size="small">
                        {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "#334155" }}
                      >
                        {group}
                      </Typography>
                      <Chip
                        label={`${selectedCount}/${mods.length}`}
                        size="small"
                        sx={{
                          bgcolor: selectedCount > 0 ? "#eff6ff" : "#f1f5f9",
                          color: selectedCount > 0 ? "#1d4ed8" : "#64748b",
                          fontSize: "0.72rem",
                          height: 22,
                        }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllInGroup(group);
                        }}
                        sx={{ fontSize: "0.72rem", minWidth: "auto" }}
                      >
                        همه
                      </Button>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deselectAllInGroup(group);
                        }}
                        sx={{
                          fontSize: "0.72rem",
                          minWidth: "auto",
                          color: "#64748b",
                        }}
                      >
                        هیچ‌کدام
                      </Button>
                    </Stack>
                  </Box>

                  <Collapse in={isOpen}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr 1fr",
                          sm: "repeat(3, 1fr)",
                        },
                        gap: 1,
                        p: 1.5,
                      }}
                    >
                      {mods.map((mod) => {
                        const active = selectedModules.includes(mod.key);
                        return (
                          <Box
                            key={mod.key}
                            onClick={() => toggleModule(mod.key)}
                            sx={{
                              cursor: "pointer",
                              userSelect: "none",
                              p: 1.2,
                              borderRadius: "9px",
                              border: active
                                ? "1.5px solid #1d4ed8"
                                : "1px solid #e2e8f0",
                              bgcolor: active ? "#eff6ff" : "#ffffff",
                              color: active ? "#1d4ed8" : "#334155",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.8,
                              transition: "all 0.15s ease",
                              "&:hover": { borderColor: "#94a3b8" },
                            }}
                          >
                            {active ? (
                              <CheckCircleIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  border: "1.5px solid #cbd5e1",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.8rem",
                                lineHeight: 1.3,
                              }}
                            >
                              {mod.label}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Button
            fullWidth
            variant="contained"
            disableElevation
            disabled={!canSubmit || loading}
            onClick={handleSubmit}
            sx={{
              borderRadius: "10px",
              py: 1.4,
              fontWeight: 700,
              bgcolor: "#1e3a8a",
              "&:hover": { bgcolor: "#172554" },
            }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : (
              "ذخیره و ورود به سیستم"
            )}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}