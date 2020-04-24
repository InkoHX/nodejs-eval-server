import express from 'express'
import { exec, ExecException } from 'child_process'
import util from 'util'

interface ExecAsyncException extends ExecException {
  stderr: string,
  stdout: string
}

interface EvalRequestBody {
  readonly code?: string
}

const execAsync = util.promisify(exec)

const app = express()

app.use(express.json())

app.post('/api/eval', async (req, res) => {
  const code = (req.body as EvalRequestBody).code

  if (!code) res.status(400).json({
    status: 400,
    message: 'Please send the code you want to run.'
  })

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

  const port = process.env.PORT ?? 3000

  app.listen(port)
    .on('error', error => console.error(error))
    .on('listening', () => console.log(`Listening on http://localhost:${port}`))
}

listen()
  .catch(console.error)
