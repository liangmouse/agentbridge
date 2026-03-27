import { Command } from 'commander'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { isDaemonRunning, writePidFile, getDaemonDir } from '../../daemon/index.js'
import { getAvailableAdapters } from '../../adapters/registry.js'
import { getDb } from '../../store/db.js'
import { getAgentBridgeDbPath } from '../../utils/path.js'
import { WatcherManager } from '../../daemon/watcher-manager.js'

export const startCommand = new Command('start')
  .description('Start the AgentBridge daemon to watch for agent conversation updates')
  .option('--foreground', 'Run in foreground instead of daemonizing')
  .option('--project <path>', 'Project path for the unified store', process.cwd())
  .action(async (options) => {
    if (isDaemonRunning()) {
      console.log('AgentBridge daemon is already running.')
      return
    }

    if (!options.foreground) {
      // Spawn as background process
      const child = spawn(process.execPath, [process.argv[1], 'start', '--foreground', '--project', options.project], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      console.log(`AgentBridge daemon started (PID: ${child.pid})`)
      return
    }

    // Foreground mode: run the daemon directly
    writePidFile()
    console.log(`AgentBridge daemon running (PID: ${process.pid})`)

    const dbPath = getAgentBridgeDbPath(options.project)
    const db = getDb(dbPath)
    const adapters = await getAvailableAdapters()

    console.log(`Detected agents: ${adapters.map((a) => a.name).join(', ') || 'none'}`)

    const watcherManager = new WatcherManager(db, adapters)
    await watcherManager.startAll()

    console.log('Watching for conversation updates... (Ctrl+C to stop)')

    const shutdown = () => {
      console.log('\nShutting down...')
      watcherManager.stopAll()
      const { removePidFile } = require('../../daemon/index.js')
      removePidFile()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  })
