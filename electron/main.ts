/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Electron Main Process
 * Manages desktop window lifecycle, security policies, and IPC routing.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { configureSecurityPolicies, validateIpcSender } from './security';
import { BackendManager } from './backendManager';

let mainWindow: BrowserWindow | null = null;
const backendManager = new BackendManager();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#09090b',
    title: 'RepairOS Workstation',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = 'http://localhost:3000';
  mainWindow.loadURL(devUrl).catch(() => {
    mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  configureSecurityPolicies();
  await backendManager.start();

  // Register privileged IPC handlers
  ipcMain.handle('backend:health', async (event) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('health');
  });

  ipcMain.handle('system:overview', async (event) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('get_system_overview');
  });

  ipcMain.handle('system:processes', async (event) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('get_processes');
  });

  ipcMain.handle('storage:volumes', async (event) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('get_volumes');
  });

  ipcMain.handle('storage:scan-dir', async (event, args: any) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    const pathStr = typeof args?.path === 'string' ? args.path : '';
    const unsubscribe = backendManager.onProgress((p) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('storage:scan-progress', p);
      }
    });
    try {
      return await backendManager.sendRequest('scan_directory', { path: pathStr }, 60000);
    } finally {
      unsubscribe();
    }
  });

  ipcMain.handle('storage:cancel-scan', async (event) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('cancel_operation', {});
  });

  ipcMain.handle('startup:list', async (event) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('get_startup_entries');
  });

  ipcMain.handle('startup:toggle', async (event, args: any) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    const id = String(args?.id || '');
    const isEnabled = Boolean(args?.isEnabled);
    return backendManager.sendRequest('toggle_startup_entry', { id, enable: isEnabled });
  });

  ipcMain.handle('events:query', async (event, args: any) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('query_event_logs', args || {});
  });

  ipcMain.handle('diagnostics:run-all', async (event, args: any) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('run_diagnostics', args || {});
  });

  ipcMain.handle('repairs:execute', async (event, args: any) => {
    if (!validateIpcSender(event.sender)) throw new Error('Unauthorized');
    return backendManager.sendRequest('execute_repair', args);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  backendManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
