/**
 * SAJKO Tracker TypeScript Definitions
 * Matches the API of sajko-replay-v4.js
 */

export interface SajkoConfig {
  /** Unique identifier for the website */
  websiteId: string;
  
  /** API endpoint for sending data */
  apiEndpoint?: string;
  
  /** Whether user has given consent for tracking */
  hasUserConsent?: boolean;
  
  /** Enable debug mode for verbose logging */
  debug?: boolean;
  
  /** URL for WASM module (optional) */
  wasmUrl?: string;
  
  /** Performance configuration */
  performance?: {
    /** Maximum memory usage in MB */
    maxMemoryMB?: number;
    /** Maximum CPU usage percentage */
    maxCPUPercent?: number;
    /** Mouse movement sampling rate in ms */
    mouseSampleRate?: number;
    /** Scroll event sampling rate in ms */
    scrollSampleRate?: number;
    /** Batch sending interval in ms */
    batchIntervalMs?: number;
    /** Maximum events in queue before flush */
    eventQueueSize?: number;
  };
  
  /** Privacy configuration */
  privacy?: {
    /** Enable PII masking */
    enablePIIMasking?: boolean;
    /** CSS selectors for elements to mask */
    maskSelectors?: string[];
  };
  
  /** Shopify-specific configuration */
  shopify?: {
    shop?: string;
    currency?: string;
    customerId?: string;
  };
}

export interface SajkoMetrics {
  /** Current session ID */
  sessionId: string;
  /** Whether recording is active */
  isRecording: boolean;
  /** Number of events in queue */
  queueSize: number;
  /** Whether WASM is loaded */
  hasWasm: boolean;
  /** Additional WASM metrics if available */
  wasmMetrics?: {
    memoryUsage?: number;
    compressionRatio?: number;
    eventsProcessed?: number;
  };
}

export interface SajkoReplay {
  /** Start recording session */
  start: () => Promise<void>;
  
  /** Stop recording session */
  stop: () => void;
  
  /** Flush events to server */
  flush: () => Promise<void>;
  
  /** Current recording status */
  isRecording: boolean;
  
  /** Current session ID */
  sessionId: string;
  
  /** Current visitor ID */
  visitorId?: string;
  
  /** Get current metrics */
  getMetrics: () => SajkoMetrics;
  
  /** Library version */
  version: string;
  
  /** Whether WASM is enabled */
  useWasm: boolean;
  
  /** Track custom event */
  trackEvent?: (eventName: string, data?: any) => void;
  
  /** Identify user */
  identify?: (userId: string, traits?: any) => void;
}

export interface TrackingEvent {
  /** Event name */
  event: string;
  /** Event properties */
  properties?: Record<string, any>;
  /** Timestamp */
  timestamp?: number;
}

export interface UserTraits {
  /** User email */
  email?: string;
  /** User name */
  name?: string;
  /** User ID in your system */
  userId?: string;
  /** Custom properties */
  [key: string]: any;
}

export interface LoaderOptions {
  /** Custom CDN URL for the script */
  cdnUrl?: string;
  /** Script version to load */
  version?: string;
  /** Timeout for script loading in ms */
  timeout?: number;
  /** Retry attempts if loading fails */
  retryAttempts?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
}

// Window augmentation for global access
declare global {
  interface Window {
    sajkoConfig?: SajkoConfig;
    SajkoReplay?: SajkoReplay;
    __sajkoRecorderV4Instance?: any;
    Go?: any; // For WASM support
    WASMBridge?: any; // WASM bridge class
  }
}