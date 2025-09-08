# @sajko/react

React hooks and components for SAJKO Analytics integration.

## Installation

```bash
npm install @sajko/react @sajko/tracker
```

## Usage

```jsx
import { SajkoProvider, useSajko, usePageView } from '@sajko/react';

// Wrap your app with the provider
function App() {
  return (
    <SajkoProvider config={{ websiteId: 'your-website-id' }}>
      <YourApp />
    </SajkoProvider>
  );
}

// Use hooks in your components
function MyComponent() {
  const { track, identify } = useSajko();
  
  // Auto-track page views
  usePageView();
  
  const handleClick = () => {
    track('button_click', { button: 'cta' });
  };
  
  return <button onClick={handleClick}>Click Me</button>;
}
```

## Documentation

For full documentation, visit [https://github.com/sajkoapp/sajko-tracker](https://github.com/sajkoapp/sajko-tracker)

## License

MIT