import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { Client } from 'ssh2';
import { spawn } from 'child_process';

const JOBS_FILE = path.resolve(__dirname, 'jobs_store.json');
const LOGS_DIR = path.resolve(__dirname, 'logs');

// Map to track active child process / SSH instances by jobId
const activeChildProcesses = new Map();
const activeSshClients = new Map();

// Helper to read jobs store from disk
function readJobsStore() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const content = fs.readFileSync(JOBS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error reading jobs store:", e);
  }
  return [];
}

// Helper to save jobs store to disk
function saveJobsStore(jobs) {
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error saving jobs store:", e);
  }
}

// Ensure local logs directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (e) {}

// Function to trigger REAL SSH execution on Remote Ubuntu Server (192.168.1.105)
function executeJobOnRemoteServer(jobId, envVars) {
  const jobs = readJobsStore();
  const job = jobs.find(j => j.id == jobId);
  if (!job) return;

  const host = envVars.VITE_SSH_HOST || '192.168.1.105';
  const username = envVars.VITE_SSH_USER || 'skts';
  const password = envVars.VITE_SSH_PASS || 'Skts@123';
  const remoteLogPath = job.logPath || `/var/log/truemigrate/job_${jobId}.log`;

  // Local fallback log path on Windows machine for offline UI caching
  const localLogPath = path.resolve(LOGS_DIR, path.basename(remoteLogPath));
  const initHeader = `[${new Date().toLocaleString()}] [INFO] Initiating SSH connection to ${username}@${host}...\n` +
                     `[INFO] Target Command: ${job.command}\n` +
                     `[INFO] Target System: ${job.source}\n` +
                     `[INFO] Remote Log File: ${remoteLogPath}\n` +
                     `--------------------------------------------------------------------------------\n`;
  try { fs.writeFileSync(localLogPath, initHeader, 'utf-8'); } catch (e) {}

  const conn = new Client();
  activeSshClients.set(jobId, conn);

  conn.on('ready', () => {
    const connLog = `[${new Date().toLocaleString()}] [INFO] SSH Connection Established cleanly with ${username}@${host}!\n` +
                    `[INFO] Spawning remote process execution...\n`;
    try { fs.appendFileSync(localLogPath, connLog); } catch (e) {}

    // Execute exact command directly on Ubuntu server after cd'ing to working directory
    let fullRemoteCmd = job.command;
    if (fullRemoteCmd.includes('caseingestion') && !fullRemoteCmd.startsWith('cd')) {
      const jarFolder = "/home/skts/IS Migration/Migration_Tools/CaseMigration";
      fullRemoteCmd = `cd "${jarFolder}" && ${fullRemoteCmd}`;
    }

    // Wrap the command to echo the real PID so we can capture it for kill/pause
    const wrappedCmd = `${fullRemoteCmd} & BGPID=$!; echo "REAL_PID:$BGPID"; wait $BGPID; exit $?`;

    conn.exec(wrappedCmd, { pty: true }, (err, stream) => {
      if (err) {
        const errStr = `[ERROR] SSH exec error: ${err.message}\n`;
        try { fs.appendFileSync(localLogPath, errStr); } catch (e) {}
        conn.end();
        activeSshClients.delete(jobId);
        
        const currentJobs = readJobsStore();
        saveJobsStore(currentJobs.map(j => j.id == jobId ? { ...j, status: 'Failed', processPid: null } : j));
        return;
      }

      // Mark as Running initially; real PID will be captured from stdout
      const updatedJobs = readJobsStore().map(j => {
        if (j.id == jobId) {
          return {
            ...j,
            status: 'Running',
            processPid: null,
            startTime: Date.now()
          };
        }
        return j;
      });
      saveJobsStore(updatedJobs);

      let realPidCaptured = false;

      // Simulate real terminal \r behavior in the log file:
      // - \r alone = overwrite the last progress line (single updating line, like a terminal)
      // - \r\n = normal Windows line ending (safe for all apps)
      // - \n = commit line permanently
      // Uses fs.truncateSync to overwrite the previous progress line in the file,
      // so the React log viewer always sees just ONE progress line that updates.
      let currentLine = '';
      let lastProgressOffset = -1;  // Byte offset where the last \r-progress line starts

      stream.on('data', (data) => {
        const text = data.toString();

        // Capture real PID from our wrapped command output
        if (!realPidCaptured && text.includes('REAL_PID:')) {
          const pidMatch = text.match(/REAL_PID:(\d+)/);
          if (pidMatch) {
            const realPid = parseInt(pidMatch[1], 10);
            realPidCaptured = true;
            const pidLog = `[INFO] Remote Process PID: ${realPid}\n`;
            try { fs.appendFileSync(localLogPath, pidLog); } catch (e) {}
            // Update the stored PID to the real one
            const currentJobs = readJobsStore();
            saveJobsStore(currentJobs.map(j => j.id == jobId ? { ...j, processPid: realPid } : j));
          }
        }

        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === '\n') {
            // Skip the raw REAL_PID: line — we already wrote a formatted version above
            if (currentLine.includes('REAL_PID:')) {
              currentLine = '';
              continue;
            }
            // Newline: commit the current line permanently
            try {
              if (lastProgressOffset >= 0) {
                fs.truncateSync(localLogPath, lastProgressOffset);
              }
              fs.appendFileSync(localLogPath, currentLine + '\n');
              lastProgressOffset = -1;
            } catch (e) {}
            currentLine = '';
          } else if (ch === '\r') {
            // Check if this is \r\n (Windows newline) or standalone \r (carriage return)
            if (i + 1 < text.length && text[i + 1] === '\n') {
              continue;  // \r\n → skip \r, let \n handle it next iteration
            }
            // Standalone \r → overwrite the progress line in the file
            if (currentLine.length > 0) {
              try {
                if (lastProgressOffset >= 0) {
                  fs.truncateSync(localLogPath, lastProgressOffset);
                }
                lastProgressOffset = fs.statSync(localLogPath).size;
                fs.appendFileSync(localLogPath, currentLine + '\n');
              } catch (e) {}
            }
            currentLine = '';
          } else {
            currentLine += ch;
          }
        }
      });

      stream.stderr.on('data', (data) => {
        const text = data.toString();
        try { fs.appendFileSync(localLogPath, text); } catch (e) {}
      });

      stream.on('close', (code) => {
        conn.end();
        activeSshClients.delete(jobId);
        const isSuccess = code === 0;
        const exitMsg = `\n--------------------------------------------------------------------------------\n` +
                        `[${new Date().toLocaleString()}] [INFO] SSH Remote Process exited with code ${code} (${isSuccess ? 'SUCCESS' : 'FAILED'}).\n`;
        try { fs.appendFileSync(localLogPath, exitMsg); } catch (e) {}

        const currentJobs = readJobsStore();
        saveJobsStore(currentJobs.map(j => {
          if (j.id == jobId) {
            return {
              ...j,
              status: isSuccess ? 'Completed' : 'Failed',
              processPid: null,
              duration: `${Math.max(1, Math.floor((Date.now() - (j.startTime || Date.now())) / 1000))}s`
            };
          }
          return j;
        }));
      });
    });

  }).on('error', (err) => {
    activeSshClients.delete(jobId);
    const failMsg = `[${new Date().toLocaleString()}] [ERROR] SSH Connection Error to ${host}: ${err.message}\n` +
                    `[INFO] Falling back to host execution mode...\n`;
    try { fs.appendFileSync(localLogPath, failMsg); } catch (e) {}

    // Fallback: If SSH fails (e.g. server IP unreachable on local network), run via local shell
    executeLocalJobFallback(jobId, localLogPath);
  }).connect({
    host,
    port: 22,
    username,
    password,
    readyTimeout: 10000
  });
}

