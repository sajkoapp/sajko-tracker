import { App, Plugin } from 'vue';
import { init, SajkoConfig, SajkoReplay, LoaderOptions } from '@sajko/tracker';

/**
 * SAJKO Vue plugin options
 */
export interface SajkoPluginOptions extends SajkoConfig {
  /** Loader options */
  loaderOptions?: LoaderOptions;
  /** Whether to track route changes automatically */
  trackRouteChanges?: boolean;
  /** Custom route tracking formatter */
  formatRouteName?: (route: any) => string;
}

/**
 * SAJKO instance for Vue
 */
let sajkoInstance: SajkoReplay | null = null;

/**
 * SAJKO Vue Plugin
 * 
 * @example
 * ```ts
 * // main.ts
 * import { createApp } from 'vue';
 * import { SajkoPlugin } from '@sajko/vue';
 * import App from './App.vue';
 * 
 * const app = createApp(App);
 * 
 * app.use(SajkoPlugin, {
 *   websiteId: 'your-website-id',
 *   apiEndpoint: 'https://api.sajko.sk',
 *   hasUserConsent: true,
 *   trackRouteChanges: true
 * });
 * 
 * app.mount('#app');
 * ```
 */
export const SajkoPlugin: Plugin = {
  install(app: App, options: SajkoPluginOptions) {
    const {
      loaderOptions,
      trackRouteChanges = true,
      formatRouteName,
      ...config
    } = options;
    
    // Initialize SAJKO
    init(config, loaderOptions)
      .then((instance) => {
        sajkoInstance = instance;
        console.log('SAJKO Vue: Initialized successfully', {
          sessionId: instance.sessionId,
          version: instance.version
        });
        
        // Set up route tracking if router is available
        if (trackRouteChanges && app.config.globalProperties.$router) {
          setupRouteTracking(app, formatRouteName);
        }
      })
      .catch((error) => {
        console.error('SAJKO Vue: Failed to initialize', error);
      });
    
    // Provide global properties
    app.config.globalProperties.$sajko = {
      track: (event: string, properties?: Record<string, any>) => {
        if (sajkoInstance?.trackEvent) {
          sajkoInstance.trackEvent(event, properties);
        } else {
          console.warn('SAJKO Vue: Not initialized yet');
        }
      },
      identify: (userId: string, traits?: Record<string, any>) => {
        if (sajkoInstance?.identify) {
          sajkoInstance.identify(userId, traits);
        } else {
          console.warn('SAJKO Vue: Not initialized yet');
        }
      },
      getMetrics: () => {
        return sajkoInstance?.getMetrics() || null;
      },
      getSessionId: () => {
        return sajkoInstance?.sessionId || null;
      },
      isRecording: () => {
        return sajkoInstance?.isRecording || false;
      }
    };
    
    // Provide for composition API
    app.provide('sajko', app.config.globalProperties.$sajko);
  }
};

/**
 * Set up automatic route tracking
 */
function setupRouteTracking(app: App, formatRouteName?: (route: any) => string) {
  const router = app.config.globalProperties.$router;
  
  if (!router) {
    console.warn('SAJKO Vue: Router not found, skipping route tracking');
    return;
  }
  
  router.afterEach((to: any, from: any) => {
    if (!sajkoInstance?.trackEvent) return;
    
    const routeName = formatRouteName ? formatRouteName(to) : to.name || to.path;
    
    sajkoInstance.trackEvent('page_view', {
      page: routeName,
      path: to.path,
      fullPath: to.fullPath,
      params: to.params,
      query: to.query,
      from: from.path,
      title: document.title
    });
  });
}