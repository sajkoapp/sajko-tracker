# @sajko/nextjs

Next.js integration for SAJKO Analytics with App Router and Pages Router support.

## Installation

```bash
npm install @sajko/nextjs @sajko/tracker @sajko/react
```

## Usage

### App Router

```jsx
// app/layout.tsx
import { SajkoScript } from '@sajko/nextjs';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SajkoScript config={{ websiteId: 'your-website-id' }} />
      </body>
    </html>
  );
}
```

### Pages Router

```jsx
// pages/_app.tsx
import { SajkoScript } from '@sajko/nextjs';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <SajkoScript config={{ websiteId: 'your-website-id' }} />
    </>
  );
}
```

### Using Hooks

```jsx
import { useTracker, usePageView } from '@sajko/nextjs';

export default function Page() {
  const track = useTracker();
  usePageView(); // Auto-track page views
  
  return <button onClick={() => track('click')}>Track Event</button>;
}
```

## Documentation

For full documentation, visit [https://github.com/sajkoapp/sajko-tracker](https://github.com/sajkoapp/sajko-tracker)

## License

MIT