// Local fallback execution if server SSH is unreachable
function executeLocalJobFallback(jobId, localLogPath) {
  const jobs = readJobsStore();
  const job = jobs.find(j => j.id == jobId);
  if (!job) return;

  try {
    const child = spawn(job.command, { shell: true, cwd: process.cwd() });
    const pid = child.pid;
    activeChildProcesses.set(jobId, child);

    const updatedJobs = readJobsStore().map(j => {
      if (j.id == jobId) {
        return { ...j, status: 'Running', processPid: pid, startTime: Date.now() };
      }
      return j;
    });
    saveJobsStore(updatedJobs);

    child.stdout.on('data', d => fs.appendFileSync(localLogPath, d.toString()));
    child.stderr.on('data', d => fs.appendFileSync(localLogPath, d.toString()));

    child.on('close', code => {
      activeChildProcesses.delete(jobId);
      const isSuccess = code === 0;
      saveJobsStore(readJobsStore().map(j => j.id == jobId ? { ...j, status: isSuccess ? 'Completed' : 'Failed', processPid: null } : j));
    });
  } catch (err) {
    saveJobsStore(readJobsStore().map(j => j.id == jobId ? { ...j, status: 'Failed', processPid: null } : j));
  }
}

export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'real-ssh-jobs-api',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:8080 http://localhost:5173");
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            if (req.url.startsWith('/api/jobs')) {
              const urlObj = new URL(req.url, 'http://localhost:5173');
              const pathname = urlObj.pathname;
              const method = req.method;

              res.setHeader('Content-Type', 'application/json');

              // GET /api/jobs
              if (pathname === '/api/jobs' && method === 'GET') {
                const jobs = readJobsStore();
                res.end(JSON.stringify(jobs));
                return;
              }

              // POST /api/jobs (Create new job)
              if (pathname === '/api/jobs' && method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                  const newJob = JSON.parse(body || '{}');
                  const jobs = readJobsStore();
                  const newId = Date.now();
                  const isAutoStart = newJob.status === 'Running';
                  
                  const created = {
                    id: newId,
                    ...newJob,
                    recordsProcessed: 0,
                    status: isAutoStart ? 'Running' : 'Pending',
                    processPid: null,
                    startTime: isAutoStart ? Date.now() : null,
                    createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
                    createdBy: newJob.createdBy || 'admin'
                  };

                  const newList = [created, ...jobs];
                  saveJobsStore(newList);

                  if (isAutoStart) {
                    setTimeout(() => executeJobOnRemoteServer(newId, envVars), 100);
                  }

                  res.end(JSON.stringify(created));
                });
                return;
              }

              // GET /api/jobs/:id/logs (Read ACTUAL log file from disk / SSH)
              const logsMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/logs$/);
              if (logsMatch && method === 'GET') {
                const jobId = Number(logsMatch[1]) || logsMatch[1];
                const jobs = readJobsStore();
                const targetJob = jobs.find(j => j.id == jobId);

                if (targetJob) {
                  const remotePath = targetJob.logPath;
                  const localPath = path.resolve(LOGS_DIR, path.basename(remotePath || `job_${jobId}.log`));

                  if (fs.existsSync(localPath)) {
                    try {
                      const content = fs.readFileSync(localPath, 'utf-8');
                      const lines = content.split('\n').filter(Boolean);
                      res.end(JSON.stringify(lines));
                      return;
                    } catch (e) {}
                  }

                  res.end(JSON.stringify([
                    `[INFO] Target Command: ${targetJob.command}`,
                    `[INFO] Remote Log Path: ${targetJob.logPath}`,
                    `[INFO] Connecting to SSH stream...`
                  ]));
                  return;
                }

                res.end(JSON.stringify([]));
                return;
              }

              // Helper to send lightweight SSH control commands to Ubuntu server
              const sendRemoteControlCmd = (remoteCmd) => {
                try {
                  const conn = new Client();
                  conn.on('ready', () => {
                    conn.exec(remoteCmd, () => conn.end());
                  }).on('error', () => {}).connect({
                    host: envVars.VITE_SSH_HOST || '192.168.1.102',
                    port: 22,
                    username: envVars.VITE_SSH_USER || 'skts',
                    password: envVars.VITE_SSH_PASS || 'Skts@123',
                    readyTimeout: 5000
                  });
                } catch (e) {}
              };

              // POST /api/jobs/:id/start (Triggers REAL SSH execution or Resumes Paused job)
              const startMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/start$/);
              if (startMatch && method === 'POST') {
                const jobId = Number(startMatch[1]) || startMatch[1];
                const jobs = readJobsStore();
                const targetJob = jobs.find(j => j.id == jobId);

                if (targetJob && targetJob.status === 'Paused' && targetJob.processPid) {
                  sendRemoteControlCmd(`kill -CONT ${targetJob.processPid}`);
                  saveJobsStore(jobs.map(j => j.id == jobId ? { ...j, status: 'Running' } : j));
                } else {
                  executeJobOnRemoteServer(jobId, envVars);
                }
                res.end(JSON.stringify({ success: true }));
                return;
              }

              // POST /api/jobs/:id/stop (Closes SSH connection / kills process on Ubuntu server)
              const stopMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/stop$/);
              if (stopMatch && method === 'POST') {
                const jobId = Number(stopMatch[1]) || stopMatch[1];
                const jobs = readJobsStore();
                const targetJob = jobs.find(j => j.id == jobId);

                // Kill the actual remote Java process using real PID + pkill fallback
                if (targetJob) {
                  const killCmds = [];
                  if (targetJob.processPid) {
                    killCmds.push(`kill -9 ${targetJob.processPid}`);
                  }
                  // Always pkill by jar name pattern as reliable fallback
                  killCmds.push(`pkill -9 -f caseingestion`);
                  sendRemoteControlCmd(killCmds.join('; '));
                }

                // Close the SSH stream connection
                const sshConn = activeSshClients.get(jobId);
                if (sshConn) {
                  try { sshConn.end(); } catch (e) {}
                  activeSshClients.delete(jobId);
                }

                const child = activeChildProcesses.get(jobId);
                if (child) {
                  try { child.kill('SIGTERM'); } catch (e) {}
                  activeChildProcesses.delete(jobId);
                }

                const updated = jobs.map(j => {
                  if (j.id == jobId) {
                    return { ...j, status: 'Failed', processPid: null };
                  }
                  return j;
                });
                saveJobsStore(updated);
                res.end(JSON.stringify({ success: true }));
                return;
              }

              // POST /api/jobs/:id/pause (Sends SIGSTOP to pause process on Ubuntu server)
              const pauseMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/pause$/);
              if (pauseMatch && method === 'POST') {
                const jobId = Number(pauseMatch[1]) || pauseMatch[1];
                const jobs = readJobsStore();
                const targetJob = jobs.find(j => j.id == jobId);

                if (targetJob && targetJob.processPid) {
                  sendRemoteControlCmd(`kill -STOP ${targetJob.processPid}`);
                }

                const updated = jobs.map(j => {
                  if (j.id == jobId) {
                    return { ...j, status: 'Paused' };
                  }
                  return j;
                });
                saveJobsStore(updated);
                res.end(JSON.stringify({ success: true }));
                return;
              }

              // DELETE /api/jobs/:id
              const deleteMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
              if (deleteMatch && method === 'DELETE') {
                const jobId = Number(deleteMatch[1]) || deleteMatch[1];
                const sshConn = activeSshClients.get(jobId);
                if (sshConn) {
                  try { sshConn.end(); } catch (e) {}
                  activeSshClients.delete(jobId);
                }
                const child = activeChildProcesses.get(jobId);
                if (child) {
                  try { child.kill('SIGKILL'); } catch (e) {}
                  activeChildProcesses.delete(jobId);
                }
                const jobs = readJobsStore();
                const targetJob = jobs.find(j => j.id == jobId);
                if (targetJob && targetJob.processPid) {
                  sendRemoteControlCmd(`kill -9 ${targetJob.processPid}`);
                }

                const updated = jobs.filter(j => j.id != jobId);
                saveJobsStore(updated);
                res.end(JSON.stringify({ success: true }));
                return;
              }
            }

            next();
          });
        }
      }
    ],
    server: {
      proxy: {
        '/api_external': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
      },
    },
  };
});
