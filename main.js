const { app, BrowserWindow } = require("electron");
const { exec } = require("child_process");
const path = require("path");

let win;
let laravelProcess;

function startLaravel() {
  const phpPath = path.join(__dirname, "php", "php.exe");
  const backendPath = path.join(__dirname, "backend");

  laravelProcess = exec(
    `"${phpPath}" artisan serve --host=127.0.0.1 --port=8000`,
    { cwd: backendPath }
  );
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  // React build
  win.loadFile(
    path.join(__dirname, "frontend", "dist", "index.html")
  );
}

app.whenReady().then(() => {
  startLaravel();

  setTimeout(() => {
    createWindow();
  }, 3000); // صبر برای بالا آمدن Laravel
});

app.on("window-all-closed", () => {
  if (laravelProcess) laravelProcess.kill();
  app.quit();
});