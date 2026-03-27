import { createReadStream } from 'node:fs'
import { appendFile, readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'

export async function* readJsonl<T>(filePath: string): AsyncIterable<T> {
  const stream = createReadStream(filePath, { encoding: 'utf-8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      yield JSON.parse(trimmed) as T
    } catch {
      // skip malformed lines
    }
  }
}

export async function readJsonlSync<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, 'utf-8')
  const results: T[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      results.push(JSON.parse(trimmed) as T)
    } catch {
      // skip malformed lines
    }
  }
  return results
}

export async function appendJsonl(filePath: string, data: unknown): Promise<void> {
  await appendFile(filePath, JSON.stringify(data) + '\n', 'utf-8')
}
