/**
 * @sajko/nextjs - Next.js integration for SAJKO analytics
 */

// Export Script component
export { SajkoScript, type SajkoScriptProps } from './script';

// Export App Router components
export { 
  SajkoTracker, 
  SajkoClientTracker,
  type SajkoTrackerProps 
} from './app-router';

// Re-export React hooks for convenience
export {
  useSajko,
  usePageView,
  useTracker,
  useMetrics,
  useIdentify,
  SajkoProvider,
  useTrackerContext,
  type UseSajkoState,
  type SajkoProviderProps,
  type SajkoContextValue
} from '@sajko/react';

// Re-export core types
export type {
  SajkoConfig,
  SajkoReplay,
  SajkoMetrics,
  LoaderOptions,
  TrackingEvent,
  UserTraits
} from '@sajko/tracker';