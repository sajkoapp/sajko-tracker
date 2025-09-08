/**
 * @sajko/tracker - Core tracking library
 * 
 * Provides a modern TypeScript wrapper around the SAJKO replay script
 */

import { SajkoLoader } from './loader';
import { 
  SajkoConfig, 
  SajkoReplay, 
  SajkoMetrics,
  TrackingEvent, 
  UserTraits, 
  LoaderOptions 
} from './types';

// Re-export types
export * from './types';
export { SajkoLoader };

// Global instance reference
let sajkoInstance: SajkoReplay | null = null;
let loaderInstance: SajkoLoader | null = null;

/**
 * Initialize SAJKO tracking
 * 
 * @param config - Configuration object
 * @param options - Loader options
 * @returns Promise resolving to SajkoReplay instance
 * 
 * @example
 * ```typescript
 * const sajko = await init({
 *   websiteId: 'your-website-id',
 *   apiEndpoint: 'https://api.sajko.sk',
 *   hasUserConsent: true
 * });
 * ```
 */
export async function init(
  config: SajkoConfig, 
  options?: LoaderOptions
): Promise<SajkoReplay> {
  // Return existing instance if already initialized
  if (sajkoInstance && loaderInstance?.isScriptLoaded()) {
    console.log('SAJKO: Already initialized, returning existing instance');
    return sajkoInstance;
  }
  
  // Validate required config
  if (!config.websiteId) {
    throw new Error('SAJKO: websiteId is required in configuration');
  }
  
  // Create loader and load script
  loaderInstance = SajkoLoader.getInstance(config, options);
  sajkoInstance = await loaderInstance.load();
  
  console.log('SAJKO: Initialized successfully', {
    sessionId: sajkoInstance.sessionId,
    version: sajkoInstance.version,
    useWasm: sajkoInstance.useWasm
  });
  
  return sajkoInstance;
}

/**
 * Track a custom event
 * 
 * @param event - Event name
 * @param properties - Event properties
 * 
 * @example
 * ```typescript
 * track('button_click', { 
 *   button: 'cta',
 *   page: 'homepage' 
 * });
 * ```
 */
export function track(event: string, properties?: Record<string, any>): void {
  if (!sajkoInstance) {
    console.warn('SAJKO: Not initialized. Call init() first.');
    return;
  }
  
  if (sajkoInstance.trackEvent) {
    sajkoInstance.trackEvent(event, properties);
  } else {
    console.warn('SAJKO: trackEvent method not available');
  }
}

/**
 * Identify a user
 * 
 * @param userId - User identifier
 * @param traits - User traits/properties
 * 
 * @example
 * ```typescript
 * identify('user-123', {
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   plan: 'premium'
 * });
 * ```
 */
export function identify(userId: string, traits?: UserTraits): void {
  if (!sajkoInstance) {
    console.warn('SAJKO: Not initialized. Call init() first.');
    return;
  }
  
  if (sajkoInstance.identify) {
    sajkoInstance.identify(userId, traits);
  } else {
    console.warn('SAJKO: identify method not available');
  }
}

/**
 * Get current metrics
 * 
 * @returns Current tracking metrics
 * 
 * @example
 * ```typescript
 * const metrics = getMetrics();
 * console.log('Queue size:', metrics.queueSize);
 * ```
 */
export function getMetrics(): SajkoMetrics | null {
  if (!sajkoInstance) {
    console.warn('SAJKO: Not initialized. Call init() first.');
    return null;
  }
  
  return sajkoInstance.getMetrics();
}

/**
 * Flush events to server immediately
 * 
 * @example
 * ```typescript
 * await flush();
 * console.log('Events sent to server');
 * ```
 */
export async function flush(): Promise<void> {
  if (!sajkoInstance) {
    console.warn('SAJKO: Not initialized. Call init() first.');
    return;
  }
  
  await sajkoInstance.flush();
}

/**
 * Stop recording and clean up
 * 
 * @example
 * ```typescript
 * stop();
 * console.log('Recording stopped');
 * ```
 */
export function stop(): void {
  if (!sajkoInstance) {
    console.warn('SAJKO: Not initialized. Call init() first.');
    return;
  }
  
  sajkoInstance.stop();
}

/**
 * Get current session ID
 * 
 * @returns Current session ID or null
 * 
 * @example
 * ```typescript
 * const sessionId = getSessionId();
 * console.log('Current session:', sessionId);
 * ```
 */
export function getSessionId(): string | null {
  if (!sajkoInstance) {
    return null;
  }
  
  return sajkoInstance.sessionId;
}

/**
 * Get current visitor ID
 * 
 * @returns Current visitor ID or null
 * 
 * @example
 * ```typescript
 * const visitorId = getVisitorId();
 * console.log('Visitor ID:', visitorId);
 * ```
 */
export function getVisitorId(): string | null {
  if (!sajkoInstance) {
    return null;
  }
  
  return sajkoInstance.visitorId || null;
}

/**
 * Check if recording is active
 * 
 * @returns Whether recording is currently active
 * 
 * @example
 * ```typescript
 * if (isRecording()) {
 *   console.log('Currently recording');
 * }
 * ```
 */
export function isRecording(): boolean {
  if (!sajkoInstance) {
    return false;
  }
  
  return sajkoInstance.isRecording;
}

/**
 * Update configuration
 * 
 * @param config - Partial configuration to update
 * 
 * @example
 * ```typescript
 * updateConfig({ 
 *   debug: true,
 *   hasUserConsent: true 
 * });
 * ```
 */
export function updateConfig(config: Partial<SajkoConfig>): void {
  if (!loaderInstance) {
    console.warn('SAJKO: Not initialized. Call init() first.');
    return;
  }
  
  loaderInstance.updateConfig(config);
}

/**
 * Completely unload SAJKO and clean up
 * 
 * @example
 * ```typescript
 * unload();
 * console.log('SAJKO unloaded');
 * ```
 */
export function unload(): void {
  if (loaderInstance) {
    loaderInstance.unload();
  }
  
  sajkoInstance = null;
  loaderInstance = null;
}

/**
 * Get the current SAJKO instance
 * 
 * @returns Current SajkoReplay instance or null
 */
export function getInstance(): SajkoReplay | null {
  return sajkoInstance;
}

// Default export with all functions
export default {
  init,
  track,
  identify,
  getMetrics,
  flush,
  stop,
  getSessionId,
  getVisitorId,
  isRecording,
  updateConfig,
  unload,
  getInstance
};