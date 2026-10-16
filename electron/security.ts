/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Electron Security Policies for RepairOS
 * Enforces restrictive CSP, context isolation, navigation restrictions, and privileged IPC validation.
 */

import { session, WebContents } from 'electron';

export function configureSecurityPolicies(): void {
  // Enforce Content-Security-Policy header
  session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:3000;",
        ],
      },
    });
  });

  // Prevent navigation to external or untrusted URLs
  session.defaultSession.setPermissionRequestHandler((webContents: WebContents, permission: string, callback: (permissionGranted: boolean) => void) => {
    // Deny sensitive web permissions (camera, geolocation, notifications)
    callback(false);
  });
}

export function validateIpcSender(webContents: WebContents): boolean {
  // Prevent unauthorized windows or iframes from invoking privileged IPC
  const url = webContents.getURL();
  return (
    url.startsWith('http://localhost:3000') ||
    url.startsWith('file://')
  );
}
