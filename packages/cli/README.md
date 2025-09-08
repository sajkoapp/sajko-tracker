# @sajko/cli

CLI tool for SAJKO Analytics - Initialize, test, and debug your integration.

## Installation

```bash
npm install -g @sajko/cli
# or
npx @sajko/cli
```

## Commands

### Initialize SAJKO

Set up SAJKO in your project with interactive configuration:

```bash
sajko init
```

Options:
- `-f, --framework <framework>` - Specify framework (react, nextjs, vue, vanilla)
- `-p, --package-manager <pm>` - Specify package manager (npm, yarn, pnpm, bun)
- `--no-install` - Skip dependency installation

### Test Integration

Verify your SAJKO setup is working correctly:

```bash
sajko test
```

Options:
- `-w, --website-id <id>` - Website ID to test
- `-e, --endpoint <url>` - API endpoint to test
- `--send-event` - Send a test event

### Debug Mode

Monitor events in real-time with a local debug server:

```bash
sajko debug
```

Options:
- `-w, --website-id <id>` - Website ID to monitor
- `-p, --port <port>` - Local server port (default: 9090)
- `--verbose` - Show detailed event data

Opens a debug console at `http://localhost:9090` where you can:
- View live events from your application
- Send test events
- Monitor event flow
- Debug integration issues

### Doctor

Check your SAJKO setup for common issues:

```bash
sajko doctor
```

Options:
- `--fix` - Attempt to fix issues automatically

The doctor command checks for:
- Configuration file presence and validity
- Correct package installation
- Framework integration
- TypeScript setup
- Common mistakes

## Configuration

SAJKO CLI looks for configuration in these locations:
1. `sajko.config.ts` - TypeScript config
2. `sajko.config.js` - JavaScript config
3. `.sajkorc.json` - JSON config
4. `package.json` - Under `sajko` field

Example configuration:

```javascript
// sajko.config.js
module.exports = {
  websiteId: 'your-website-id',
  apiEndpoint: 'https://api.sajko.app',
  debug: process.env.NODE_ENV === 'development'
};
```

## Examples

### Quick Start

```bash
# Initialize in a React project
npx @sajko/cli init --framework react

# Test the integration
npx @sajko/cli test --send-event

# Start debugging
npx @sajko/cli debug --verbose
```

### CI/CD Integration

```bash
# In your CI pipeline
npx @sajko/cli test --website-id $SAJKO_WEBSITE_ID
```

### Development Workflow

```bash
# Start debug server in one terminal
sajko debug --verbose

# Run your app in another terminal
npm run dev

# Monitor events in real-time at http://localhost:9090
```

## Troubleshooting

If you encounter issues:

1. Run the doctor command:
   ```bash
   sajko doctor --fix
   ```

2. Check debug output:
   ```bash
   sajko debug --verbose
   ```

3. Verify configuration:
   ```bash
   sajko test
   ```

## License

MIT