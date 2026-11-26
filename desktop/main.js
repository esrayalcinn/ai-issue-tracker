const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const ICON_PATH = path.join(FRONTEND_DIR, "public", "mascot", "cat-idle.png");

const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3050;
const WIDGET_URL = `http://localhost:${FRONTEND_PORT}/widget?desktop=1`;
const BOARD_URL = `http://localhost:${FRONTEND_PORT}`;

const WIN_WIDTH = 380;
const WIN_HEIGHT = 600;

let mainWindow = null;
let tray = null;
let alwaysOnTop = true;
let lastIgnoreMouse = null;
const spawnedChildren = [];

function stripNativeCaption(win) {
  if (process.platform !== "win32") return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const buf = win.getNativeWindowHandle();
      const hwnd =
        buf.length >= 8 ? buf.readBigUInt64LE(0).toString() : buf.readUInt32LE(0).toString();
      const psScript = [
        'Add-Type -TypeDefinition @"',
        "using System;",
        "using System.Runtime.InteropServices;",
        "public class WinStyle {",
        '  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")]',
        "  public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);",
        '  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")]',
        "  public static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong);",
        '  [DllImport("user32.dll")]',
        "  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);",
        "}",
        '"@',
        `$h = [IntPtr]::new([Int64]${hwnd})`,
        "$style = [WinStyle]::GetWindowLongPtr($h, -16).ToInt64()",
        "$clean = $style -band (-bnot 0x00C40000)",
        "[WinStyle]::SetWindowLongPtr($h, -16, [IntPtr]::new($clean)) | Out-Null",
        "[WinStyle]::SetWindowPos($h, [IntPtr]::Zero, 0, 0, 0, 0, 0x0027) | Out-Null",
      ].join("\n");
      const encoded = Buffer.from(psScript, "utf16le").toString("base64");
      const ps = spawn("powershell.exe", ["-NoProfile", "-EncodedCommand", encoded], {
        windowsHide: true,
        stdio: "ignore",
      });
      ps.on("exit", () => resolve());
      ps.on("error", () => resolve());
    } catch {
      resolve();
    }
  });
}

function getPosFile() {
  return path.join(app.getPath("userData"), "mavis-position.json");
}

function loadSavedPosition() {
  try {
    const raw = fs.readFileSync(getPosFile(), "utf-8");
    const pos = JSON.parse(raw);
    if (typeof pos.x === "number" && typeof pos.y === "number") {
      return pos;
    }
  } catch {
    // ignore if not saved yet
  }
  return null;
}

function savePosition(x, y) {
  try {
    fs.writeFileSync(getPosFile(), JSON.stringify({ x, y }), "utf-8");
  } catch {
    // ignore write failures
  }
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureServersRunning() {
  if (!(await isPortOpen(BACKEND_PORT))) {
    const backend = spawn("uv", ["run", "uvicorn", "app.main:app", "--port", String(BACKEND_PORT)], {
      cwd: BACKEND_DIR,
      windowsHide: true,
      stdio: "ignore",
    });
    spawnedChildren.push(backend);
  }

  if (!(await isPortOpen(FRONTEND_PORT))) {
    const frontend = spawn("cmd.exe", ["/c", `npm run dev -- -p ${FRONTEND_PORT}`], {
      cwd: FRONTEND_DIR,
      windowsHide: true,
      stdio: "ignore",
    });
    spawnedChildren.push(frontend);
  }

  await waitForPort(FRONTEND_PORT);
}

function placeInCorner(win, corner = "bottom-right") {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  let targetX = x + width - WIN_WIDTH - 8;
  let targetY = y + height - WIN_HEIGHT - 4;
  if (corner === "bottom-left") {
    targetX = x + 8;
  } else if (corner === "top-right") {
    targetY = y + 8;
  }
  const rx = Math.round(targetX);
  const ry = Math.round(targetY);
  win.setBounds({ x: rx, y: ry, width: WIN_WIDTH, height: WIN_HEIGHT });
  savePosition(rx, ry);
}

function toggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.showInactive();
  }
  refreshTrayMenu();
}

function createWindow() {
  const saved = loadSavedPosition();
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  const startX = saved ? Math.round(saved.x) : Math.round(x + width - WIN_WIDTH - 8);
  const startY = saved ? Math.round(saved.y) : Math.round(y + height - WIN_HEIGHT - 4);

  mainWindow = new BrowserWindow({
    x: startX,
    y: startY,
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    title: "",
    show: false,
    transparent: true,
    frame: false,
    thickFrame: false,
    roundedCorners: false,
    autoHideMenuBar: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    useContentSize: true,
    alwaysOnTop,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.removeMenu();
  lastIgnoreMouse = true;
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Prevent Electron from calling Win32 SetWindowText
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  // Strip Win32 WS_CAPTION + WS_THICKFRAME before revealing so Windows can never paint a ghost titlebar
  mainWindow.webContents.once("did-finish-load", async () => {
    await stripNativeCaption(mainWindow);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.showInactive();
      }
    }, 100);
  });

  mainWindow.loadURL(WIDGET_URL);
}

function refreshTrayMenu() {
  if (!tray) return;
  const isVisible = mainWindow ? mainWindow.isVisible() : false;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: isVisible ? "Hide Maviş (Ctrl+Shift+M)" : "Show Maviş (Ctrl+Shift+M)",
        click: toggleVisibility,
      },
      {
        label: "Open Issue Notebook",
        click: () => shell.openExternal(BOARD_URL),
      },
      { type: "separator" },
      {
        label: "Move to Bottom Right",
        click: () => mainWindow && placeInCorner(mainWindow, "bottom-right"),
      },
      {
        label: "Move to Bottom Left",
        click: () => mainWindow && placeInCorner(mainWindow, "bottom-left"),
      },
      {
        label: "Always on Top",
        type: "checkbox",
        checked: alwaysOnTop,
        click: (item) => {
          alwaysOnTop = item.checked;
          if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop);
        },
      },
      { type: "separator" },
      {
        label: "Quit Maviş",
        click: () => app.quit(),
      },
    ]),
  );
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("Maviş — click to show/hide");
  refreshTrayMenu();
  tray.on("click", toggleVisibility);
}

ipcMain.on("pet:set-ignore-mouse", (_event, ignore) => {
  if (!mainWindow || lastIgnoreMouse === ignore) return;
  lastIgnoreMouse = ignore;
  mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on("pet:move-by", (_event, dx, dy) => {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const nextX = Math.round(bounds.x + Number(dx || 0));
  const nextY = Math.round(bounds.y + Number(dy || 0));
  mainWindow.setBounds({ x: nextX, y: nextY, width: WIN_WIDTH, height: WIN_HEIGHT });
  savePosition(nextX, nextY);
});

ipcMain.on("pet:hide", () => {
  if (!mainWindow) return;
  mainWindow.hide();
  refreshTrayMenu();
});

ipcMain.on("pet:open-board", () => {
  shell.openExternal(BOARD_URL);
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    await ensureServersRunning();
    createWindow();
    createTray();

    globalShortcut.register("CommandOrControl+Shift+M", toggleVisibility);
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("before-quit", () => {
    for (const child of spawnedChildren) {
      if (child && child.pid) {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
      }
    }
  });
}
