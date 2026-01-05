import type { Connection, Bind } from 'snowflake-sdk'
import { env } from '@/config/env'

// Helper to format private key correctly
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key || key === 'placeholder') return undefined

  let cleanKey = key

  // 1. Remove surrounding quotes if they exist
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
      (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
    cleanKey = cleanKey.slice(1, -1)
  }

  // 2. Handle literal escaped newlines (common in one-line env vars)
  if (cleanKey.includes('\\n')) {
    cleanKey = cleanKey.replace(/\\n/g, '\n')
  }

  // 3. Split by newline to handle potential indentation/whitespace issues
  const lines = cleanKey.split('\n')
    .map(line => line.trim()) // Remove indentation/whitespace from each line
    .filter(line => line.length > 0) // Remove empty lines

  // 4. Reconstruct the key
  const formattedKey = lines.join('\n')

  // Debug log (safe)
  if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
    console.warn('Snowflake Private Key may be invalid or missing PKCS#8 header (expected "-----BEGIN PRIVATE KEY-----")')
  }
  
  if (formattedKey.includes('BEGIN RSA PRIVATE KEY')) {
    console.warn('Snowflake Private Key appears to be PKCS#1 (RSA). Snowflake requires PKCS#8. Use "openssl pkcs8 -topk8..." to convert.')
  }

  return formattedKey
}

const config = {
  account: env.SNOWFLAKE_ACCOUNT,
  username: env.SNOWFLAKE_USERNAME,
  authenticator: env.SNOWFLAKE_AUTHENTICATOR,
  privateKey: formatPrivateKey(env.SNOWFLAKE_PRIVATE_KEY),
  privateKeyPass: env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE,
  warehouse: env.SNOWFLAKE_WAREHOUSE,
  role: env.SNOWFLAKE_ROLE,
}

async function getSnowflake() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('Snowflake SDK is not supported in Edge Runtime')
  }
  // Dynamically import snowflake-sdk to avoid build errors in Edge Runtime
  return (await import('snowflake-sdk')).default
}

export async function createSnowflakeConnection(): Promise<Connection> {
  const snowflake = await getSnowflake()
  return snowflake.createConnection(config)
}

export async function connectSnowflake(): Promise<Connection> {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await createSnowflakeConnection()
      connection.connect((err, conn) => {
        if (err) reject(err)
        else resolve(conn)
      })
    } catch (error) {
      reject(error)
    }
  })
}

export async function executeQuery<T = unknown>(
  connection: Connection,
  sqlText: string,
  binds?: Bind[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds: binds as any,
      complete: (err, stmt, rows) => {
        if (err) reject(err)
        else resolve((rows || []) as T[])
      },
    })
  })
}

export async function destroyConnection(connection: Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.destroy((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export class SnowflakeClient {
  async query<T = unknown>(sqlText: string, binds?: Bind[]): Promise<T[]> {
    let connection: Connection | undefined
    try {
      connection = await createSnowflakeConnection()
      
      // Connect
      await new Promise<void>((resolve, reject) => {
        connection!.connect((err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      // Execute
      return await new Promise<T[]>((resolve, reject) => {
        connection!.execute({
          sqlText,
          binds: binds as any,
          complete: (err, stmt, rows) => {
            if (err) reject(err)
            else resolve((rows || []) as T[])
          },
        })
      })
    } finally {
      if (connection) {
        connection.destroy((err) => {
          if (err) console.error('Error destroying Snowflake connection:', err)
        })
      }
    }
  }
}

export const snowflakeClient = new SnowflakeClient()