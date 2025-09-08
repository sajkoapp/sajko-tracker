import { SajkoConfig, SajkoReplay, LoaderOptions } from './types';

/**
 * SajkoLoader - Handles dynamic loading of the SAJKO replay script
 */
export class SajkoLoader {
  private static instance: SajkoLoader | null = null;
  private scriptPromise: Promise<void> | null = null;
  private config: SajkoConfig;
  private options: LoaderOptions;
  private isLoaded: boolean = false;
  
  constructor(config: SajkoConfig, options: LoaderOptions = {}) {
    this.config = config;
    this.options = {
      cdnUrl: options.cdnUrl || this.getDefaultCdnUrl(),
      version: options.version || 'v4',
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(config: SajkoConfig, options?: LoaderOptions): SajkoLoader {
    if (!SajkoLoader.instance) {
      SajkoLoader.instance = new SajkoLoader(config, options);
    }
    return SajkoLoader.instance;
  }
  
  /**
   * Load the SAJKO script and initialize tracking
   */
  async load(): Promise<SajkoReplay> {
    // If already loading, wait for existing promise
    if (this.scriptPromise) {
      await this.scriptPromise;
      return this.waitForReplay();
    }
    
    // If already loaded, return existing instance
    if (this.isLoaded && window.SajkoReplay) {
      return window.SajkoReplay;
    }
    
    // Start loading process
    this.scriptPromise = this.loadWithRetry();
    await this.scriptPromise;
    
    return this.waitForReplay();
  }
  
  /**
   * Load script with retry logic
   */
  private async loadWithRetry(attempt: number = 1): Promise<void> {
    try {
      await this.loadScript();
      this.isLoaded = true;
    } catch (error) {
      if (attempt < this.options.retryAttempts!) {
        console.warn(`SAJKO: Load attempt ${attempt} failed, retrying...`);
        await this.delay(this.options.retryDelay!);
        return this.loadWithRetry(attempt + 1);
      }
      throw new Error(`Failed to load SAJKO script after ${attempt} attempts: ${error}`);
    }
  }
  
  /**
   * Load the script into the DOM
   */
  private async loadScript(): Promise<void> {
    // Set global config first
    window.sajkoConfig = this.config;
    
    // Determine script URL
    const scriptUrl = this.getScriptUrl();
    
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset.websiteId = this.config.websiteId;
      
      // Add data attributes for fallback configuration
      if (this.config.apiEndpoint) {
        script.dataset.apiEndpoint = this.config.apiEndpoint;
      }
      if (this.config.hasUserConsent !== undefined) {
        script.dataset.userConsent = String(this.config.hasUserConsent);
      }
      if (this.config.debug !== undefined) {
        script.dataset.debug = String(this.config.debug);
      }
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Script load timeout after ${this.options.timeout}ms`));
      }, this.options.timeout!);
      
      // Handle load success
      script.onload = () => {
        clearTimeout(timeoutId);
        console.log('SAJKO: Script loaded successfully');
        resolve();
      };
      
      // Handle load error
      script.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(error);
      };
      
      // Append to document
      document.head.appendChild(script);
    });
  }
  
  /**
   * Wait for SajkoReplay to be available on window
   */
  private async waitForReplay(maxWait: number = 5000): Promise<SajkoReplay> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (window.SajkoReplay) {
        return window.SajkoReplay;
      }
      await this.delay(100);
    }
    
    throw new Error('SajkoReplay not available after script load');
  }
  
  /**
   * Get the default CDN URL based on environment
   */
  private getDefaultCdnUrl(): string {
    // Use configured API endpoint or default
    const baseUrl = this.config.apiEndpoint || 'https://app.sajko.sk';
    return baseUrl;
  }
  
  /**
   * Get the full script URL
   */
  private getScriptUrl(): string {
    const baseUrl = this.options.cdnUrl || this.getDefaultCdnUrl();
    const version = this.options.version;
    
    // If CDN URL is provided, use versioned path
    if (this.options.cdnUrl) {
      return `${baseUrl}/${version}/sajko-replay.min.js`;
    }
    
    // Otherwise use the standard path from API endpoint
    return `${baseUrl}/sajko-replay-v4.js`;
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<SajkoConfig>): void {
    this.config = { ...this.config, ...config };
    if (window.sajkoConfig) {
      window.sajkoConfig = this.config;
    }
  }
  
  /**
   * Check if script is loaded
   */
  isScriptLoaded(): boolean {
    return this.isLoaded && !!window.SajkoReplay;
  }
  
  /**
   * Unload the script and clean up
   */
  unload(): void {
    // Stop recording if active
    if (window.SajkoReplay?.isRecording) {
      window.SajkoReplay.stop();
    }
    
    // Remove script from DOM
    const scriptUrl = this.getScriptUrl();
    const script = document.querySelector(`script[src="${scriptUrl}"]`);
    if (script) {
      script.remove();
    }
    
    // Clean up global references
    delete window.SajkoReplay;
    delete window.sajkoConfig;
    delete window.__sajkoRecorderV4Instance;
    
    // Reset state
    this.isLoaded = false;
    this.scriptPromise = null;
    SajkoLoader.instance = null;
  }
}