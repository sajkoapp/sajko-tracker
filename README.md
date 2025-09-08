# @sajko/tracker

Advanced session replay and analytics for modern web applications.

## Packages

- **[@sajko/tracker](./packages/core)** - Core tracking library
- **[@sajko/react](./packages/react)** - React hooks and components
- **[@sajko/nextjs](./packages/nextjs)** - Next.js integration
- **[@sajko/vue](./packages/vue)** - Vue.js plugin
- **[@sajko/cli](./packages/cli)** - Command-line tools

## Quick Start

### Installation

```bash
# Core package
npm install @sajko/tracker

# Framework-specific packages
npm install @sajko/react     # For React
npm install @sajko/nextjs    # For Next.js
npm install @sajko/vue       # For Vue.js
```

### Basic Usage

#### Vanilla JavaScript
```javascript
import { init } from '@sajko/tracker';

const sajko = await init({
  websiteId: 'your-website-id',
  apiEndpoint: 'https://api.sajko.sk', // Optional
  hasUserConsent: true
});

// Track custom events
sajko.track('button_click', { button: 'cta' });
```

#### React
```jsx
import { SajkoProvider, useTracker } from '@sajko/react';

function App() {
  return (
    <SajkoProvider config={{ websiteId: 'your-website-id' }}>
      <YourApp />
    </SajkoProvider>
  );
}

function Component() {
  const { sajko, loading } = useTracker();
  
  const handleClick = () => {
    sajko?.track('button_click', { button: 'cta' });
  };
  
  return <button onClick={handleClick}>Track Event</button>;
}
```

#### Next.js
```jsx
// app/layout.tsx
import { SajkoScript } from '@sajko/nextjs';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <SajkoScript config={{ websiteId: 'your-website-id' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Features

- 📹 **Session Replay** - Record and replay user sessions
- 🔥 **Heatmaps** - Visualize user interactions
- 📊 **Analytics** - Track user behavior and conversions
- 🚀 **Performance** - Optimized with WASM compression
- 🔒 **Privacy-First** - GDPR compliant with PII masking
- 🎯 **Flow Tracking** - Monitor user journeys
- 💾 **Offline Support** - Queue events when offline
- 🎨 **Framework Support** - React, Next.js, Vue.js, and more

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start development mode
npm run dev
```

## Examples

Check out the [examples](./examples) directory for complete implementations:
- [Next.js App Router](./examples/nextjs-app-router)
- [React Vite](./examples/react-vite)
- [Vue 3](./examples/vue3)
- [Vanilla JavaScript](./examples/vanilla-js)

## Documentation

Visit [docs.sajko.sk](https://docs.sajko.sk) for full documentation.

## License

MIT © SAJKO Team