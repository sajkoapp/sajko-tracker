'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSajko, UseSajkoState } from './hooks';
import { SajkoConfig, LoaderOptions } from '@sajko/tracker';

/**
 * SAJKO context value
 */
export interface SajkoContextValue extends UseSajkoState {
  /** Track an event */
  track: (event: string, properties?: Record<string, any>) => void;
  /** Identify a user */
  identify: (userId: string, traits?: Record<string, any>) => void;
  /** Flush events */
  flush: () => Promise<void>;
}

/**
 * SAJKO context
 */
const SajkoContext = createContext<SajkoContextValue | null>(null);

/**
 * Props for SajkoProvider
 */
export interface SajkoProviderProps {
  /** Child components */
  children: ReactNode;
  /** SAJKO configuration */
  config: SajkoConfig;
  /** Loader options */
  options?: LoaderOptions;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Error component */
  errorComponent?: (error: Error) => ReactNode;
}

/**
 * SAJKO Provider Component
 * 
 * Provides SAJKO tracking context to child components
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SajkoProvider 
 *       config={{ websiteId: 'your-website-id' }}
 *       loadingComponent={<div>Loading tracker...</div>}
 *       errorComponent={(error) => <div>Error: {error.message}</div>}
 *     >
 *       <YourApp />
 *     </SajkoProvider>
 *   );
 * }
 * ```
 */
export function SajkoProvider({
  children,
  config,
  options,
  loadingComponent,
  errorComponent
}: SajkoProviderProps) {
  const sajkoState = useSajko(config, options);
  
  // Create context value with helper functions
  const contextValue: SajkoContextValue = {
    ...sajkoState,
    track: (event: string, properties?: Record<string, any>) => {
      if (sajkoState.sajko?.trackEvent) {
        sajkoState.sajko.trackEvent(event, properties);
      }
    },
    identify: (userId: string, traits?: Record<string, any>) => {
      if (sajkoState.sajko?.identify) {
        sajkoState.sajko.identify(userId, traits);
      }
    },
    flush: async () => {
      if (sajkoState.sajko?.flush) {
        await sajkoState.sajko.flush();
      }
    }
  };
  
  // Show loading component if provided
  if (sajkoState.loading && loadingComponent) {
    return <>{loadingComponent}</>;
  }
  
  // Show error component if provided
  if (sajkoState.error && errorComponent) {
    return <>{errorComponent(sajkoState.error)}</>;
  }
  
  return (
    <SajkoContext.Provider value={contextValue}>
      {children}
    </SajkoContext.Provider>
  );
}

/**
 * Hook to use SAJKO context
 * 
 * Must be used within a SajkoProvider
 * 
 * @returns SAJKO context value
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const { sajko, track, identify, isRecording } = useTracker();
 * 
 *   const handleClick = () => {
 *     track('button_click', { button: 'cta' });
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleClick}>Track Click</button>
 *       {isRecording && <span>Recording...</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTrackerContext(): SajkoContextValue {
  const context = useContext(SajkoContext);
  
  if (!context) {
    throw new Error('useTrackerContext must be used within a SajkoProvider');
  }
  
  return context;
}

/**
 * HOC to inject SAJKO props into a component
 * 
 * @param Component - Component to wrap
 * @returns Wrapped component with SAJKO props
 * 
 * @example
 * ```tsx
 * interface Props {
 *   sajko: SajkoContextValue;
 * }
 * 
 * const MyComponent = withSajko<Props>(({ sajko }) => {
 *   return <button onClick={() => sajko.track('click')}>Track</button>;
 * });
 * ```
 */
export function withSajko<P extends { sajko?: SajkoContextValue }>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'sajko'>> {
  return function WithSajkoComponent(props: Omit<P, 'sajko'>) {
    const sajko = useTrackerContext();
    return <Component {...(props as P)} sajko={sajko} />;
  };
}