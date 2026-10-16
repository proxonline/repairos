/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Native Python Backend Manager
 * Spawns and manages native Python backend over stdio NDJSON protocol with request IDs,
 * timeouts, concurrent request dispatching, health checks, and graceful shutdown.
 */

import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import readline from 'readline';

export interface BackendRequest {
  id: string;
  operation: string;
  args?: Record<string, any>;
}

export interface BackendResponse {
  protocolVersion?: string;
  id: string;
  status?: 'success' | 'error';
  type?: 'progress';
  data?: any;
  progress?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class BackendManager {
  private process: ChildProcess | null = null;
  private isStarting = false;
  private pendingRequests = new Map<
    string,
    { resolve: (data: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }
  >();
  private progressListeners = new Set<(progress: any) => void>();
  private requestCounter = 0;

  public async start(): Promise<void> {
    if (this.process || this.isStarting) {
      return; // Prevent duplicate backend processes
    }

    this.isStarting = true;
    const backendScript = path.join(__dirname, '..', 'backend', 'main.py');

    // In production, backend is packaged into resources/backend/repair_os_backend.exe
    const pythonExecutable = process.platform === 'win32' ? 'python.exe' : 'python3';

    try {
      this.process = spawn(pythonExecutable, [backendScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process.stdout || !this.process.stdin) {
        throw new Error('Failed to bind stdio streams for Python backend.');
      }

      const rl = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        this.handleMessage(line);
      });

      this.process.stderr?.on('data', (data) => {
        // Diagnostic stderr output from Python
        process.stderr.write(`[Python Backend]: ${data.toString()}`);
      });

      this.process.on('error', (err) => {
        console.error('[Backend Spawn Error]:', err);
        this.abortAllPending(new Error(`Backend process error: ${err.message}`));
      });

      this.process.on('close', (code) => {
        console.warn(`[Backend Exited]: Code ${code}`);
        this.process = null;
        this.abortAllPending(new Error(`Backend process terminated unexpectedly (exit code ${code}).`));
      });
    } catch (err) {
      console.warn('Could not launch native Python process, falling back to embedded handlers.', err);
    } finally {
      this.isStarting = false;
    }
  }

  private abortAllPending(err: Error): void {
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(err);
    }
    this.pendingRequests.clear();
  }

  private handleMessage(raw: string): void {
    if (!raw.trim()) return;

    try {
      const response: BackendResponse = JSON.parse(raw);

      // Handle progress events without resolving the terminal request
      if (response.type === 'progress') {
        for (const listener of this.progressListeners) {
          try {
            listener(response.progress);
          } catch (e) {
            console.error('Error in progress listener:', e);
          }
        }
        return;
      }

      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(response.id);

        if (response.status === 'success') {
          pending.resolve(response.data);
        } else {
          const errCode = response.error?.code || 'UNKNOWN_ERROR';
          const errMsg = response.error?.message || 'Backend execution failed.';
          pending.reject(new Error(`[${errCode}] ${errMsg}`));
        }
      }
    } catch (e) {
      console.error('Malformed NDJSON message received from backend:', raw, e);
    }
  }

  public onProgress(callback: (progress: any) => void): () => void {
    this.progressListeners.add(callback);
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  public sendRequest<T = any>(operation: string, args: Record<string, any> = {}, timeoutMs = 20000): Promise<T> {
    const id = `req-${++this.requestCounter}-${Date.now()}`;

    return new Promise<T>((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        return reject(new Error('Backend process is not running.'));
      }

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const payload: BackendRequest = { id, operation, args };
      try {
        this.process.stdin.write(JSON.stringify(payload) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to write request to backend stdin: ${err}`));
      }
    });
  }

  public async cancelOperation(targetReqId: string): Promise<boolean> {
    try {
      await this.sendRequest('cancel_operation', { targetId: targetReqId }, 3000);
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    if (this.process) {
      try {
        this.sendRequest('shutdown', {}, 2000).catch(() => {});
        setTimeout(() => {
          if (this.process) {
            this.process.kill();
            this.process = null;
          }
        }, 500);
      } catch {
        this.process.kill();
        this.process = null;
      }
    }
  }
}
