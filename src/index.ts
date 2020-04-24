import express from 'express'
import { exec, ExecException } from 'child_process'
import util from 'util'

interface ExecAsyncException extends ExecException {
  stderr: string,
  stdout: string
}

const execAsync = util.promisify(exec)

const app = express()

app.get('/api/eval/:code', async (req, res) => {
  const code = req.params.code
  const result = await execAsync([
    'docker',
    'run',
    '--rm',
    '-i',
    '-m',
    '100m',
    '--net',
    'none',
    '--read-only',
    '--pids-limit',
    '10',
    '--cpus',
    '".1"',
    'node:current',
    '-p',
    `"${code}"`
  ].join(' '), {
    timeout: 10000
  })
    .catch((error: ExecAsyncException) => {
      res.status(500).json({
        status: 500,
        stderr: error.stderr,
        message: error.message
      })
    })
  
  if (!result) return

  res.json({ status: 200, ...result })
})

async function listen (): Promise<void> {
  console.log('Pull node:current')
  await execAsync('docker pull node:current')
  console.log('Downloaded node:current')

  app.listen(process.env.PORT)
    .on('error', error => console.error(error))
    .on('listening', () => console.log(`Listening on http://localhost:${process.env.PORT}`))
}

listen()
  .catch(console.error)
