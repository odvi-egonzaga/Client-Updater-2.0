# Client Updater Version 2 - CLI Installation

## Overview

The Client Updater Version 2 can be quickly scaffolded using the CLI command. This guide covers installation, updating, and available commands.

---

## Installation

### Prerequisites

Before installing, ensure you have:

- **Node.js**: Version 18 or higher
- **pnpm**: Version 10 or higher (recommended package manager)
- **Git**: For version control

### Install via CLI

The framework can be installed using:

```bash
pnpm create dtt-framework@latest my-app
```

Replace `my-app` with your desired project name.

### Installation Options

The CLI supports various options:

```bash
pnpm create dtt-framework@latest my-app --template default --use-npm
```

**Available Options:**

| Option | Description | Default |
|---------|-------------|----------|
| `-t, --template <template>` | Template to use (default, minimal, full) | `default` |
| `--use-npm` | Use npm instead of pnpm | `false` |
| `--use-yarn` | Use yarn instead of pnpm | `false` |
| `--no-git` | Skip git initialization | `false` |
| `--no-install` | Skip dependency installation | `false` |

### Interactive Installation

For an interactive installation experience:

```bash
pnpm create dtt-framework@latest
```

This will prompt you for each option:

```
? What is your project name? my-app
? Which package manager would you like to use? pnpm
? Which template would you like to use? Default - Full framework with all features
```

### Templates

The CLI provides three templates:

1. **Default** - Full framework with all features (recommended)
   - Clerk authentication
   - Supabase integration
   - Snowflake integration
   - Health check system
   - All UI components

2. **Minimal** - Core framework only
   - Basic Next.js setup
   - Tailwind CSS
   - Core utilities
   - No external integrations

3. **Full** - With additional integrations
   - All default features
   - Extended component library
   - Advanced configurations

---

## Post-Installation Steps

### 1. Navigate to Project Directory

```bash
cd my-app
```

### 2. Install Dependencies (if skipped during installation)

```bash
pnpm install
# or
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake (optional)
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST
```

See [Environment Variables](./environment-variables.md) for complete reference.

### 4. Set Up Database

Generate and push database schema:

```bash
pnpm db:generate
pnpm db:push
```

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### 6. Verify Health Checks

Navigate to the health check dashboard:

```
http://localhost:3000/health
```

This will verify all services are properly configured.

---

## CLI Commands Reference

### Development Commands

| Command | Description |
|----------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm preview` | Preview production build |

### Database Commands

| Command | Description |
|----------|-------------|
| `pnpm db:generate` | Generate migration files from schema |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:push` | Push schema directly to database (dev only) |
| `pnpm db:studio` | Open Drizzle Studio for database management |

### Code Quality Commands

| Command | Description |
|----------|-------------|
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues automatically |
| `pnpm format:check` | Check code formatting with Prettier |
| `pnpm format:write` | Format code with Prettier |
| `pnpm check` | Run type check and lint |
| `pnpm typecheck` | Run TypeScript type check only |

### Test Commands

| Command | Description |
|----------|-------------|
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Run tests with UI |
| `pnpm test:coverage` | Run tests with coverage report |

---

## Updating the Framework

### Check for Updates

To check if a new version is available:

```bash
pnpm outdated dtt-framework
```

### Update to Latest Version

To update to the latest version:

```bash
pnpm update dtt-framework@latest
```

### Using the Update Command

The framework includes an update command that simplifies the process:

```bash
npx dtt-framework update
```

**Update Options:**

| Option | Description |
|--------|-------------|
| `--check-only` | Only check for updates without installing |
| `--force` | Force update even if already on latest version |

### Update Process

When you run the update command:

1. It checks your current version
2. It queries npm for the latest version
3. If a new version is available, it updates the package
4. It displays the version change
5. It provides a link to the changelog

### Manual Update

For manual updates, you can:

