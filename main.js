const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

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
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "frontend", "dist", "index.html"));
}

app.whenReady().then(async () => {
  startLaravel();

  try {
    await waitForLaravelReady();
    console.log("Laravel is ready ✅");
    createWindow();
  } catch (err) {
    console.error(err);
  }
});

app.on("window-all-closed", () => {
  if (laravelProcess) laravelProcess.kill();
  app.quit();
});