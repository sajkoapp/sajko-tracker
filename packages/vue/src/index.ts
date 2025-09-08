/**
 * @sajko/vue - Vue.js plugin for SAJKO analytics
 */

// Export plugin
export { SajkoPlugin, type SajkoPluginOptions } from './plugin';

// Export composables
export {
  useSajko,
  usePageView,
  useMetrics,
  useTracker,
  useIdentify,
  useSession,
  type SajkoComposable
} from './composables';

// Re-export core types
export type {
  SajkoConfig,
  SajkoReplay,
  SajkoMetrics,
  LoaderOptions,
  TrackingEvent,
  UserTraits
} from '@sajko/tracker';