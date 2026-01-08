# Client Updater Version 2 - Snowflake Integration

## Overview

The Client Updater Version 2 includes integration with [Snowflake](https://www.snowflake.com/), a cloud-based data warehousing platform. Snowflake is used for analytics, reporting, and business intelligence workloads.

### Why Snowflake?

- **Cloud-Native**: Fully managed data warehouse
- **Separation of Compute and Storage**: Scale independently
- **Performance**: Fast query execution with automatic optimization
- **SQL Support**: Standard SQL with extensions
- **Data Sharing**: Secure data sharing with other Snowflake accounts
- **Ecosystem**: Rich partner ecosystem and integrations

---

## Snowflake Connection Setup

### 1. Create a Snowflake Account

1. Go to [snowflake.com](https://www.snowflake.com/) and sign up
2. Create a new account or use an existing one
3. Note down your account identifier (e.g., `xy12345.us-east-1`)

### 2. Install Dependencies

```bash
pnpm add snowflake-sdk
pnpm add -D @types/snowflake-sdk
```

### 3. Configure Environment Variables

Add the following to your [`.env`](./environment-variables.md) file:

```bash
# Snowflake
SNOWFLAKE_ACCOUNT=ef19411.ap-southeast-1
SNOWFLAKE_AUTHENTICATOR=SNOWFLAKE_JWT
SNOWFLAKE_USERNAME=APP_USER_WITH_KEY_AUTH
SNOWFLAKE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
        -----END PRIVATE KEY-----"
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE="<password>"
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_ROLE=ACCOUNTADMIN
SNOWFLAKE_LOGGING=true
```

**Where to find these values:**

- **Account**: Snowflake URL (e.g., `ef19411.ap-southeast-1` from `https://ef19411.ap-southeast-1.snowflakecomputing.com`)
- **Authenticator**: `SNOWFLAKE_JWT` for Key Pair Authentication
- **Username**: Your Snowflake username (must be configured with public key)
- **Private Key**: Your private key in PEM format
- **Passphrase**: Password for your private key (if encrypted)
- **Warehouse**: Compute warehouse name
- **Role**: Role with appropriate permissions (e.g., `ACCOUNTADMIN` or custom role)
- **Logging**: Enable verbose logging (optional)

### 4. Create Snowflake Client

Create [`src/lib/snowflake/client.ts`](../../src/lib/snowflake/client.ts):

```typescript
import snowflake from 'snowflake-sdk'
import type { Bind } from 'snowflake-sdk'
import { env } from '@/config/env'

const config = {
  account: env.SNOWFLAKE_ACCOUNT,
  username: env.SNOWFLAKE_USERNAME,
  authenticator: env.SNOWFLAKE_AUTHENTICATOR,
  privateKey: env.SNOWFLAKE_PRIVATE_KEY,
  privateKeyPass: env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE,
  warehouse: env.SNOWFLAKE_WAREHOUSE,
  role: env.SNOWFLAKE_ROLE,
}

export function createSnowflakeConnection() {
  return snowflake.createConnection(config)
}

export async function connectSnowflake(): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    const connection = createSnowflakeConnection()
    connection.connect((err, conn) => {
      if (err) reject(err)
      else resolve(conn)
    })
  })
}

export async function executeQuery<T = unknown>(
  connection: snowflake.Connection,
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

export async function destroyConnection(connection: snowflake.Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.destroy((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
```

---

## Query Execution Patterns

### Basic Query Execution

```typescript
import { connectSnowflake, executeQuery, destroyConnection } from '@/lib/snowflake/client'

async function runQuery() {
  const connection = await connectSnowflake()
  
  try {
    const results = await executeQuery<{ NAME: string; VALUE: number }>(
      connection,
      'SELECT NAME, VALUE FROM MY_TABLE LIMIT 10'
    )
    
    console.log(results)
    return results
  } finally {
    await destroyConnection(connection)
  }
}
```

### Parameterized Queries

```typescript
async function runParameterizedQuery(userId: string) {
  const connection = await connectSnowflake()
  
  try {
    const results = await executeQuery<{ ID: string; NAME: string }>(
      connection,
      'SELECT ID, NAME FROM USERS WHERE ID = ?',
      [userId]
    )
    
    return results
  } finally {
    await destroyConnection(connection)
  }
}
```

### Multiple Queries in Sequence

```typescript
async function runMultipleQueries() {
  const connection = await connectSnowflake()
  
  try {
    const users = await executeQuery(connection, 'SELECT * FROM USERS LIMIT 10')
    const products = await executeQuery(connection, 'SELECT * FROM PRODUCTS LIMIT 10')
    const orders = await executeQuery(connection, 'SELECT * FROM ORDERS LIMIT 10')
    
    return { users, products, orders }
  } finally {
    await destroyConnection(connection)
  }
}
```

---

## Warehouse Configuration

### Snowflake Warehouse Concepts

A warehouse in Snowflake is a compute resource that executes queries:

| Warehouse Type | Description | Use Case |
|----------------|-------------|----------|
| **X-Small** | 1 credit/hour | Testing, development |
| **Small** | 2 credits/hour | Light analytics |
| **Medium** | 4 credits/hour | Standard analytics |
| **Large** | 8 credits/hour | Heavy analytics |
| **X-Large** | 16 credits/hour | Large datasets |
| **2X-Large** | 32 credits/hour | Very large datasets |
| **3X-Large** | 64 credits/hour | Enterprise workloads |
| **4X-Large** | 128 credits/hour | Maximum performance |

### Creating a Warehouse

```sql
CREATE WAREHOUSE COMPUTE_WH
  WAREHOUSE_SIZE = 'X-SMALL'
  AUTO_SUSPEND = 300
  AUTO_RESUME = TRUE
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 1
  SCALING_POLICY = 'STANDARD';
```

### Warehouse Best Practices

1. **Auto-Suspend**: Enable auto-suspend to save credits when not in use
2. **Auto-Resume**: Enable auto-resume for instant availability
3. **Right-Size**: Choose the appropriate size for your workload
4. **Multi-Cluster**: Use multi-cluster warehouses for high concurrency
5. **Monitor Usage**: Regularly review warehouse usage and optimize

---

## Best Practices

### Connection Management

**Always close connections:**

```typescript
// ✅ Good - Always close connection
async function goodPattern() {
  const connection = await connectSnowflake()
  try {
    return await executeQuery(connection, 'SELECT * FROM TABLE')
  } finally {
    await destroyConnection(connection)
  }
}

// ❌ Bad - Connection not closed
async function badPattern() {
  const connection = await connectSnowflake()
  return await executeQuery(connection, 'SELECT * FROM TABLE')
}
```

**Use connection pooling for high-frequency queries:**

```typescript
// For high-frequency queries, consider implementing connection pooling
// Snowflake SDK doesn't have built-in pooling, but you can implement it
```

### Query Optimization

**Use LIMIT for large datasets:**

```typescript
// ✅ Good - Limit results
const results = await executeQuery(connection, 'SELECT * FROM LARGE_TABLE LIMIT 1000')

// ❌ Bad - Could return millions of rows
const results = await executeQuery(connection, 'SELECT * FROM LARGE_TABLE')
```

**Select only needed columns:**

```typescript
// ✅ Good - Select only needed columns
const results = await executeQuery(
  connection,
  'SELECT ID, NAME FROM USERS'
)

// ❌ Bad - Select all columns
const results = await executeQuery(
  connection,
  'SELECT * FROM USERS'
)
```

**Use WHERE clauses to filter data:**

```typescript
// ✅ Good - Filter data
const results = await executeQuery(
  connection,
  'SELECT * FROM ORDERS WHERE CREATED_AT >= DATEADD(day, -30, CURRENT_DATE())'
)

// ❌ Bad - No filtering
const results = await executeQuery(
  connection,
  'SELECT * FROM ORDERS'
)
```

### Error Handling

**Handle connection errors:**

```typescript
async function safeQuery() {
  try {
    const connection = await connectSnowflake()
    try {
      return await executeQuery(connection, 'SELECT * FROM TABLE')
    } finally {
      await destroyConnection(connection)
    }
  } catch (error) {
    console.error('Snowflake connection error:', error)
    throw new Error('Failed to execute Snowflake query')
  }
}
```

**Handle query errors:**

```typescript
async function safeQueryWithHandling() {
  const connection = await connectSnowflake()
  
  try {
    const results = await executeQuery(connection, 'SELECT * FROM NON_EXISTENT_TABLE')
    return results
  } catch (error: any) {
    if (error.code === '002003') {
      // Table does not exist
      console.error('Table not found:', error.message)
    } else {
      console.error('Query error:', error.message)
    }
    throw error
  } finally {
    await destroyConnection(connection)
  }
}
```

### Security

**Never hardcode credentials:**

```typescript
// ❌ Bad - Hardcoded credentials
const connection = snowflake.createConnection({
  account: 'xy12345.us-east-1',
  username: 'myuser',
  password: 'mypassword', // Never do this!
  // ...
})

// ✅ Good - Use environment variables
const connection = snowflake.createConnection({
  account: env.SNOWFLAKE_ACCOUNT,
  username: env.SNOWFLAKE_USERNAME,
  password: env.SNOWFLAKE_PASSWORD,
  // ...
})
```

**Use least privilege principle:**

- Create roles with minimal required permissions
- Grant only necessary privileges to roles
- Regularly audit role permissions

**Encrypt sensitive data:**

- Use Snowflake's built-in encryption
- Encrypt data at rest and in transit
- Use secure key management

---

## Health Check Endpoints

The framework includes health check endpoints for verifying Snowflake integration:

### Snowflake Health Checks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/snowflake/connect` | GET | Test Snowflake connection |
| `/api/health/snowflake/query` | GET | Execute test query |

### Connection Check

```typescript
// GET /api/health/snowflake/connect
{
  "status": "healthy",
  "responseTimeMs": 234,
  "message": "Successfully connected to Snowflake"
}
```

### Query Check

```typescript
// GET /api/health/snowflake/query
{
  "status": "healthy",
  "responseTimeMs": 312,
  "message": "Query executed successfully",
  "data": {
    "timestamp": "2025-12-29 07:50:00.000"
  }
}
```

---

## Advanced Patterns

### Streaming Large Results

```typescript
async function streamLargeResults() {
  const connection = await connectSnowflake()
  
  try {
    const statement = connection.execute({
      sqlText: 'SELECT * FROM LARGE_TABLE',
      streamResult: true,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Error:', err)
          return
        }
        
        // Process rows in batches
        rows?.forEach((row) => {
          // Process each row
          console.log(row)
        })
      },
    })
  } finally {
    await destroyConnection(connection)
  }
}
```

### Transaction Management

```typescript
async function transactionExample() {
  const connection = await connectSnowflake()
  
  try {
    // Start transaction
    await executeQuery(connection, 'BEGIN')
    
    try {
      // Execute multiple statements
      await executeQuery(connection, 'INSERT INTO TABLE1 VALUES (1, 2, 3)')
      await executeQuery(connection, 'UPDATE TABLE2 SET VALUE = 10 WHERE ID = 1')
      
      // Commit transaction
      await executeQuery(connection, 'COMMIT')
    } catch (error) {
      // Rollback on error
      await executeQuery(connection, 'ROLLBACK')
      throw error
    }
  } finally {
    await destroyConnection(connection)
  }
}
```

### Batch Operations

```typescript
async function batchInsert() {
  const connection = await connectSnowflake()
  
  try {
    const values = [
      [1, 'Alice', 25],
      [2, 'Bob', 30],
      [3, 'Charlie', 35],
    ]
    
    // Build multi-row INSERT
    const valuesStr = values.map(v => `(${v.join(', ')})`).join(', ')
    const sql = `INSERT INTO USERS (ID, NAME, AGE) VALUES ${valuesStr}`
    
    await executeQuery(connection, sql)
  } finally {
    await destroyConnection(connection)
  }
}
```

---

## Snowflake SQL Tips

### Common Snowflake Functions

**Date Functions:**

```sql
-- Current date/time
SELECT CURRENT_DATE();
SELECT CURRENT_TIMESTAMP();

-- Date arithmetic
SELECT DATEADD(day, -7, CURRENT_DATE());
SELECT DATEDIFF(day, '2025-01-01', CURRENT_DATE());

-- Date truncation
SELECT DATE_TRUNC('month', CURRENT_DATE());
```

**String Functions:**

```sql
-- String manipulation
SELECT UPPER('hello');
SELECT LOWER('HELLO');
SELECT TRIM('  hello  ');
SELECT CONCAT('Hello', ' ', 'World');

-- String matching
SELECT * FROM TABLE WHERE NAME LIKE '%test%';
SELECT REGEXP_SUBSTR('hello-world', '[^-]+');
```

**Aggregate Functions:**

```sql
-- Basic aggregates
SELECT COUNT(*), SUM(VALUE), AVG(VALUE), MIN(VALUE), MAX(VALUE) FROM TABLE;

-- Group by
SELECT CATEGORY, COUNT(*), AVG(VALUE) FROM TABLE GROUP BY CATEGORY;

-- Window functions
SELECT 
  NAME, 
  VALUE,
  AVG(VALUE) OVER (PARTITION BY CATEGORY) AS CATEGORY_AVG
FROM TABLE;
```

---

## Troubleshooting

### Common Issues

**Issue: Connection timeout**

- Verify account identifier is correct
- Check network connectivity
- Verify firewall allows Snowflake traffic
- Check if warehouse is suspended

**Issue: Authentication failed**

- Verify username and password are correct
- Check if account is locked
- Verify role has necessary permissions
- Check if password has expired

**Issue: Query timeout**

- Increase warehouse size
- Optimize query (add WHERE clause, use LIMIT)
- Check if warehouse is auto-suspended
- Verify query is not blocked by a lock

**Issue: "Object does not exist"**

- Verify database, schema, and table names are correct
- Check if you're using the correct role
- Verify you have access to the object
- Check if object exists in the correct schema

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Snowflake environment variables
- [API Layer](./api-layer.md) - Snowflake API routes
- [Health Check System](./health-check-system.md) - Health check endpoints
- [Supabase Integration](./supabase-integration.md) - Primary database setup
