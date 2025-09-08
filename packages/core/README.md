# @sajko/tracker

Core tracking library for SAJKO Analytics - Advanced session replay and analytics for modern web apps.

## Installation

```bash
npm install @sajko/tracker
```

## Usage

```javascript
import { createTracker } from '@sajko/tracker';

const tracker = createTracker({
  websiteId: 'your-website-id',
  apiEndpoint: 'https://api.sajko.app'
});

// Track events
tracker.track('page_view', {
  page: window.location.pathname
});

// Identify users
tracker.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});
```

## Documentation

For full documentation, visit [https://github.com/sajkoapp/sajko-tracker](https://github.com/sajkoapp/sajko-tracker)

## License

MIT