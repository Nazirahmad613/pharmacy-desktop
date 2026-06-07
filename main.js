const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");
const archiver = require('archiver');
const schedule = require('node-schedule');

let win;
let laravelProcess;
let scheduledBackupJob;

const PHP_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "..", "php", "php.exe")
  : path.join(process.cwd(), "php", "php.exe");

const BACKEND_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "backend")
  : path.join(__dirname, "backend");

// تابع کمکی برای ایجاد بکاپ خودکار (بدون دیالوگ)
async function createAutoBackup() {
  try {
    console.log("🤖 در حال اجرای بکاپ خودکار...");
    
    const possibleDbPaths = [
      path.join(__dirname, "data", "database.sqlite"),
      path.join(__dirname, "database.sqlite"),
      path.join(BACKEND_PATH, "database.sqlite"),
      path.join(BACKEND_PATH, "database", "database.sqlite"),
      path.join(process.cwd(), "database.sqlite")
    ];
    
    let dbPath = null;
    for (const possiblePath of possibleDbPaths) {
      if (fs.existsSync(possiblePath)) {
        dbPath = possiblePath;
        break;
      }
    }
    
    if (!dbPath) {
      console.error("❌ بکاپ خودکار: دیتابیس پیدا نشد");
      return false;
    }
    
    // ایجاد پوشه بکاپ خودکار اگر وجود ندارد
    const autoBackupDir = path.join(__dirname, "auto_backups");
    if (!fs.existsSync(autoBackupDir)) {
      fs.mkdirSync(autoBackupDir, { recursive: true });
    }
    
    // ایجاد نام فایل با تاریخ
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}-${date.getMinutes().toString().padStart(2,'0')}-${date.getSeconds().toString().padStart(2,'0')}`;
    const backupPath = path.join(autoBackupDir, `auto_backup_${timestamp}.zip`);
    
    // ایجاد فایل ZIP
    const output = fs.createWriteStream(backupPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(err);
      });
      
      output.on("close", () => {
        console.log(`✅ بکاپ خودکار با موفقیت ایجاد شد: ${backupPath}`);
        resolve(true);
      });
      
      archive.pipe(output);
      archive.file(dbPath, { name: `database_${timestamp}.sqlite` });
      archive.finalize();
    });
    
  } catch (error) {
    console.error("❌ خطا در بکاپ خودکار:", error);
    return false;
  }
}

// تابع راه‌اندازی زمانبندی بکاپ
function setupAutoBackup() {
  if (scheduledBackupJob) {
    scheduledBackupJob.cancel();
  }
  
  const settingsPath = path.join(__dirname, 'backup_schedule.json');
  let backupSchedule = { enabled: false, dayOfWeek: 0, hour: 2, minute: 0 };
  
  if (fs.existsSync(settingsPath)) {
    try {
      const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      backupSchedule = savedSettings;
    } catch (e) {
      console.error("خطا در خواندن تنظیمات زمانبندی:", e);
    }
  }
  
  if (!backupSchedule.enabled) {
    console.log("⏸️ بکاپ خودکار غیرفعال است");
    return;
  }
  
  const rule = new schedule.RecurrenceRule();
  rule.dayOfWeek = backupSchedule.dayOfWeek;
  rule.hour = backupSchedule.hour;
  rule.minute = backupSchedule.minute;
  rule.second = 0;
  
  scheduledBackupJob = schedule.scheduleJob(rule, async () => {
    console.log(`⏰ زمان بکاپ خودکار رسیده! (${new Date().toLocaleString()})`);
    await createAutoBackup();
  });
  
  const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  console.log(`✅ زمانبندی بکاپ خودکار تنظیم شد: ${days[backupSchedule.dayOfWeek]} ساعت ${backupSchedule.hour}:${backupSchedule.minute}`);
}

function waitForLaravelReady(retries = 40) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get("http://127.0.0.1:8000/api", (res) => {
        resolve(true);
      }).on("error", () => {
        if (retries <= 0) return reject("Laravel failed to start");
        retries--;
        setTimeout(check, 1000);
      });
    };
    check();
  });
}

function startLaravel() {
  laravelProcess = spawn(
    PHP_PATH,
    ["artisan", "serve", "--host=127.0.0.1", "--port=8000"],
    {
      cwd: BACKEND_PATH,
      shell: false
    }
  );

  laravelProcess.stdout.on("data", (data) => {
    console.log("Laravel:", data.toString());
  });

  laravelProcess.stderr.on("data", (data) => {
    console.error("Laravel Error:", data.toString());
  });
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  
  if (!fs.existsSync(preloadPath)) {
    console.error("ERROR: preload.js not found at:", preloadPath);
    process.exit(1);
  }
  
  console.log("Loading preload from:", preloadPath);
  
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    }
  });

  win.webContents.openDevTools();
  
  win.webContents.on('did-finish-load', () => {
    console.log("Window loaded, injecting API...");
    
    win.webContents.executeJavaScript(`
      if (!window.electronAPI) {
        window.electronAPI = {
          createBackup: async () => {
            console.log("Direct call to createBackup");
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('create-backup');
          },
          restoreBackup: async () => {
            console.log("Direct call to restoreBackup");
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('restore-backup');
          },
          setBackupSchedule: async (config) => {
            console.log("Direct call to setBackupSchedule");
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('set-backup-schedule', config);
          },
          getBackupSchedule: async () => {
            console.log("Direct call to getBackupSchedule");
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('get-backup-schedule');
          }
        };
        console.log("API injected directly:", window.electronAPI);
      }
    `).catch(err => console.error("Injection error:", err));
  });

  win.loadFile(path.join(__dirname, "frontend", "dist", "index.html"));
}

app.whenReady().then(async () => {
  console.log("App ready");
  startLaravel();

  try {
    await waitForLaravelReady();
    console.log("Laravel is ready ✅");
    createWindow();
    setupAutoBackup();
  } catch (err) {
    console.error(err);
  }
});

ipcMain.handle("create-backup", async () => {
  try {
    console.log("create-backup handler called");
    
    const possibleDbPaths = [
      path.join(__dirname, "data", "database.sqlite"),
      path.join(__dirname, "database.sqlite"),
      path.join(BACKEND_PATH, "database.sqlite"),
      path.join(BACKEND_PATH, "database", "database.sqlite"),
      path.join(process.cwd(), "database.sqlite")
    ];
    
    let dbPath = null;
    for (const possiblePath of possibleDbPaths) {
      if (fs.existsSync(possiblePath)) {
        dbPath = possiblePath;
        console.log("Database found at:", dbPath);
        break;
      }
    }
    
    if (!dbPath) {
      return {
        success: false,
        message: "فایل دیتابیس پیدا نشد"
      };
    }

    const result = await dialog.showSaveDialog(win, {
      title: "ذخیره بکاپ",
      defaultPath: `backup-${Date.now()}.zip`,
      filters: [{ name: "ZIP Files", extensions: ["zip"] }]
    });

    if (result.canceled) {
      return { success: false, message: "Backup canceled" };
    }

    const output = fs.createWriteStream(result.filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.pipe(output);
    
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}-${date.getMinutes().toString().padStart(2,'0')}-${date.getSeconds().toString().padStart(2,'0')}`;
    
    archive.file(dbPath, { name: `database_${timestamp}.sqlite` });
    await archive.finalize();
    
    await new Promise((resolve) => output.on("finish", resolve));

    return { success: true, file: result.filePath, message: "Backup created successfully" };
  } catch (error) {
    console.error("Backup error:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("restore-backup", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: "انتخاب فایل بک‌آپ برای بازیابی",
      properties: ['openFile'],
      filters: [
        { name: 'فایل‌های بک‌آپ', extensions: ['zip'] },
        { name: 'همه فایل‌ها', extensions: ['*'] }
      ]
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: "عملیات بازیابی لغو شد." };
    }

    const backupZipPath = filePaths[0];
    console.log("فایل بک‌آپ انتخاب شد:", backupZipPath);

    const possibleDbPaths = [
      path.join(__dirname, "data", "database.sqlite"),
      path.join(__dirname, "database.sqlite"),
      path.join(BACKEND_PATH, "database.sqlite"),
      path.join(BACKEND_PATH, "database", "database.sqlite"),
      path.join(process.cwd(), "database.sqlite")
    ];

    let currentDbPath = null;
    for (const possiblePath of possibleDbPaths) {
      if (fs.existsSync(possiblePath)) {
        currentDbPath = possiblePath;
        console.log("دیتابیس فعلی برای جایگزینی پیدا شد:", currentDbPath);
        break;
      }
    }

    if (!currentDbPath) {
      return { success: false, message: "فایل دیتابیس فعلی در سیستم یافت نشد!" };
    }

    const backupDir = path.join(__dirname, "auto_backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    const timestampForAutoBackup = Date.now();
    const autoBackupPath = path.join(backupDir, `database_before_restore_${timestampForAutoBackup}.sqlite`);
    fs.copyFileSync(currentDbPath, autoBackupPath);
    console.log("یک نسخه پشتیبان خودکار از وضعیت فعلی گرفته شد:", autoBackupPath);

    const AdmZip = require('adm-zip'); 
    const zip = new AdmZip(backupZipPath);
    
    const zipEntries = zip.getEntries();
    const dbFileInZip = zipEntries.find(entry => entry.entryName.endsWith('.sqlite'));

    if (!dbFileInZip) {
      return { success: false, message: "فایل دیتابیس با فرمت صحیح در بک‌آپ یافت نشد!" };
    }

    const restoredDbContent = zip.readFile(dbFileInZip.entryName);
    fs.writeFileSync(currentDbPath, restoredDbContent);
    
    console.log("عملیات بازیابی با موفقیت انجام شد.");
    
    return { 
      success: true, 
      message: "بازیابی با موفقیت انجام شد. لطفاً برنامه را مجدداً راه‌اندازی کنید." 
    };

  } catch (error) {
    console.error("خطا در فرآیند بازیابی:", error);
    return { success: false, message: `خطا در بازیابی: ${error.message}` };
  }
});

// هندلرهای جدید برای بکاپ خودکار
ipcMain.handle("set-backup-schedule", async (event, scheduleConfig) => {
  try {
    const { enabled, dayOfWeek, hour, minute } = scheduleConfig;
    
    const settingsPath = path.join(__dirname, 'backup_schedule.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ enabled, dayOfWeek, hour, minute }, null, 2));
    
    if (scheduledBackupJob) {
      scheduledBackupJob.cancel();
      scheduledBackupJob = null;
    }
    
    if (enabled) {
      setupAutoBackup();
    }
    
    return { success: true, message: enabled ? "بکاپ خودکار فعال شد" : "بکاپ خودکار غیرفعال شد" };
  } catch (error) {
    console.error("خطا در تنظیم زمانبندی:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-backup-schedule", async () => {
  try {
    const settingsPath = path.join(__dirname, 'backup_schedule.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { success: true, schedule: settings, enabled: !!scheduledBackupJob };
    }
    return { success: true, schedule: { enabled: false, dayOfWeek: 0, hour: 2, minute: 0 }, enabled: false };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

app.on("window-all-closed", () => {
  if (laravelProcess) laravelProcess.kill();
  app.quit();
});