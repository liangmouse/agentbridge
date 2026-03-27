import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const DAEMON_DIR = resolve(homedir(), '.agentbridge')
const PID_FILE = resolve(DAEMON_DIR, 'daemon.pid')
const LOG_FILE = resolve(DAEMON_DIR, 'daemon.log')

export function getDaemonDir(): string {
  if (!existsSync(DAEMON_DIR)) {
    mkdirSync(DAEMON_DIR, { recursive: true })
  }
  return DAEMON_DIR
}

export function getPidFile(): string {
  return PID_FILE
}

export function getLogFile(): string {
  return LOG_FILE
}

export function isDaemonRunning(): boolean {
  if (!existsSync(PID_FILE)) return false

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10)
    // Check if process exists
    process.kill(pid, 0)
    return true
  } catch {
    // Process doesn't exist, clean up stale PID file
    try { unlinkSync(PID_FILE) } catch {}
    return false
  }
}

export function writePidFile(): void {
  getDaemonDir()
  writeFileSync(PID_FILE, String(process.pid), 'utf-8')
}

export function removePidFile(): void {
  try { unlinkSync(PID_FILE) } catch {}
}

export function getDaemonPid(): number | null {
  if (!existsSync(PID_FILE)) return null
  try {
    return parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10)
  } catch {
    return null
  }
}
