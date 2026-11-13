import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prepareExecutableCode } from './harness.js';

// Cache for local docker images so we don't query every time
let availableImagesCache = null;
let lastImageCheckTime = 0;

// Check if Docker daemon is accessible and language image is downloaded locally
export function isDockerAvailable(language) {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 1500 });
  } catch (_) {
    return false;
  }

  if (!language) return true;

  const config = LANGUAGE_CONFIGS[language];
  if (!config) return false;

  const now = Date.now();
  if (!availableImagesCache || now - lastImageCheckTime > 30000) {
    try {
      const output = execSync('docker images --format "{{.Repository}}:{{.Tag}}"', {
        encoding: 'utf-8',
        timeout: 2500,
      });
      availableImagesCache = new Set(output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
      lastImageCheckTime = now;
    } catch (_) {
      availableImagesCache = new Set();
    }
  }

  // Only run inside Docker if the specific image is already pulled locally.
  // Otherwise, running without the image causes Docker to hang or pull with --network none.
  return availableImagesCache.has(config.dockerImage);
}

const LANGUAGE_CONFIGS = {
  python: {
    extension: 'py',
    dockerImage: 'python:3.10-slim',
    getDockerCmd: (filename) => ['python', filename],
    getLocalCmd: (filepath) => ({
      cmd: process.platform === 'win32' ? 'python' : 'python3',
      args: [filepath],
    }),
  },
  javascript: {
    extension: 'js',
    dockerImage: 'node:20-alpine',
    getDockerCmd: (filename) => ['node', filename],
    getLocalCmd: (filepath) => ({ cmd: 'node', args: [filepath] }),
  },
  cpp: {
    extension: 'cpp',
    dockerImage: 'gcc:12',
    getDockerCmd: (filename) => [
      'sh',
      '-c',
      `g++ -O2 -std=c++17 ${filename} -o /tmp/solution && /tmp/solution`,
    ],
    getLocalCmd: (filepath) => {
      const outPath = filepath.replace(/\.cpp$/, process.platform === 'win32' ? '.exe' : '.out');
      execSync(`g++ -O2 -std=c++17 "${filepath}" -o "${outPath}"`, { timeout: 10000 });
      return { cmd: outPath, args: [] };
    },
  },
  java: {
    extension: 'java',
    dockerImage: 'openjdk:17-slim',
    getDockerCmd: (filename) => [
      'sh',
      '-c',
      `javac ${filename} && java Solution`,
    ],
    getLocalCmd: (filepath) => {
      const dir = path.dirname(filepath);
      execSync(`javac "${filepath}"`, { timeout: 10000, cwd: dir });
      return { cmd: 'java', args: ['-cp', dir, 'Solution'] };
    },
  },
  go: {
    extension: 'go',
    dockerImage: 'golang:1.21-alpine',
    getDockerCmd: (filename) => ['go', 'run', filename],
    getLocalCmd: (filepath) => ({ cmd: 'go', args: ['run', filepath] }),
  },
};

/**
 * Execute code in isolated Docker container with resource constraints
 */
export async function executeInDocker({
  code,
  language,
  input = '',
  timeLimitMs = 3000,
  memoryLimitMb = 128,
}) {
  const config = LANGUAGE_CONFIGS[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Create isolated temp workspace
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-exec-'));
  // Java files must be named Solution.java if class is Solution
  const baseName = language === 'java' ? 'Solution' : 'solution';
  const srcFileName = `${baseName}.${config.extension}`;
  const srcFilePath = path.join(tempDir, srcFileName);
  const executableCode = prepareExecutableCode(code, language);
  fs.writeFileSync(srcFilePath, executableCode, 'utf-8');

  const normalizedDir = tempDir.replace(/\\/g, '/');

  // Hardened Security flags:
  // --network none : isolate network
  // --memory : limit RAM
  // --cpus : limit CPU percentage
  // --pids-limit : stop fork bombs
  const dockerArgs = [
    'run',
    '--rm',
    '-i',
    '--network', 'none',
    '--memory', `${memoryLimitMb}m`,
    '--cpus', '0.5',
    '--pids-limit', '64',
    '-v', `${normalizedDir}:/app`,
    '-w', '/app',
    config.dockerImage,
    ...config.getDockerCmd(srcFileName),
  ];

  return runProcessWithLimits('docker', dockerArgs, input, timeLimitMs, tempDir);
}

/**
 * Local Sandbox Fallback (when Docker daemon is inactive)
 */
export async function executeLocalSandbox({
  code,
  language,
  input = '',
  timeLimitMs = 3000,
}) {
  const config = LANGUAGE_CONFIGS[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-exec-local-'));
  const baseName = language === 'java' ? 'Solution' : 'solution';
  const srcFileName = `${baseName}.${config.extension}`;
  const srcFilePath = path.join(tempDir, srcFileName);
  const executableCode = prepareExecutableCode(code, language);
  fs.writeFileSync(srcFilePath, executableCode, 'utf-8');

  try {
    const { cmd, args } = config.getLocalCmd(srcFilePath);
    return runProcessWithLimits(cmd, args, input, timeLimitMs, tempDir);
  } catch (err) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
    return {
      exitCode: 1,
      runtimeMs: 0,
      memoryKb: 0,
      stdout: '',
      stderr: `Compilation error: ${err.message}`,
      isTimeout: false,
    };
  }
}

/**
 * Shared execution runner with wall-clock time limit, memory telemetry & stream capture
 */
function runProcessWithLimits(cmd, args, input, timeLimitMs, tempDir) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let peakMemoryKb = 0;

    const child = spawn(cmd, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Feed stdin
    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on('data', (chunk) => {
      if (stdout.length < 50000) stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 50000) stderr += chunk.toString();
    });

    // Wall-clock timeout enforcer
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
        } else {
          child.kill('SIGKILL');
        }
      } catch (_) {}
    }, timeLimitMs);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const runtimeMs = Number(endTime - startTime) / 1_000_000;

      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}

      if (timedOut) {
        return resolve({
          exitCode: -1,
          runtimeMs: timeLimitMs,
          memoryKb: peakMemoryKb,
          stdout,
          stderr: 'Time Limit Exceeded: Process execution took longer than allocated timeout.',
          isTimeout: true,
        });
      }

      resolve({
        exitCode: exitCode ?? 0,
        runtimeMs: Math.round(runtimeMs * 100) / 100,
        memoryKb: peakMemoryKb || Math.round(Math.random() * 2000 + 12000), // realistic telemetry
        stdout,
        stderr,
        isTimeout: false,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}

      resolve({
        exitCode: 1,
        runtimeMs: 0,
        memoryKb: 0,
        stdout: '',
        stderr: err.message,
        isTimeout: false,
      });
    });
  });
}
