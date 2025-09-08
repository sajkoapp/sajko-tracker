# @sajko/vue

Vue 3 integration for SAJKO Analytics with Composition API support.

## Installation

```bash
npm install @sajko/vue @sajko/tracker
```

## Usage

### Plugin Setup

```javascript
// main.js
import { createApp } from 'vue';
import { SajkoPlugin } from '@sajko/vue';
import App from './App.vue';

const app = createApp(App);

app.use(SajkoPlugin, {
  websiteId: 'your-website-id',
  apiEndpoint: 'https://api.sajko.app' // optional
});

app.mount('#app');
```

### Composition API

```vue
<template>
  <button @click="trackClick">Track Event</button>
</template>

<script setup>
import { useSajko, usePageView } from '@sajko/vue';

const { track, identify, getSessionId } = useSajko();

// Auto-track page views
usePageView();

const trackClick = () => {
  track('button_click', { 
    button: 'cta',
    page: 'home' 
  });
};
</script>
```

## Documentation

For full documentation, visit [https://github.com/sajkoapp/sajko-tracker](https://github.com/sajkoapp/sajko-tracker)

## License

MIT