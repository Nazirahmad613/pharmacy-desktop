const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");
const archiver = require('archiver');

let win;
let laravelProcess;

const PHP_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "..", "php", "php.exe")
  : path.join(process.cwd(), "php", "php.exe");

const BACKEND_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "backend")
  : path.join(__dirname, "backend");

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
  
  // بررسی وجود فایل preload
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

  // باز کردن DevTools
  win.webContents.openDevTools();
  
  // تزریق مستقیم API به صفحه (راه حل جایگزین)
  win.webContents.on('did-finish-load', () => {
    console.log("Window loaded, injecting API...");
    
    // تزریق مستقیم API به window
    win.webContents.executeJavaScript(`
      if (!window.electronAPI) {
        window.electronAPI = {
          createBackup: async () => {
            console.log("Direct call to createBackup");
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('create-backup');
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

// فایل main.js - افزودن هندلر جدید برای بازیابی

// ... (بقیه کدهای شما)

// (اینجا کدهای قبلی شما مثل create-backup قرار دارند)

// --- شروع کد جدید برای بازیابی بک‌آپ ---
ipcMain.handle("restore-backup", async (event) => {
  try {
    // 1. باز کردن دیالوگ برای انتخاب فایل بک‌آپ (ZIP)
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

    // 2. پیدا کردن مسیر دیتابیس فعلی (همان مسیری که در create-backup استفاده می‌کنید)
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

    // 3. ایجاد یک بک‌آپ خودکار از دیتابیس فعلی (به عنوان یک نقطه امن)
    const backupDir = path.join(__dirname, "auto_backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    const timestampForAutoBackup = Date.now();
    const autoBackupPath = path.join(backupDir, `database_before_restore_${timestampForAutoBackup}.sqlite`);
    fs.copyFileSync(currentDbPath, autoBackupPath);
    console.log("یک نسخه پشتیبان خودکار از وضعیت فعلی گرفته شد:", autoBackupPath);

    // 4. خواندن فایل ZIP انتخابی و استخراج فایل SQLite از آن
    // در اینجا از کتابخانه 'adm-zip' استفاده می‌کنیم. اگر قبلاً نصب نکردید، باید نصبش کنید:
    // npm install adm-zip
    const AdmZip = require('adm-zip'); 
    const zip = new AdmZip(backupZipPath);
    
    // پیدا کردن فایل SQLite درون ZIP (فرض می‌کنیم یک فایل با پسوند .sqlite در آن هست)
    const zipEntries = zip.getEntries();
    const dbFileInZip = zipEntries.find(entry => entry.entryName.endsWith('.sqlite'));

    if (!dbFileInZip) {
      return { success: false, message: "فایل دیتابیس با فرمت صحیح در بک‌آپ یافت نشد!" };
    }

    // استخراج محتوای فایل دیتابیس از ZIP
    const restoredDbContent = zip.readFile(dbFileInZip.entryName);
    
    // 5. جایگزینی فایل دیتابیس فعلی با فایل جدید
    fs.writeFileSync(currentDbPath, restoredDbContent);
    
    console.log("عملیات بازیابی با موفقیت انجام شد. فایل دیتابیس جایگزین گردید.");
    
    // به کاربر اطلاع بده که نیاز به ریستارت برنامه دارد
    return { 
      success: true, 
      message: "بازیابی با موفقیت انجام شد. لطفاً برنامه را مجدداً راه‌اندازی کنید تا تغییرات اعمال شود." 
    };

  } catch (error) {
    console.error("خطا در فرآیند بازیابی:", error);
    return { success: false, message: `خطا در بازیابی: ${error.message}` };
  }
});
// --- پایان کد جدید ---

// ... (بقیه کدهای شما مانند app.on("window-all-closed", ...))















app.on("window-all-closed", () => {
  if (laravelProcess) laravelProcess.kill();
  app.quit();
});