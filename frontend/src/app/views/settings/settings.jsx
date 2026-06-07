// src/views/settings/Settings.jsx
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    FormControlLabel,
    Button,
    Divider,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Snackbar,
    Grid,
    Avatar,
    IconButton,
    Paper,
    Tab,
    Tabs
} from '@mui/material';
import {
    Save as SaveIcon,
    Language as LanguageIcon,
    DarkMode as DarkModeIcon,
    Notifications as NotificationsIcon,
    Security as SecurityIcon,
    Person as PersonIcon,
    PhotoCamera as PhotoCameraIcon,
    Password as PasswordIcon,
    Delete as DeleteIcon,
    Settings as SettingsIcon,
    Restore as RestoreIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import useSettings from '../../hooks/useSettings';
import useAuth from '../../hooks/useAuth';
import api from '../../../api';

const Settings = () => {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSettings();
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // State for settings
    const [localSettings, setLocalSettings] = useState({
        language: settings?.language || 'fa',
        darkMode: settings?.darkMode || false,
        notifications: settings?.notifications || true,
        compactView: settings?.compactView || false
    });

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || ''
    });

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const handleSettingChange = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleProfileChange = (e) => {
        setProfileData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handlePasswordChange = (e) => {
        setPasswordData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSaveSettings = async () => {
        try {
            localStorage.setItem('app_settings', JSON.stringify(localSettings));
            if (updateSettings) {
                updateSettings(localSettings);
            }
            
            setSnackbar({
                open: true,
                message: 'تنظیمات با موفقیت ذخیره شد',
                severity: 'success'
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'خطا در ذخیره تنظیمات',
                severity: 'error'
            });
        }
    };

    const handleSaveProfile = async () => {
        try {
            const response = await api.put('/user/profile', profileData);
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: 'پروفایل با موفقیت بروزرسانی شد',
                    severity: 'success'
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'خطا در بروزرسانی پروفایل',
                severity: 'error'
            });
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            setSnackbar({
                open: true,
                message: 'رمز عبور جدید و تکرار آن مطابقت ندارند',
                severity: 'error'
            });
            return;
        }

        try {
            const response = await api.post('/user/change-password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: 'رمز عبور با موفقیت تغییر کرد',
                    severity: 'success'
                });
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || 'خطا در تغییر رمز عبور',
                severity: 'error'
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleBackup = async () => {
        try {
            console.log("1. Backup button clicked");
            console.log("2. Checking window.electronAPI:", window.electronAPI);
            
            if (!window.electronAPI) {
                console.log("3. electronAPI not found, trying to create it...");
                
                try {
                    const { ipcRenderer } = require('electron');
                    console.log("4. Got ipcRenderer directly");
                    const result = await ipcRenderer.invoke('create-backup');
                    console.log("5. Backup result:", result);
                    
                    if (result && result.success) {
                        setSnackbar({
                            open: true,
                            message: 'بکاپ با موفقیت ایجاد شد',
                            severity: 'success'
                        });
                    } else {
                        setSnackbar({
                            open: true,
                            message: result?.message || 'خطا در ایجاد بکاپ',
                            severity: 'error'
                        });
                    }
                    return;
                } catch (err) {
                    console.error("Direct ipcRenderer failed:", err);
                }
                
                setSnackbar({
                    open: true,
                    message: 'سیستم بکاپ در دسترس نیست. لطفا برنامه را مجددا اجرا کنید.',
                    severity: 'error'
                });
                return;
            }

            console.log("3. electronAPI found, calling createBackup...");
            const result = await window.electronAPI.createBackup();
            console.log("4. Backup result:", result);

            if (result && result.success) {
                setSnackbar({
                    open: true,
                    message: 'بکاپ با موفقیت ایجاد شد',
                    severity: 'success'
                });
            } else {
                setSnackbar({
                    open: true,
                    message: result?.message || 'خطا در ایجاد بکاپ',
                    severity: 'error'
                });
            }
        } catch (error) {
            console.error('Backup error:', error);
            setSnackbar({
                open: true,
                message: error.message || 'خطا در ارتباط با سیستم بکاپ',
                severity: 'error'
            });
        }
    };

    // تابع جدید برای بازیابی بکاپ
    const handleRestoreBackup = async () => {
        try {
            // تأیید اولیه از کاربر
            const confirmed = window.confirm(
                '⚠️ هشدار مهم!\n\n' +
                'بازیابی بکاپ، تمام اطلاعات فعلی سیستم را با اطلاعات موجود در فایل بکاپ جایگزین خواهد کرد.\n' +
                'پیشنهاد می‌کنیم ابتدا یک بکاپ جدید از وضعیت فعلی بگیرید.\n\n' +
                'آیا از انجام این کار مطمئن هستید؟'
            );
            
            if (!confirmed) {
                console.log("Restore cancelled by user");
                return;
            }
            
            console.log("1. Restore button clicked");
            console.log("2. Checking window.electronAPI:", window.electronAPI);
            
            if (!window.electronAPI) {
                console.log("3. electronAPI not found");
                
                try {
                    const { ipcRenderer } = require('electron');
                    console.log("4. Got ipcRenderer directly for restore");
                    const result = await ipcRenderer.invoke('restore-backup');
                    console.log("5. Restore result:", result);
                    
                    if (result && result.success) {
                        setSnackbar({
                            open: true,
                            message: result.message || 'بازیابی با موفقیت انجام شد',
                            severity: 'success'
                        });
                        
                        // پیشنهاد ریستارت برنامه
                        setTimeout(() => {
                            if (window.confirm('برای اعمال تغییرات، برنامه نیاز به ریستارت دارد. الان ریستارت شود؟')) {
                                window.location.reload();
                            }
                        }, 2000);
                    } else {
                        setSnackbar({
                            open: true,
                            message: result?.message || 'خطا در بازیابی بکاپ',
                            severity: 'error'
                        });
                    }
                    return;
                } catch (err) {
                    console.error("Direct ipcRenderer for restore failed:", err);
                }
                
                setSnackbar({
                    open: true,
                    message: 'سیستم بازیابی در دسترس نیست. لطفا برنامه را مجددا اجرا کنید.',
                    severity: 'error'
                });
                return;
            }
            
            if (!window.electronAPI.restoreBackup) {
                console.error("restoreBackup method not found");
                setSnackbar({
                    open: true,
                    message: 'سیستم بازیابی به درستی تنظیم نشده است.',
                    severity: 'error'
                });
                return;
            }
            
            console.log("3. electronAPI found, calling restoreBackup...");
            const result = await window.electronAPI.restoreBackup();
            console.log("4. Restore result:", result);
            
            if (result && result.success) {
                setSnackbar({
                    open: true,
                    message: result.message || 'بازیابی با موفقیت انجام شد',
                    severity: 'success'
                });
                
                // پیشنهاد ریستارت برنامه
                setTimeout(() => {
                    if (window.confirm('برای اعمال تغییرات، برنامه نیاز به ریستارت دارد. الان ریستارت شود؟')) {
                        window.location.reload();
                    }
                }, 2000);
            } else {
                setSnackbar({
                    open: true,
                    message: result?.message || 'خطا در بازیابی بکاپ',
                    severity: 'error'
                });
            }
        } catch (error) {
            console.error('Restore error:', error);
            setSnackbar({
                open: true,
                message: error.message || 'خطا در ارتباط با سیستم بازیابی',
                severity: 'error'
            });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                {t('settings')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                مدیریت تنظیمات برنامه و پروفایل کاربری
            </Typography>

            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="تنظیمات برنامه" icon={<SettingsIcon />} iconPosition="start" />
                    <Tab label="پروفایل کاربری" icon={<PersonIcon />} iconPosition="start" />
                    <Tab label="تغییر رمز عبور" icon={<PasswordIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            <Grid container spacing={3}>
                {/* تب تنظیمات برنامه */}
                {activeTab === 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <SettingsIcon color="primary" />
                                    <Typography variant="h6">تنظیمات برنامه</Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={localSettings.darkMode}
                                            onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                                        />
                                    }
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <DarkModeIcon fontSize="small" />
                                            <span>حالت تاریک</span>
                                        </Box>
                                    }
                                />
                                <Box sx={{ my: 2 }} />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={localSettings.notifications}
                                            onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                                        />
                                    }
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <NotificationsIcon fontSize="small" />
                                            <span>اعلان‌ها</span>
                                        </Box>
                                    }
                                />
                                <Box sx={{ my: 2 }} />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={localSettings.compactView}
                                            onChange={(e) => handleSettingChange('compactView', e.target.checked)}
                                        />
                                    }
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <span>نمایش فشرده</span>
                                        </Box>
                                    }
                                />
                                <Box sx={{ my: 3 }} />

                                <FormControl fullWidth>
                                    <InputLabel>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <LanguageIcon fontSize="small" />
                                            <span>زبان</span>
                                        </Box>
                                    </InputLabel>
                                    <Select
                                        value={localSettings.language}
                                        onChange={(e) => handleSettingChange('language', e.target.value)}
                                        label="زبان"
                                    >
                                        <MenuItem value="fa">فارسی</MenuItem>
                                        <MenuItem value="en">English</MenuItem>
                                    </Select>
                                </FormControl>

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6" gutterBottom>
                                    پشتیبان‌گیری و بازیابی سیستم
                                </Typography>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    از دیتابیس سیستم نسخه پشتیبان تهیه کنید یا از روی فایل بکاپ قبلی اطلاعات را بازیابی نمایید.
                                </Typography>

                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleBackup}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                >
                                    ایجاد بکاپ
                                </Button>

                                <Button
                                    variant="contained"
                                    color="warning"
                                    onClick={handleRestoreBackup}
                                    fullWidth
                                    startIcon={<RestoreIcon />}
                                    sx={{ mb: 2 }}
                                >
                                    بازیابی از بکاپ
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveSettings}
                                    sx={{ mt: 3 }}
                                    fullWidth
                                >
                                    ذخیره تنظیمات
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* تب پروفایل کاربری */}
                {activeTab === 1 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <PersonIcon color="primary" />
                                    <Typography variant="h6">پروفایل کاربری</Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />

                                <Box display="flex" justifyContent="center" mb={3}>
                                    <Box position="relative">
                                        <Avatar
                                            sx={{ width: 100, height: 100 }}
                                            src={user?.avatar_url}
                                        >
                                            {user?.name?.charAt(0)}
                                        </Avatar>
                                        <IconButton
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                bgcolor: 'primary.main',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                            size="small"
                                        >
                                            <PhotoCameraIcon sx={{ fontSize: 20, color: 'white' }} />
                                        </IconButton>
                                    </Box>
                                </Box>

                                <TextField
                                    fullWidth
                                    label="نام کامل"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleProfileChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="ایمیل"
                                    name="email"
                                    type="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="شماره تلفن"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="آدرس"
                                    name="address"
                                    value={profileData.address}
                                    onChange={handleProfileChange}
                                    margin="normal"
                                    multiline
                                    rows={3}
                                />

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveProfile}
                                    sx={{ mt: 3 }}
                                    fullWidth
                                >
                                    بروزرسانی پروفایل
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* تب تغییر رمز عبور */}
                {activeTab === 2 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <SecurityIcon color="primary" />
                                    <Typography variant="h6">تغییر رمز عبور</Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />

                                <TextField
                                    fullWidth
                                    label="رمز عبور فعلی"
                                    name="current_password"
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={handlePasswordChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="رمز عبور جدید"
                                    name="new_password"
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={handlePasswordChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="تکرار رمز عبور جدید"
                                    name="confirm_password"
                                    type="password"
                                    value={passwordData.confirm_password}
                                    onChange={handlePasswordChange}
                                    margin="normal"
                                />

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={handleChangePassword}
                                    sx={{ mt: 3, mr: 2 }}
                                >
                                    تغییر رمز عبور
                                </Button>

                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={logout}
                                >
                                    خروج از حساب
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Settings;