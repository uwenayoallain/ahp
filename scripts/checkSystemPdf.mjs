import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function main() {
  const repoRoot = process.cwd()

  const currentMd = await readFile('system.md', 'utf8')
  const currentHash = createHash('sha256').update(currentMd).digest('hex')

  let committedMd
  try {
    const { stdout } = await execFileAsync('git', ['show', 'HEAD:system.md'], {
      cwd: repoRoot,
    })
    committedMd = stdout
  } catch {
    process.stderr.write(
      'system.md not found in HEAD. Commit system.md before pushing.\n',
    )
    process.exitCode = 1
    return
  }

  const committedHash = createHash('sha256').update(committedMd).digest('hex')

  if (currentHash !== committedHash) {
    process.stderr.write(
      'system.md has uncommitted changes. Run `pnpm generate:system-pdf`, review the result, and commit both system.md and system.pdf before pushing.\n',
    )
    process.exitCode = 1
    return
  }

  try {
    await execFileAsync('git', ['diff', '--quiet', '--', 'system.pdf'], {
      cwd: repoRoot,
    })
  } catch {
    process.stderr.write(
      'system.pdf has uncommitted changes. Run `pnpm generate:system-pdf` and commit the updated PDF before pushing.\n',
    )
    process.exitCode = 1
  }
}

await main()
