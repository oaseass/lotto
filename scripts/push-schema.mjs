import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const env = readFileSync('.env.local', 'utf-8')
const envObj = { ...process.env }
env.split('\n').forEach(line => {
  const idx = line.indexOf('=')
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim()
    let v = line.slice(idx + 1).trim()
    // 따옴표 제거
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    envObj[k] = v
  }
})

try {
  const out = execSync('npx prisma db push', { env: envObj, encoding: 'utf-8' })
  console.log(out)
} catch (e) {
  console.error(e.stdout)
  console.error(e.stderr)
}
