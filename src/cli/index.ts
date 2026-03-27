import { Command } from 'commander'
import { registerDefaultAdapters } from '../adapters/registry.js'
import { startCommand } from './commands/start.js'
import { stopCommand } from './commands/stop.js'
import { syncCommand } from './commands/sync.js'
import { listCommand } from './commands/list.js'
import { showCommand } from './commands/show.js'
import { timelineCommand } from './commands/timeline.js'
import { statusCommand } from './commands/status.js'

const program = new Command()

program
  .name('agentbridge')
  .description('Cross-agent conversation sync - share history between Claude Code, OpenCode, and Codex')
  .version('0.1.0')

program.addCommand(startCommand)
program.addCommand(stopCommand)
program.addCommand(syncCommand)
program.addCommand(listCommand)
program.addCommand(showCommand)
program.addCommand(timelineCommand)
program.addCommand(statusCommand)

registerDefaultAdapters()
program.parse()
