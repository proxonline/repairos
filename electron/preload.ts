/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Secure Electron Preload Bridge
 * Context isolation enabled; exposes strictly typed, scoped IPC methods.
 */

import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_CHANNELS = new Set([
  'backend:health',
  'system:overview',
  'system:processes',
  'storage:volumes',
  'storage:scan-dir',
  'storage:cancel-scan',
  'startup:list',
  'startup:toggle',
  'events:query',
  'diagnostics:run-all',
  'repairs:execute',
]);

contextBridge.exposeInMainWorld('repairOSBridge', {
  isDesktop: true,

  invoke: (channel: string, payload?: any) => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, payload);
  },

  onProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('storage:scan-progress', subscription);
    return () => {
      ipcRenderer.removeListener('storage:scan-progress', subscription);
    };
  },
});
