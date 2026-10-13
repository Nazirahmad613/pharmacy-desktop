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
import api from "app/api";

export default function SalarySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [settings, setSettings] = useState({
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
  });

  const [snackbar, setSnackbar] = useState({
    open: false, msg: "", severity: "success",
  });

  // ============================================================
  // ✅ دریافت تنظیمات
  // ============================================================
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/payroll/settings");

      if (res.data?.success) {
        setSettings((prev) => ({ ...prev, ...res.data.data }));
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

  // ============================================================
  // ✅ ذخیره تنظیمات
  // ============================================================
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put("/payroll/settings", settings);

      if (res.data?.success) {
        setSnackbar({
          open: true,
          msg: res.data.message || "✅ تنظیمات با موفقیت ذخیره شد",
          severity: "success",
        });
        if (res.data.data) {
          setSettings((prev) => ({ ...prev, ...res.data.data }));
        }
      }
    } catch (err) {
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
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">⚙️ تنظیمات معاشات</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchSettings}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* تنظیمات عمومی */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon color="primary" sx={{ mr: 1 }} />
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
                    onChange={(e) => handleChange("payDay", Number(e.target.value))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="حداقل معاش" type="number"
                    value={settings.minSalary}
                    onChange={(e) => handleChange("minSalary", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="حداکثر پیش‌پرداخت (%)" type="number"
                    value={settings.maxAdvancePercent}
                    onChange={(e) => handleChange("maxAdvancePercent", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* محاسبات */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>💰 محاسبات معاش</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="نرخ مالیات" type="number"
                    value={settings.taxRate}
                    onChange={(e) => handleChange("taxRate", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="نرخ بیمه" type="number"
                    value={settings.insuranceRate}
                    onChange={(e) => handleChange("insuranceRate", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="نرخ اضافه کاری" type="number"
                    value={settings.overtimeRate}
                    onChange={(e) => handleChange("overtimeRate", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="کسر تأخیر (روزانه)" type="number"
                    value={settings.lateDeduction}
                    onChange={(e) => handleChange("lateDeduction", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                    }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="کسر غیابت (روزانه)" type="number"
                    value={settings.absenceDeduction}
                    onChange={(e) => handleChange("absenceDeduction", Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                    }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* گزینه‌های فعال‌سازی */}
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
                        <Switch checked={!!settings[opt.key]}
                          onChange={(e) => handleChange(opt.key, e.target.checked)}
                          color="primary" />
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
              onClick={handleSave} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.msg} />
    </Box>
  );
}