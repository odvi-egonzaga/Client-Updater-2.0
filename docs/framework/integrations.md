# Reusable Integrations

The Client Updater Version 2 provides a unified interface to access all configured integrations through a single `framework` instance. This allows you to easily use third-party services in your application logic without manually managing connections or clients.

## Usage

You can import the `framework` instance from `@/lib/framework`.

```typescript
import { framework } from '@/lib/framework'

async function myFunction() {
  // 1. Clerk Authentication
  const user = await framework.clerk.users.getUser('user_id')

  // 2. Supabase (Admin Access)
  const { data } = await framework.supabase
    .from('my_table')
    .select('*')

  // 3. Snowflake Query
  const rows = await framework.snowflake.query('SELECT * FROM PUBLIC.USERS LIMIT 10')

  // 4. NextBank API
  const account = await framework.nextbank.get('/accounts/123')
  await framework.nextbank.post('/transfers', { amount: 100 })

  // 5. Synology File Operations
  const files = await framework.synology.listFiles('/home/user')
  const fileContent = await framework.synology.getFile('/home/user/doc.pdf')

  // 6. AWS S3
  await framework.s3.uploadFile('my-bucket', 'uploads/hello.txt', 'Hello World')
}
```

## Integration Details

### Clerk (`framework.clerk`)
Exposes the `@clerk/nextjs/server` client. Use this for server-side user management, organization handling, and session verification.

### Supabase (`framework.supabase`)
Exposes the Supabase Admin client (using `SUPABASE_SERVICE_ROLE_KEY`).
**Note:** This client has full admin privileges. Be careful when using it in client-facing code (it should only be used server-side).

### Snowflake (`framework.snowflake`)
Provides a simplified `query` method that handles connection pooling, execution, and cleanup automatically.
- `query(sqlText, binds?)`: Executes a SQL query.

### NextBank (`framework.nextbank`)
A wrapper around the NextBank API that automatically handles:
- Base URL injection
- Authentication headers
- JSON parsing
- Error handling

Methods:
- `get(endpoint)`
- `post(endpoint, body)`
- `put(endpoint, body)`
- `delete(endpoint)`

### Synology (`framework.synology`)
Provides methods to interact with Synology File Station.
- `listFiles(folderPath)`
- `getFile(filePath)`
- `deleteFile(filePath)`

### AWS S3 (`framework.s3`)
Wraps the AWS SDK S3 Client.
- `listBuckets()`
- `listFiles(bucket, prefix?)`
- `uploadFile(bucket, key, body, contentType?)`
- `getFile(bucket, key)`
- `deleteFile(bucket, key)`
- `getPresignedUrl(bucket, key, expiresIn?)`
- `getClient()`: Returns the raw AWS S3 Client for advanced operations.

