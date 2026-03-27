import { Command } from 'commander'
import { isDaemonRunning, getDaemonPid, removePidFile } from '../../daemon/index.js'

export const stopCommand = new Command('stop')
  .description('Stop the AgentBridge daemon')
  .action(() => {
    if (!isDaemonRunning()) {
      console.log('AgentBridge daemon is not running.')
      return
    }

    const pid = getDaemonPid()
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM')
        console.log(`AgentBridge daemon stopped (PID: ${pid})`)
      } catch {
        console.log('Daemon process not found, cleaning up PID file.')
      }
      removePidFile()
    }
  })
