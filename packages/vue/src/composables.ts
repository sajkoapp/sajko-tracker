import { ref, inject, onMounted, onUnmounted, Ref } from 'vue';
import { SajkoReplay, SajkoMetrics } from '@sajko/tracker';

/**
 * SAJKO composable interface
 */
export interface SajkoComposable {
  /** Track an event */
  track: (event: string, properties?: Record<string, any>) => void;
  /** Identify a user */
  identify: (userId: string, traits?: Record<string, any>) => void;
  /** Get current metrics */
  getMetrics: () => SajkoMetrics | null;
  /** Get session ID */
  getSessionId: () => string | null;
  /** Check if recording */
  isRecording: () => boolean;
}

/**
 * Composable for using SAJKO in Vue 3
 * 
 * @returns SAJKO functions and state
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useSajko } from '@sajko/vue';
 * 
 * const { track, identify, getSessionId } = useSajko();
 * 
 * const handleClick = () => {
 *   track('button_click', { button: 'cta' });
 * };
 * 
 * const handleLogin = (userId: string) => {
 *   identify(userId, { plan: 'premium' });
 * };
 * </script>
 * ```
 */
export function useSajko(): SajkoComposable {
  const sajko = inject<SajkoComposable>('sajko');
  
  if (!sajko) {
    console.warn('SAJKO Vue: useSajko() must be used after app.use(SajkoPlugin)');
    
    // Return no-op functions
    return {
      track: () => {},
      identify: () => {},
      getMetrics: () => null,
      getSessionId: () => null,
      isRecording: () => false
    };
  }
  
  return sajko;
}

/**
 * Composable for tracking page views
 * 
 * @param pageName - Page name or path
 * @param properties - Additional properties
 * 
 * @example
 * ```vue
 * <script setup>
 * import { usePageView } from '@sajko/vue';
 * 
 * usePageView('/products', { category: 'electronics' });
 * </script>
 * ```
 */
export function usePageView(
  pageName?: string | Ref<string>,
  properties?: Record<string, any> | Ref<Record<string, any>>
): void {
  const { track } = useSajko();
  
  onMounted(() => {
    const page = typeof pageName === 'string' ? pageName : pageName?.value;
    const props = properties && 'value' in properties ? properties.value : properties;
    
    track('page_view', {
      page: page || window.location.pathname,
      url: window.location.href,
      title: document.title,
      ...props
    });
  });
}

/**
 * Composable for tracking metrics with auto-refresh
 * 
 * @param interval - Refresh interval in milliseconds
 * @returns Reactive metrics ref
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useMetrics } from '@sajko/vue';
 * 
 * const metrics = useMetrics(5000); // Refresh every 5 seconds
 * </script>
 * 
 * <template>
 *   <div v-if="metrics">
 *     <p>Session: {{ metrics.sessionId }}</p>
 *     <p>Queue: {{ metrics.queueSize }}</p>
 *   </div>
 * </template>
 * ```
 */
export function useMetrics(interval?: number): Ref<SajkoMetrics | null> {
  const { getMetrics } = useSajko();
  const metrics = ref<SajkoMetrics | null>(null);
  let intervalId: NodeJS.Timeout | null = null;
  
  const updateMetrics = () => {
    metrics.value = getMetrics();
  };
  
  onMounted(() => {
    updateMetrics();
    
    if (interval && interval > 0) {
      intervalId = setInterval(updateMetrics, interval);
    }
  });
  
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
  
  return metrics;
}

/**
 * Composable for tracking custom events
 * 
 * @returns Track function
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useTracker } from '@sajko/vue';
 * 
 * const track = useTracker();
 * 
 * const handleSubmit = () => {
 *   track('form_submit', { formId: 'contact' });
 * };
 * </script>
 * ```
 */
export function useTracker() {
  const { track } = useSajko();
  return track;
}

/**
 * Composable for user identification
 * 
 * @returns Identify function
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useIdentify } from '@sajko/vue';
 * 
 * const identify = useIdentify();
 * 
 * const handleLogin = async (email: string) => {
 *   // After successful login
 *   identify('user-123', { email, plan: 'premium' });
 * };
 * </script>
 * ```
 */
export function useIdentify() {
  const { identify } = useSajko();
  return identify;
}

/**
 * Composable for session info
 * 
 * @returns Session ID and recording status
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useSession } from '@sajko/vue';
 * 
 * const { sessionId, isRecording } = useSession();
 * </script>
 * 
 * <template>
 *   <div>
 *     <p>Session: {{ sessionId }}</p>
 *     <p v-if="isRecording">Recording active</p>
 *   </div>
 * </template>
 * ```
 */
export function useSession() {
  const { getSessionId, isRecording } = useSajko();
  
  const sessionId = ref<string | null>(null);
  const recording = ref(false);
  
  onMounted(() => {
    sessionId.value = getSessionId();
    recording.value = isRecording();
  });
  
  return {
    sessionId,
    isRecording: recording
  };
}