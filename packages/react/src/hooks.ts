'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { init, SajkoConfig, SajkoReplay, SajkoMetrics, LoaderOptions } from '@sajko/tracker';

/**
 * Hook state for SAJKO tracking
 */
export interface UseSajkoState {
  /** SAJKO instance */
  sajko: SajkoReplay | null;
  /** Loading state */
  loading: boolean;
  /** Error if initialization failed */
  error: Error | null;
  /** Current session ID */
  sessionId: string | null;
  /** Current visitor ID */
  visitorId: string | null;
  /** Whether recording is active */
  isRecording: boolean;
}

/**
 * Hook for initializing and using SAJKO tracking
 * 
 * @param config - SAJKO configuration
 * @param options - Loader options
 * @returns SAJKO state and helper functions
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const { sajko, loading, error } = useSajko({
 *     websiteId: 'your-website-id',
 *     hasUserConsent: true
 *   });
 * 
 *   if (loading) return <div>Loading tracker...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 * 
 *   return <button onClick={() => sajko?.trackEvent('click', { button: 'cta' })}>
 *     Track Event
 *   </button>;
 * }
 * ```
 */
export function useSajko(
  config: SajkoConfig,
  options?: LoaderOptions
): UseSajkoState {
  const [state, setState] = useState<UseSajkoState>({
    sajko: null,
    loading: true,
    error: null,
    sessionId: null,
    visitorId: null,
    isRecording: false
  });
  
  const initialized = useRef(false);
  const configRef = useRef(config);
  
  // Update config ref when it changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  
  useEffect(() => {
    // Prevent double initialization in development
    if (initialized.current) return;
    initialized.current = true;
    
    let mounted = true;
    
    const initializeSajko = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const sajkoInstance = await init(configRef.current, options);
        
        if (!mounted) return;
        
        setState({
          sajko: sajkoInstance,
          loading: false,
          error: null,
          sessionId: sajkoInstance.sessionId,
          visitorId: sajkoInstance.visitorId || null,
          isRecording: sajkoInstance.isRecording
        });
      } catch (error) {
        if (!mounted) return;
        
        console.error('SAJKO: Initialization failed', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to initialize SAJKO')
        }));
      }
    };
    
    initializeSajko();
    
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount
  
  return state;
}

/**
 * Hook for tracking page views
 * 
 * @param pageName - Name or path of the page
 * @param properties - Additional page properties
 * 
 * @example
 * ```tsx
 * function Page() {
 *   usePageView('/products', { category: 'electronics' });
 *   return <div>Products Page</div>;
 * }
 * ```
 */
export function usePageView(
  pageName?: string,
  properties?: Record<string, any>
): void {
  const pageViewTracked = useRef(false);
  
  useEffect(() => {
    // Only track once per mount
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    
    // Wait a bit for SAJKO to initialize
    const timer = setTimeout(() => {
      if (window.SajkoReplay?.trackEvent) {
        const pageInfo = {
          page: pageName || window.location.pathname,
          url: window.location.href,
          title: document.title,
          ...properties
        };
        
        window.SajkoReplay.trackEvent('page_view', pageInfo);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pageName]);
}

/**
 * Hook for tracking events with memoized handler
 * 
 * @returns Track function
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const track = useTracker();
 * 
 *   const handleClick = () => {
 *     track('button_click', { button: 'subscribe' });
 *   };
 * 
 *   return <button onClick={handleClick}>Subscribe</button>;
 * }
 * ```
 */
export function useTracker() {
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    if (window.SajkoReplay?.trackEvent) {
      window.SajkoReplay.trackEvent(event, properties);
    } else {
      console.warn('SAJKO: Tracker not initialized');
    }
  }, []);
  
  return track;
}

/**
 * Hook for getting current metrics
 * 
 * @param refreshInterval - Interval to refresh metrics in ms
 * @returns Current metrics or null
 * 
 * @example
 * ```tsx
 * function MetricsDisplay() {
 *   const metrics = useMetrics(5000); // Refresh every 5 seconds
 * 
 *   if (!metrics) return null;
 * 
 *   return (
 *     <div>
 *       <p>Session: {metrics.sessionId}</p>
 *       <p>Queue: {metrics.queueSize}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMetrics(refreshInterval?: number): SajkoMetrics | null {
  const [metrics, setMetrics] = useState<SajkoMetrics | null>(null);
  
  useEffect(() => {
    const updateMetrics = () => {
      if (window.SajkoReplay?.getMetrics) {
        setMetrics(window.SajkoReplay.getMetrics());
      }
    };
    
    // Initial update
    updateMetrics();
    
    // Set up interval if requested
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(updateMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);
  
  return metrics;
}

/**
 * Hook for user identification
 * 
 * @returns Identify function
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const identify = useIdentify();
 * 
 *   const handleLogin = async (email: string) => {
 *     // After successful login
 *     identify('user-123', { email, plan: 'premium' });
 *   };
 * 
 *   return <form>...</form>;
 * }
 * ```
 */
export function useIdentify() {
  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    if (window.SajkoReplay?.identify) {
      window.SajkoReplay.identify(userId, traits);
    } else {
      console.warn('SAJKO: Identify not available');
    }
  }, []);
  
  return identify;
}