1. Check the [GitHub repository](https://github.com/your-org/dtt-framework) for the latest version
2. Update the version in `package.json`:
   ```json
   {
     "name": "my-app",
     "version": "0.1.0",
     "dependencies": {
       "dtt-framework": "0.2.0"
     }
   }
   ```
3. Run `pnpm install` to install the updated version

### Migration Guide

When updating to a new major version, check for breaking changes:

1. Read the release notes
2. Check for migration guides
3. Update configuration files as needed
4. Update dependencies
5. Run tests to verify compatibility

---

## Troubleshooting

### Installation Issues

**Issue: "pnpm: command not found"**

**Solution:** Install pnpm globally:

```bash
npm install -g pnpm
```

**Issue: "Node version not supported"**

**Solution:** Update Node.js to version 18 or higher:

```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

**Issue: "Permission denied"**

**Solution:** Check file permissions:

```bash
# On Unix-based systems
chmod +x node_modules/.bin/*
```

**Issue: "Template not found"**

**Solution:** Ensure you're using the latest version of the CLI:

```bash
pnpm create dtt-framework@latest my-app
```

### Post-Installation Issues

**Issue: "Environment variable not found"**

**Solution:** Ensure `.env` file exists and is configured:

```bash
# Check if .env exists
ls -la .env

# Copy from example if missing
cp .env.example .env

# Verify .env is in .gitignore
cat .gitignore
```

**Issue: "Database connection failed"**

**Solution:** Verify database URL is correct:

```bash
# Test database connection
psql $DATABASE_URL

# Or check Supabase dashboard for connection details
```

**Issue: "Port 3000 already in use"**

**Solution:** Use a different port:

```bash
# Set PORT environment variable
PORT=3001 pnpm dev

# Or kill the process using port 3000
# On Unix
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Issue: "Update failed"**

**Solution:** Try updating manually:

```bash
# Remove lock file
rm pnpm-lock.yaml

# Update dependencies
pnpm install

# Update framework
pnpm update dtt-framework@latest
```

---

## Project Structure After Installation

After installation, your project will have this structure:

```
my-app/
├── docs/
│   └── framework/              # Framework documentation
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/              # React components
│   ├── features/               # Feature modules
│   ├── hooks/                  # React hooks
│   ├── lib/                    # Utilities and clients
│   ├── server/                 # Server-side code
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript types
│   └── config/                 # Configuration files
├── .env.example                # Environment variables template
├── .gitignore                 # Git ignore rules
├── drizzle.config.ts           # Drizzle ORM config
├── next.config.js              # Next.js config
├── package.json                # Dependencies
├── pnpm-lock.yaml             # Lock file
├── tsconfig.json               # TypeScript config
└── README.md                  # Project documentation
```

---

## Publishing to npm

### Prerequisites

Before publishing, ensure you have:

1. An npm account (create one at [npmjs.com](https://www.npmjs.com))
2. Logged in to npm: `npm login`

### Build the CLI

```bash
pnpm build:cli
```

### Publish the Package

```bash
npm publish
```

### Publish the CLI Package

The CLI package (`create-dtt-framework`) should be published separately:

```bash
cd cli
npm publish
```

### Verify Publication

After publishing, verify the package is available:

```bash
npm view dtt-framework
npm view create-dtt-framework
```

### Test Installation

Test the CLI installation:

```bash
pnpm create dtt-framework@latest test-app
```

---

## Getting Help

### Documentation

- [Overview](./01-overview.md) - Framework introduction
- [Tech Stack](./02-techstack.md) - Technology breakdown
- [Environment Variables](./environment-variables.md) - Configuration guide

### Community

- **GitHub Issues**: Report bugs and request features
- **Discord**: Join the community for support
- **Discussions**: Ask questions and share knowledge

### Support

For enterprise support, contact the maintainers directly.

---

## Best Practices

### 1. Version Control

Always initialize Git after installation:

```bash
git init
git add .
git commit -m "Initial commit from Client Updater Version 2"
```

### 2. Environment Management

Use different environment files for different environments:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

### 3. Dependency Management

Keep dependencies up to date:

```bash
# Check for outdated packages
pnpm outdated

# Update all packages
pnpm update

# Update specific package
pnpm update package-name
```

### 4. Code Quality

Run quality checks before committing:

```bash
# Run type check
pnpm typecheck

# Run lint
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format:write
```

### 5. Testing

Always run tests before deploying:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

---

## Related Documentation

- [Overview](./01-overview.md) - Framework introduction
- [Environment Variables](./environment-variables.md) - Configuration guide
- [Implementation](./implementation.md) - How framework was built
- [Health Check System](./health-check-system.md) - Health monitoring guide
