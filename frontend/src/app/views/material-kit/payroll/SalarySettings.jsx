// src/app/routes/payroll/SalarySettings.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Switch, FormControlLabel, Divider, InputAdornment, Snackbar,
  CircularProgress, Alert, MenuItem,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../../../../api";

const rtlStyles = {
  "& .MuiInputBase-input, & .MuiInputBase-root": { textAlign: "right" },
  "& .MuiSelect-select": { textAlign: "right" },
  "& .MuiFormControlLabel-root": { flexDirection: "row-reverse", marginLeft: 0, marginRight: -11 },
  "& .MuiFormControlLabel-label": { marginRight: 8 },
};

// ✅ مقادیر پیش‌فرض فقط برای اولین رندر
const DEFAULT_SETTINGS = {
  currency: "AFN",
  payDay: 25,
  taxRate: 5,
  insuranceRate: 3,
  overtimeRate: 150,
  lateDeduction: 500,
  absenceDeduction: 2000,
  enableTax: true,
  enableInsurance: true,
  enableOvertime: true,
  autoPayroll: false,
  minSalary: 15000,
  maxAdvancePercent: 50,
};

export default function SalarySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);   // ✅ جدید: آیا از سرور لود شد؟

  const [snackbar, setSnackbar] = useState({
    open: false, msg: "", severity: "success",
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/payroll/settings");

      if (res.data?.success && res.data?.data) {
        // ✅ ادغام امن — هر فیلد با نوع درست
        const raw = res.data.data;

        setSettings({
          currency:          raw.currency ?? "AFN",
          payDay:            toNumber(raw.payDay, 25),
          taxRate:           toNumber(raw.taxRate, 5),
          insuranceRate:     toNumber(raw.insuranceRate, 3),
          overtimeRate:      toNumber(raw.overtimeRate, 150),
          lateDeduction:     toNumber(raw.lateDeduction, 500),
          absenceDeduction:  toNumber(raw.absenceDeduction, 2000),
          enableTax:         toBool(raw.enableTax, true),
          enableInsurance:   toBool(raw.enableInsurance, true),
          enableOvertime:    toBool(raw.enableOvertime, true),
          autoPayroll:       toBool(raw.autoPayroll, false),
          minSalary:         toNumber(raw.minSalary, 15000),
          maxAdvancePercent: toNumber(raw.maxAdvancePercent, 50),
        });

        setLoaded(true);   // ✅ علامت‌گذاری که از سرور لود شد
      } else {
        setError("پاسخ سرور نامعتبر است");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "خطا در دریافت");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ فقط عدد — با تبدیل امن
  const handleNumberChange = (field, rawValue) => {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      handleChange(field, 0);
      return;
    }
    const n = Number(rawValue);
    if (!Number.isNaN(n)) handleChange(field, n);
  };

  const handleSave = async () => {
    if (!loaded) {
      setSnackbar({
        open: true,
        msg: "ابتدا تنظیمات را از سرور بارگذاری کنید (دکمه بازخوانی)",
        severity: "warning",
      });
      return;
    }

    try {
      setSaving(true);

      // ✅ فقط فیلدهایی که واقعاً در فرم هست، با نوع درست
      const payload = {
        currency:          String(settings.currency || "AFN"),
        payDay:            toNumber(settings.payDay, 25),
        taxRate:           toNumber(settings.taxRate, 0),
        insuranceRate:     toNumber(settings.insuranceRate, 0),
        overtimeRate:      toNumber(settings.overtimeRate, 0),
        lateDeduction:     toNumber(settings.lateDeduction, 0),
        absenceDeduction:  toNumber(settings.absenceDeduction, 0),
        enableTax:         Boolean(settings.enableTax),
        enableInsurance:   Boolean(settings.enableInsurance),
        enableOvertime:    Boolean(settings.enableOvertime),
        autoPayroll:       Boolean(settings.autoPayroll),
        minSalary:         toNumber(settings.minSalary, 0),
        maxAdvancePercent: toNumber(settings.maxAdvancePercent, 0),
      };

      // ✅ لاگ دیباگ — بعداً حذف کن
      console.log("📤 Sending settings:", payload);

      const res = await api.put("/payroll/settings", payload);

      if (res.data?.success) {
        setSnackbar({
          open: true,
          msg: res.data.message || "✅ تنظیمات با موفقیت ذخیره شد",
          severity: "success",
        });

        // ✅ دوباره از سرور بخوان تا مطمئن شوی همان چیزی که ذخیره شد، برگردد
        await fetchSettings();
      } else {
        setSnackbar({
          open: true,
          msg: res.data?.message || "خطا در ذخیره",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("❌ Save settings error:", err.response?.data);
      setSnackbar({
        open: true,
        msg: err.response?.data?.message || "خطا در ذخیره",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ p: 3, ...rtlStyles }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">⚙️ تنظیمات معاشات</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchSettings}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3} dir="rtl">
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon color="primary" sx={{ ml: 1 }} />
                <Typography variant="h6">تنظیمات عمومی</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth select label="واحد پول"
                    value={settings.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}>
                    <MenuItem value="AFN">افغانی (؋)</MenuItem>
                    <MenuItem value="USD">دالر ($)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="روز پرداخت معاش" type="number"
                    value={settings.payDay}
                    onChange={(e) => handleNumberChange("payDay", e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="حداقل معاش" type="number"
                    value={settings.minSalary}
                    onChange={(e) => handleNumberChange("minSalary", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="حداکثر پیش‌پرداخت (%)" type="number"
                    value={settings.maxAdvancePercent}
                    onChange={(e) => handleNumberChange("maxAdvancePercent", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>💰 محاسبات معاش</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="نرخ مالیات" type="number"
                    value={settings.taxRate}
                    onChange={(e) => handleNumberChange("taxRate", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="نرخ بیمه" type="number"
                    value={settings.insuranceRate}
                    onChange={(e) => handleNumberChange("insuranceRate", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="نرخ اضافه کاری" type="number"
                    value={settings.overtimeRate}
                    onChange={(e) => handleNumberChange("overtimeRate", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="کسر تأخیر (روزانه)" type="number"
                    value={settings.lateDeduction}
                    onChange={(e) => handleNumberChange("lateDeduction", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="کسر غیابت (روزانه)" type="number"
                    value={settings.absenceDeduction}
                    onChange={(e) => handleNumberChange("absenceDeduction", e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                    }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>🔧 گزینه‌های فعال‌سازی</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { key: "enableTax", label: "فعال‌سازی مالیات" },
                  { key: "enableInsurance", label: "فعال‌سازی بیمه" },
                  { key: "enableOvertime", label: "فعال‌سازی اضافه کاری" },
                  { key: "autoPayroll", label: "پرداخت خودکار معاش" },
                ].map((opt) => (
                  <Grid item xs={12} sm={6} md={3} key={opt.key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(settings[opt.key])}
                          onChange={(e) => handleChange(opt.key, e.target.checked)}
                          color="primary"
                        />
                      }
                      label={opt.label} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="contained" size="large" startIcon={<SaveIcon />}
              onClick={handleSave} disabled={saving || !loaded}>
              {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.msg} />
    </Box>
  );
}

// ============================================================
// ✅ Helpers: تبدیل امن مقادیر
// ============================================================

/**
 * تبدیل مقدار به عدد — اگر مقدار null/undefined/رشته خالی بود، default برگردان
 */
function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === "") return defaultValue;
  const n = Number(value);
  return Number.isNaN(n) ? defaultValue : n;
}

/**
 * ✅ تبدیل مقدار به boolean — رفع باگ `(bool)"false" === true`
 *
 * این تابع تمام حالت‌های ممکن را پوشش می‌دهد:
 * - true / false (boolean) → همان
 * - 1 / 0 (number) → true / false
 * - "true" / "false" (string) → true / false
 * - "1" / "0" (string) → true / false
 * - undefined / null → defaultValue
 * - هر چیز دیگر → Boolean
 */
function toBool(value, defaultValue = false) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off" || s === "") return false;
    return Boolean(value);
  }

  return Boolean(value);
}