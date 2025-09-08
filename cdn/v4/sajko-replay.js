/**
 * SAJKO Session Replay V4 - Go-Powered High-Performance Edition
 * 
 * Combines Go WASM processing with JavaScript DOM operations
 * 70% smaller payloads, 10x faster processing, 50% less memory
 * 
 * @version 4.0.0
 * @author SAJKO Team
 */

(function() {
  'use strict';
  
  // Prevent duplicate initialization
  if (window.__sajkoRecorderV4Instance) {
    console.log('🔄 SAJKO V4: Recorder already initialized');
    return;
  }

  const instanceId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  console.log('🚀 SAJKO V4: Initializing Go-powered recorder', { instanceId });

  // Get configuration from multiple sources for platform compatibility
  function getConfig() {
    // First check window.sajkoConfig (for React/programmatic setup)
    if (window.sajkoConfig) {
      return window.sajkoConfig;
    }
    
    // Fallback to data attributes (for WordPress/HTML/Shopify)
    const script = document.currentScript || document.querySelector('script[data-website-id]');
    if (script) {
      return {
        websiteId: script.getAttribute('data-website-id'),
        apiEndpoint: script.getAttribute('data-api-endpoint') || 'https://api.sajko.ai',
        hasUserConsent: script.getAttribute('data-user-consent') === 'true',
        debug: script.getAttribute('data-debug') === 'true'
      };
    }
    
    return {};
  }

  const config = getConfig();

  // Configuration
  const CONFIG = {
    apiEndpoint: config.apiEndpoint || 'https://api.sajko.ai',
    websiteId: config.websiteId,
    hasUserConsent: config.hasUserConsent || false,
    debug: config.debug || false,
    wasmUrl: config.wasmUrl || (config.apiEndpoint || 'https://api.sajko.ai') + '/sajko-replay.wasm',
    
    performance: {
      maxMemoryMB: 25,
      maxCPUPercent: 3,
      mouseSampleRate: 20,
      scrollSampleRate: 30,
      batchIntervalMs: 8000,
      eventQueueSize: 50
    },
    
    privacy: {
      enablePIIMasking: true,
      maskSelectors: [
        'input[type="password"]',
        '[data-sensitive]',
        '.sensitive'
      ]
    }
  };

  // Load required scripts
  async function loadDependencies() {
    const baseUrl = CONFIG.apiEndpoint;
    console.log('📦 SAJKO V4: Loading dependencies from:', baseUrl);
    
    // Load wasm_exec.js if not already loaded
    if (!window.Go) {
      console.log('📦 SAJKO V4: Loading wasm_exec.js...');
      try {
        await loadScript(baseUrl + '/wasm_exec.js');
        console.log('✅ SAJKO V4: wasm_exec.js loaded');
      } catch (error) {
        console.error('❌ SAJKO V4: Failed to load wasm_exec.js:', error);
        throw error;
      }
    }
    
    // Load WASM bridge
    if (!window.WASMBridge) {
      console.log('📦 SAJKO V4: Loading wasm-bridge.js...');
      try {
        await loadScript(baseUrl + '/wasm-bridge.js');
        console.log('✅ SAJKO V4: wasm-bridge.js loaded');
      } catch (error) {
        console.error('❌ SAJKO V4: Failed to load wasm-bridge.js:', error);
        throw error;
      }
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Main Recorder Class (Hybrid Go + JS)
  class SajkoSessionRecorderV4 {
    constructor() {
      this.sessionId = this.getOrCreateSessionId();
      this.visitorId = this.getOrCreateVisitorId();
      this.isRecording = false;
      this.eventQueue = [];
      this.wasmBridge = null;
      this.lastActivityTime = 0;
      this.currentPageNumber = 1;
      this.sessionStartTime = Date.now();
      
      // Performance optimization
      this.lastMouseMove = 0;
      this.lastScroll = 0;
      this.mouseSampleRate = 50;
      this.scrollSampleRate = 100;
      
      // DOM tracking (stays in JS)
      this.mutationObserver = null;
      this.eventCleanup = [];
      
      // Media URL tracking
      this.mediaTracker = null;
      this.trackedMediaUrls = new Map();
      
      console.log('🎬 SAJKO V4 Recorder initialized');
    }

    async initialize() {
      try {
        if (!CONFIG.hasUserConsent) {
          console.warn('⚠️ SAJKO V4: User consent required');
          return false;
        }

        if (!CONFIG.websiteId) {
          console.error('❌ SAJKO V4: Website ID required');
          return false;
        }
        
        // Check if WASMBridge is available
        if (typeof WASMBridge === 'undefined') {
          console.error('❌ SAJKO V4: WASMBridge not loaded');
          throw new Error('WASMBridge class not available');
        }

        // Initialize WASM bridge
        console.log('🔧 SAJKO V4: Initializing WASM bridge...');
        this.wasmBridge = new WASMBridge();
        await this.wasmBridge.initialize();
        console.log('✅ SAJKO V4: WASM bridge ready');

        // Create session
        await this.createSession();
        
        // Initialize media tracking
        this.initializeMediaTracking();
        
        // Start recording
        this.startRecording();
        
        console.log('✅ SAJKO V4: Recording started', {
          sessionId: this.sessionId,
          visitorId: this.visitorId,
          useWasm: true
        });

        return true;
      } catch (error) {
        console.error('❌ SAJKO V4: Failed to initialize:', error);
        // Fallback to v3 if WASM fails
        this.startRecordingFallback();
        return false;
      }
    }

    async createSession() {
      const deviceInfo = this.detectDevice();
      const sessionData = {
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        websiteId: CONFIG.websiteId,
        startTime: new Date().toISOString(),
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          deviceType: deviceInfo.deviceType,
          browserName: deviceInfo.browserName,
          browserVersion: deviceInfo.browserVersion,
          osName: deviceInfo.osName,
          osVersion: deviceInfo.osVersion,
          screenResolution: deviceInfo.screenResolution,
          viewportSize: deviceInfo.viewportSize
        },
        pageInfo: {
          initialUrl: window.location.href,
          referrer: document.referrer || null,
          title: document.title
        },
        initialUrl: window.location.href  // Also include at root level for backward compatibility
      };
      
      console.log('🔄 SAJKO V4: Creating session with data:', sessionData);

      try {
        const response = await fetch(`${CONFIG.apiEndpoint}/api/session-replay`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(sessionData)
        });

        const responseText = await response.text();
        console.log('📡 SAJKO V4: Session creation response:', response.status, responseText);

        if (!response.ok) {
          throw new Error(`Session creation failed: ${response.status} - ${responseText}`);
        }

        console.log('✅ SAJKO V4: Session created successfully');
      } catch (error) {
        console.error('❌ SAJKO V4: Session creation failed:', error);
        // Don't continue if session creation fails
        throw error;
      }
    }

    startRecording() {
      this.isRecording = true;
      this.lastActivityTime = Date.now();
      
      // Setup DOM observation (stays in JS)
      this.startDOMObservation();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Start batch timer
      this.startBatchTimer();
      
      // Start heartbeat for keeping flows active
      this.startFlowHeartbeat();
      
      // Capture initial snapshot
      this.captureSnapshot(); // Fire and forget - no need to await
      
      // Send initial page view for flow tracking
      this.trackFlowEvent('page_view', { 
        target: document 
      }, {
        isInitialLoad: true,
        referrer: document.referrer
      });
      
      // Capture initial performance metrics
      this.capturePerformanceMetrics();
    }
    
    startFlowHeartbeat() {
      // Clear any existing heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      // Send heartbeat every 30 seconds to keep flows active
      this.heartbeatInterval = setInterval(() => {
        if (this.isRecording && !document.hidden) {
          this.sendFlowHeartbeat();
        }
      }, 30000); // 30 seconds
    }
    
    sendFlowHeartbeat() {
      if (!this.sessionId || !this.visitorId || !CONFIG.websiteId) return;
      
      const heartbeatData = {
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        websiteId: CONFIG.websiteId,
        eventType: 'heartbeat',
        pageUrl: window.location.href,
        pageTitle: document.title,
        timestamp: new Date().toISOString()
      };
      
      // Send heartbeat as fire-and-forget
      fetch(`${CONFIG.apiEndpoint}/api/flows/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heartbeatData),
        keepalive: true
      }).catch(() => {
        // Ignore errors - heartbeat is non-critical
      });
    }

    startRecordingFallback() {
      // Fallback to basic recording without WASM
      console.log('⚠️ SAJKO V4: Using fallback mode (no WASM)');
      this.isRecording = true;
      this.setupEventListeners();
      this.startBatchTimer();
    }

    setupEventListeners() {
      // Mouse events
      this.addEventListener(document, 'mousemove', this.handleMouseMove.bind(this));
      this.addEventListener(document, 'click', this.handleClick.bind(this));
      
      // Keyboard events  
      this.addEventListener(document, 'keydown', this.handleKeyboard.bind(this));
      
      // Scroll events
      this.addEventListener(window, 'scroll', this.handleScroll.bind(this));
      
      // Form events
      this.addEventListener(document, 'input', this.handleInput.bind(this), true);
      this.addEventListener(document, 'submit', this.handleFormSubmit.bind(this), true);
      
      // Page lifecycle - multiple exit detection methods for reliability
      this.addEventListener(window, 'beforeunload', this.handleUnload.bind(this));
      this.addEventListener(window, 'pagehide', this.handlePageHide.bind(this));
      this.addEventListener(window, 'unload', this.handleUnload.bind(this));
      this.addEventListener(document, 'visibilitychange', this.handleVisibilityChange.bind(this));
      
      // Navigation events for multi-page support
      this.addEventListener(window, 'popstate', this.handlePopState.bind(this));
      this.addEventListener(window, 'hashchange', this.handleHashChange.bind(this));
      
      // Intercept history API for SPA navigation
      this.interceptHistoryAPI();
      
      // Monitor for SPA framework navigation (React/Next.js)
      this.setupSPANavigationDetection();
    }

    startPerformanceMonitoring() {
      // Monitor DOM content loaded
      if (document.readyState === 'loading') {
        this.addEventListener(document, 'DOMContentLoaded', () => {
          this.recordEvent({
            type: 'dom_content_loaded',
            timestamp: Date.now(),
            data: {
              loadTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            }
          });
        });
      }
      
      // Monitor page load
      this.addEventListener(window, 'load', () => {
        this.recordEvent({
          type: 'page_load',
          timestamp: Date.now(),
          data: {
            loadTime: (performance.timing.loadEventEnd - performance.timing.navigationStart) / 1000
          }
        });
      });
      
      // Setup PerformanceObserver for paint timing
      if (window.PerformanceObserver) {
        try {
          // Observe paint timing
          const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                this.recordEvent({
                  type: 'performance_mark',
                  timestamp: Date.now(),
                  data: {
                    name: 'first-contentful-paint',
                    time: entry.startTime / 1000
                  }
                });
              } else if (entry.name === 'largest-contentful-paint') {
                this.recordEvent({
                  type: 'performance_mark',
                  timestamp: Date.now(),
                  data: {
                    name: 'largest-contentful-paint',
                    time: entry.startTime / 1000
                  }
                });
              }
            }
          });
          paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
          
          // Observe resource timing for API calls
          const resourceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
                this.recordEvent({
                  type: 'api_call',
                  timestamp: Date.now(),
                  data: {
                    url: entry.name,
                    duration: entry.duration,
                    method: entry.initiatorType,
                    size: entry.transferSize || 0
                  }
                });
              }
            }
          });
          resourceObserver.observe({ entryTypes: ['resource'] });
          
        } catch (error) {
          console.log('⚠️ SAJKO V4: PerformanceObserver not supported:', error);
        }
      }
    }
    
    capturePerformanceMetrics() {
      // Capture Navigation Timing metrics if available
      if (performance.timing) {
        const timing = performance.timing;
        const navigationStart = timing.navigationStart;
        
        // Calculate Time to Interactive (approximation)
        const tti = timing.domInteractive - navigationStart;
        if (tti > 0) {
          this.recordEvent({
            type: 'performance_mark',
            timestamp: Date.now(),
            data: {
              name: 'time-to-interactive',
              time: tti / 1000
            }
          });
        }
        
        // Get existing paint entries
        if (performance.getEntriesByType) {
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              this.recordEvent({
                type: 'performance_mark',
                timestamp: Date.now(),
                data: {
                  name: 'first-contentful-paint',
                  time: entry.startTime / 1000
                }
              });
            }
          });
        }
      }
    }

    addEventListener(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      this.eventCleanup.push(() => target.removeEventListener(type, listener, options));
    }
    
    recordEvent(eventData) {
      // Add event to queue for batch processing
      if (this.eventQueue && this.isRecording) {
        this.eventQueue.push(eventData);
        this.lastActivityTime = Date.now();
      }
    }

    async handleMouseMove(event) {
      const now = performance.now();
      if (now - this.lastMouseMove < this.mouseSampleRate) return;
      
      const eventData = {
        type: 'mouse_move',
        clientX: event.clientX,
        clientY: event.clientY,
        timestamp: Date.now()
      };
      
      await this.addEvent(eventData);
      this.lastMouseMove = now;
    }

    async handleClick(event) {
      const eventData = {
        type: 'mouse_click',
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.getElementSelector(event.target),
        timestamp: Date.now()
      };
      
      await this.addEvent(eventData);
      
      // Track click for flow detection
      this.trackFlowEvent('click', event);
    }

    async handleScroll(event) {
      const now = performance.now();
      if (now - this.lastScroll < this.scrollSampleRate) return;
      
      const eventData = {
        type: 'scroll',
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        timestamp: Date.now()
      };
      
      await this.addEvent(eventData);
      this.lastScroll = now;
    }

    async handleKeyboard(event) {
      const eventData = {
        type: 'keyboard_input',
        key: event.key,
        target: this.getElementSelector(event.target),
        timestamp: Date.now()
      };
      
      await this.addEvent(eventData);
    }

    async handleInput(event) {
      const target = event.target;
      const value = this.shouldMaskInput(target) ? '[MASKED]' : target.value;
      
      const eventData = {
        type: 'form_input',
        target: this.getElementSelector(target),
        value: value,
        timestamp: Date.now()
      };
      
      await this.addEvent(eventData);
    }
    
    async handleFormSubmit(event) {
      const form = event.target;
      const formData = {
        type: 'form_submit',
        target: this.getElementSelector(form),
        formId: form.id || null,
        formAction: form.action || null,
        formMethod: form.method || 'GET',
        timestamp: Date.now()
      };
      
      await this.addEvent(formData);
      
      // Track form submission for flow detection (potential conversion)
      this.trackFlowEvent('form_submit', event, {
        formId: form.id,
        formAction: form.action
      });
    }

    // Flow tracking method - sends events to flow detection endpoint
    async trackFlowEvent(eventType, event, additionalData = {}) {
      try {
        // Get target element details
        const target = event?.target;
        let selector = null;
        let elementText = null;
        let elementType = null;
        
        if (target && target !== window && target !== document) {
          selector = this.getElementSelector(target);
          elementText = target.innerText || target.textContent || target.value || '';
          elementType = target.tagName ? target.tagName.toLowerCase() : null;
          
          // Truncate text to reasonable length
          if (elementText && elementText.length > 100) {
            elementText = elementText.substring(0, 100) + '...';
          }
        }
        
        const flowData = {
          sessionId: this.sessionId,
          visitorId: this.visitorId || this.sessionId, // Use sessionId as fallback
          websiteId: CONFIG.websiteId,
          eventType: eventType,
          selector: selector,
          elementText: elementText,
          elementType: elementType,
          pageUrl: window.location.href,
          pageTitle: document.title,
          coordinates: event?.clientX ? { x: event.clientX, y: event.clientY } : null,
          timestamp: new Date().toISOString(),
          ...additionalData
        };
        
        // Send to flow tracking endpoint
        fetch(`${CONFIG.apiEndpoint}/api/flows/track`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(flowData),
          keepalive: true // Ensure request completes even if page unloads
        }).catch(err => {
          console.log('🔄 SAJKO V4: Flow tracking sent (fire-and-forget)');
        });
        
      } catch (error) {
        console.log('⚠️ SAJKO V4: Flow tracking error (non-critical):', error.message);
      }
    }

    handleUnload(event) {
      // Improved duplicate prevention with time-based check
      const sessionExitKey = `sajko_exit_${this.sessionId}`;
      const recentExit = sessionStorage.getItem(sessionExitKey);
      
      if (recentExit && Date.now() - parseInt(recentExit) < 1000) {
        console.log('🚫 SAJKO V4: Exit event already sent, skipping duplicate');
        return;
      }
      
      // Calculate session duration
      const currentTimestamp = Date.now();
      const sessionDuration = Math.round((currentTimestamp - this.sessionStartTime) / 1000);
      
      console.log('🚪 SAJKO V4: Page unload detected', {
        queueLength: this.eventQueue.length,
        sessionDuration: sessionDuration,
        sessionId: this.sessionId
      });
      
      // Add final scroll position if needed
      if (window.scrollY > 0) {
        // Directly push to queue for synchronous operation
        this.eventQueue.push({
          type: 'scroll',
          timestamp: currentTimestamp,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          smoothTransition: false
        });
      }
      
      // Add unload event directly to queue (synchronously)
      this.eventQueue.push({
        type: 'page_unload',
        timestamp: currentTimestamp,
        data: {
          finalScrollX: window.scrollX,
          finalScrollY: window.scrollY,
          pageUrl: window.location.href,
          sessionDuration: sessionDuration,
          userAgent: navigator.userAgent
        }
      });
      
      console.log('📋 SAJKO V4: Added page_unload event, final queue length:', this.eventQueue.length);
      console.log('📋 SAJKO V4: Queue contains:', this.eventQueue.map(e => e.type));
      
      // Flush events synchronously first
      this.flushEventsSync();
      
      // Then send session completion with duration
      this.sendSessionCompletion();
      
      // Mark exit as sent with timestamp for time-based duplicate prevention
      sessionStorage.setItem(`sajko_exit_${this.sessionId}`, Date.now().toString());
    }

    handlePageHide(event) {
      // Prevent duplicate exit events
      const exitEventKey = `sajko_v4_exit_sent_${window.location.href}`;
      if (sessionStorage.getItem(exitEventKey)) {
        console.log('🚫 SAJKO V4: Exit event already sent from page_hide, skipping duplicate');
        return;
      }
      
      const currentTimestamp = Date.now();
      const sessionDuration = Math.round((currentTimestamp - this.sessionStartTime) / 1000);
      
      console.log('🫥 SAJKO V4: Page hide detected', {
        persisted: event.persisted,
        sessionDuration: sessionDuration
      });
      
      // pagehide is more reliable than beforeunload, especially on mobile
      // Directly push to queue for synchronous operation
      this.eventQueue.push({
        type: 'page_hide',
        timestamp: currentTimestamp,
        data: {
          persisted: event.persisted,
          finalScrollX: window.scrollX,
          finalScrollY: window.scrollY,
          pageUrl: window.location.href,
          sessionDuration: sessionDuration,
          userAgent: navigator.userAgent
        }
      });
      
      console.log('📋 SAJKO V4: Added page_hide event, queue length:', this.eventQueue.length);
      
      // Flush events synchronously
      this.flushEventsSync();
      
      // Send session completion with duration
      this.sendSessionCompletion();
      
      // Mark exit as sent AFTER flushing to prevent blocking subsequent calls
      sessionStorage.setItem(exitEventKey, Date.now().toString());
    }

    sendSessionCompletion() {
      if (!this.sessionId) return;

      const completionData = {
        endTime: new Date().toISOString(),
        duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
        isCompleted: true
      };

      // Use sendBeacon for reliability with the correct /update endpoint
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(completionData)], { type: 'application/json' });
        navigator.sendBeacon(
          `${CONFIG.apiEndpoint}/api/session-replay/${this.sessionId}/update`,
          blob
        );
      } else {
        // Fallback to sync XHR
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${CONFIG.apiEndpoint}/api/session-replay/${this.sessionId}/update`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(completionData));
      }

      console.log('📋 SAJKO V4: Session completion sent', completionData);
      
      // Also send page_exit event to flow tracking
      this.sendFlowExitEvent();
    }
    
    sendFlowExitEvent(reason = 'page_unload') {
      if (!this.sessionId || !this.visitorId || !this.websiteId) return;
      
      const exitData = {
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        websiteId: this.websiteId,
        eventType: 'page_exit',
        exitReason: reason,
        pageUrl: window.location.href,
        pageTitle: document.title,
        timestamp: new Date().toISOString()
      };
      
      console.log('🚪 SAJKO V4: Sending flow exit event', { reason });
      
      // Use sendBeacon for reliability on page exit
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(exitData)], { type: 'application/json' });
        const sent = navigator.sendBeacon(
          `${CONFIG.apiEndpoint}/api/flows/track`,
          blob
        );
        console.log('🚪 SAJKO V4: Flow exit event sent via beacon:', sent);
      } else {
        // Fallback to sync XHR for older browsers
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${CONFIG.apiEndpoint}/api/flows/track`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(exitData));
        console.log('🚪 SAJKO V4: Flow exit event sent via XHR');
      }
    }

    handleVisibilityChange(event) {
      this.addEvent({
        type: 'visibility_change',
        hidden: document.hidden,
        timestamp: Date.now()
      });
      
      if (document.hidden) {
        // Tab became hidden - start abandonment timer
        this.flushEvents();
        
        // Clear any existing timer
        if (this.visibilityTimer) {
          clearTimeout(this.visibilityTimer);
        }
        
        // Set timer to abandon after 2 minutes of being hidden
        this.visibilityTimer = setTimeout(() => {
          console.log('🫥 SAJKO V4: Tab hidden for 2 minutes, sending abandonment');
          this.sendFlowExitEvent('tab_hidden_timeout');
        }, 120000); // 2 minutes
        
      } else {
        // Tab became visible - cancel abandonment timer
        if (this.visibilityTimer) {
          clearTimeout(this.visibilityTimer);
          this.visibilityTimer = null;
          console.log('👁️ SAJKO V4: Tab visible again, cancelling abandonment timer');
        }
      }
    }

    // Navigation handling for multi-page support
    async handlePageNavigation(navigationType, fromUrl, toUrl, additionalData = {}) {
      console.log('🗺️ SAJKO V4: Page navigation detected', { 
        type: navigationType, 
        from: fromUrl, 
        to: toUrl,
        pageNumber: this.currentPageNumber
      });
      
      // Check if navigating to external domain
      try {
        const fromDomain = new URL(fromUrl).hostname;
        const toDomain = new URL(toUrl).hostname;
        
        if (fromDomain !== toDomain) {
          console.log('🌐 SAJKO V4: External navigation detected, sending exit event');
          this.sendFlowExitEvent('external_navigation');
        }
      } catch (e) {
        // URL parsing failed, ignore
      }
      
      // Capture final snapshot of current page before navigation
      await this.captureSnapshot('page_exit');
      
      // Record navigation event
      await this.addEvent({
        type: 'page_navigation',
        timestamp: Date.now(),
        navigationType: navigationType,
        fromUrl: fromUrl,
        toUrl: toUrl,
        pageNumber: this.currentPageNumber,
        ...additionalData
      });
      
      // Track navigation for flow detection
      this.trackFlowEvent('navigation', {
        target: window
      }, {
        fromUrl: fromUrl,
        toUrl: toUrl,
        navigationType: navigationType
      });
      
      // Increment page number for new page
      this.currentPageNumber++;
      
      // If it's a SPA navigation, capture new page snapshot after DOM settles
      if (navigationType === 'spa_route_change' || navigationType === 'pushstate' || navigationType === 'replacestate') {
        setTimeout(() => {
          this.captureSnapshot('page_entry');
          // Track page view for flow detection after navigation
          this.trackFlowEvent('page_view', { target: document });
        }, 100);
      }
    }
    
    handlePopState(event) {
      const fromUrl = this.lastUrl || window.location.href;
      const toUrl = window.location.href;
      this.lastUrl = toUrl;
      
      this.handlePageNavigation('popstate', fromUrl, toUrl, {
        state: event.state
      });
    }
    
    handleHashChange(event) {
      this.handlePageNavigation('hashchange', event.oldURL, event.newURL);
    }
    
    interceptHistoryAPI() {
      const self = this;
      
      // Store original methods
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      // Override pushState
      history.pushState = function(state, title, url) {
        const fromUrl = window.location.href;
        const result = originalPushState.apply(history, arguments);
        const toUrl = window.location.href;
        
        if (fromUrl !== toUrl) {
          self.handlePageNavigation('pushstate', fromUrl, toUrl, { state });
        }
        
        return result;
      };
      
      // Override replaceState
      history.replaceState = function(state, title, url) {
        const fromUrl = window.location.href;
        const result = originalReplaceState.apply(history, arguments);
        const toUrl = window.location.href;
        
        if (fromUrl !== toUrl) {
          self.handlePageNavigation('replacestate', fromUrl, toUrl, { state });
        }
        
        return result;
      };
      
      // Store initial URL
      this.lastUrl = window.location.href;
    }
    
    setupSPANavigationDetection() {
      const self = this;
      let lastPathname = window.location.pathname;
      let lastSearch = window.location.search;
      
      // Monitor for URL changes via MutationObserver (catches framework router changes)
      const observer = new MutationObserver(() => {
        const currentPathname = window.location.pathname;
        const currentSearch = window.location.search;
        
        if (currentPathname !== lastPathname || currentSearch !== lastSearch) {
          const fromUrl = lastPathname + lastSearch;
          const toUrl = currentPathname + currentSearch;
          
          self.handlePageNavigation('spa_route_change', fromUrl, toUrl, {
            framework: this.detectFramework()
          });
          
          lastPathname = currentPathname;
          lastSearch = currentSearch;
        }
      });
      
      // Start observing URL changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
      
      // Store observer for cleanup
      this.spaObserver = observer;
    }
    
    detectFramework() {
      // Detect React
      if (window.React || document.querySelector('[data-reactroot], [data-reactid], #__next')) {
        // Check for Next.js
        if (window.__NEXT_DATA__ || document.querySelector('#__next')) {
          return 'nextjs';
        }
        return 'react';
      }
      
      // Detect Vue
      if (window.Vue || document.querySelector('#app[data-v-]')) {
        return 'vue';
      }
      
      // Detect Angular
      if (window.ng || document.querySelector('[ng-version]')) {
        return 'angular';
      }
      
      return 'unknown';
    }

    async addEvent(eventData) {
      if (!this.isRecording) return;
      
      // Process through WASM if available
      if (this.wasmBridge && this.wasmBridge.isReady) {
        // Mask private data using Go
        eventData = await this.processEventWithWasm(eventData);
      }
      
      this.eventQueue.push(eventData);
      this.lastActivityTime = Date.now();
      
      // Flush if queue is full
      if (this.eventQueue.length >= CONFIG.performance.eventQueueSize) {
        this.flushEvents();
      }
    }

    async processEventWithWasm(eventData) {
      try {
        // Use Go for privacy masking
        const maskedData = this.wasmBridge.maskPrivateData(eventData);
        
        // Ensure maskedData is an object, not a string
        const eventObject = typeof maskedData === 'string' ? JSON.parse(maskedData) : maskedData;
        
        // Optimize event structure - pass array of objects
        const optimized = this.wasmBridge.optimizeEvents([eventObject]);
        
        return optimized[0] || eventData;
      } catch (error) {
        console.warn('WASM processing failed, using original:', error);
        return eventData;
      }
    }

    async flushEvents() {
      if (this.eventQueue.length === 0) return;
      
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      try {
        let payload = events;
        
        // Process batch through WASM if available
        if (this.wasmBridge && this.wasmBridge.isReady) {
          const result = await this.wasmBridge.processBatch(events);
          
          if (result.data) {
            // Send compressed data
            await this.sendCompressedBatch(result.data, events.length);
            return;
          }
        }
        
        // Send uncompressed if WASM not available
        await this.sendBatch(events);
      } catch (error) {
        console.error('❌ SAJKO V4: Failed to flush events:', error);
        // Re-queue events
        this.eventQueue.unshift(...events.slice(-10));
      }
    }

    async sendBatch(events) {
      const response = await fetch(`${CONFIG.apiEndpoint}/api/session-replay/${this.sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      
      if (response.ok) {
        console.log(`📦 SAJKO V4: Sent ${events.length} events`);
      } else {
        throw new Error(`Failed to send events: ${response.status}`);
      }
    }

    async sendCompressedBatch(compressedData, eventCount) {
      const response = await fetch(`${CONFIG.apiEndpoint}/api/session-replay/${this.sessionId}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'X-Compression': 'true',
          'X-Event-Count': eventCount.toString()
        },
        body: compressedData
      });
      
      if (response.ok) {
        console.log(`📦 SAJKO V4: Sent ${eventCount} events (compressed)`);
      } else {
        throw new Error(`Failed to send compressed events: ${response.status}`);
      }
    }

    flushEventsSync() {
      if (this.eventQueue.length === 0) {
        console.log('📦 SAJKO V4: No events to flush during unload');
        return;
      }
      
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      console.log(`📦 SAJKO V4: Sync flushing ${events.length} events before unload:`, events.map(e => e.type));
      
      try {
        const payload = JSON.stringify({ events });
        const url = `${CONFIG.apiEndpoint}/api/session-replay/${this.sessionId}/events`;
        
        console.log('🔗 SAJKO V4: Sending to URL:', url);
        console.log('📄 SAJKO V4: Event types in payload:', events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {}));
        
        // Skip sendBeacon - it's unreliable during page unload
        // Go directly to synchronous XHR which guarantees delivery
        console.log('🔄 SAJKO V4: Using sync XHR for reliable exit event delivery');
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false); // false = synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
        
        console.log(`✅ SAJKO V4: Sent ${events.length} events via sync XHR, status:`, xhr.status);
        
        if (xhr.status !== 200 && xhr.status !== 201) {
          console.error('❌ SAJKO V4: Server returned error:', xhr.status, xhr.responseText);
        }
      } catch (error) {
        console.error('❌ SAJKO V4: Sync flush failed:', error);
        // Retry one more time
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${CONFIG.apiEndpoint}/api/session-replay/${this.sessionId}/events`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({ events }));
          console.log('✅ SAJKO V4: Retry succeeded');
        } catch (retryError) {
          console.error('❌ SAJKO V4: Retry also failed:', retryError);
        }
      }
    }

    startBatchTimer() {
      setInterval(() => {
        if (this.eventQueue.length > 0) {
          this.flushEvents();
        }
      }, CONFIG.performance.batchIntervalMs);
    }

    startDOMObservation() {
      this.mutationObserver = new MutationObserver((mutations) => {
        if (!this.isRecording) return;
        this.processDOMMutations(mutations);
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }

    processDOMMutations(mutations) {
      const mutationData = {
        type: 'dom_mutation',
        timestamp: Date.now(),
        mutations: []
      };

      for (const mutation of mutations) {
        mutationData.mutations.push({
          type: mutation.type,
          target: this.getElementSelector(mutation.target)
        });
      }

      if (mutationData.mutations.length > 0) {
        this.addEvent(mutationData);
      }
    }

    cleanWordPressElements(html) {
      // Use DOMParser to preserve full document structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove WordPress admin bar
      const adminBar = doc.querySelector('#wpadminbar');
      if (adminBar) {
        adminBar.remove();
      }
      
      // Remove WordPress admin styles/scripts that might interfere
      const wpAdminElements = doc.querySelectorAll(
        '[id*="wp-admin"], [class*="wp-admin"], .admin-bar-bump, #wp-toolbar'
      );
      wpAdminElements.forEach(el => el.remove());
      
      // Remove WordPress emoji scripts
      const emojiScripts = doc.querySelectorAll('script[src*="wp-emoji"]');
      emojiScripts.forEach(el => el.remove());
      
      // Clean up ONLY admin-related body classes, preserve theme classes
      const body = doc.body;
      if (body) {
        // Only remove admin-specific classes, keep all theme classes
        body.classList.remove('admin-bar', 'wp-admin', 'wp-core-ui');
        // Remove inline margin-top that WordPress adds for admin bar
        if (body.style.marginTop === '32px' || body.style.marginTop === '46px') {
          body.style.marginTop = '';
        }
      }
      
      // Return the full document HTML with structure preserved
      // This keeps html tag, body tag with all theme classes, etc.
      return doc.documentElement.outerHTML;
    }
    
    async captureSnapshot(snapshotType = 'full') {
      // First preserve all inline styles before any manipulation
      const inlineStyles = this.captureInlineStyles();
      
      let htmlContent = document.documentElement.outerHTML;
      
      // Clean WordPress admin elements before capture
      htmlContent = this.cleanWordPressElements(htmlContent);
      
      // Capture CSS styles
      const cssData = await this.captureCSSStyles();
      
      // Extract page assets (images, backgrounds)
      const pageAssets = await this.extractPageAssets();
      
      // Capture computed styles for layout-critical elements
      const computedStyles = this.captureComputedStyles();
      
      const snapshot = {
        type: 'dom_snapshot',
        snapshotType: snapshotType, // full, page_exit, page_entry
        htmlContent: htmlContent, // No truncation - capture full HTML
        inlineStyles: inlineStyles, // Preserve all inline styles separately
        cssChanges: cssData, // Include CSS data
        pageAssets: pageAssets, // Include extracted assets
        computedStyles: computedStyles, // Include computed styles for layout
        url: window.location.href,
        pageNumber: this.currentPageNumber, // Track which page this snapshot belongs to
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timestamp: Date.now(),
        pageTitle: document.title,
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        nodeCount: document.getElementsByTagName('*').length
      };
      
      console.log('📸 SAJKO V4: Capturing snapshot, HTML size:', htmlContent.length, 'CSS size:', cssData.totalSize, 'Assets:', pageAssets.length, 'Inline styles:', inlineStyles.length);
      this.addEvent(snapshot);
    }
    
    captureInlineStyles() {
      const inlineStyles = [];
      const elements = document.querySelectorAll('[style]');
      
      elements.forEach((element, index) => {
        const selector = this.getElementSelector(element);
        const styleAttr = element.getAttribute('style');
        
        if (styleAttr) {
          // Also capture any CSS variables defined on this element
          const computed = window.getComputedStyle(element);
          const cssVars = {};
          
          // Get all CSS properties to find variables
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i];
            if (prop.startsWith('--')) {
              cssVars[prop] = computed.getPropertyValue(prop);
            }
          }
          
          inlineStyles.push({
            selector: selector,
            index: index,
            style: styleAttr,
            cssVariables: cssVars,
            // Store element ID/class for better matching
            id: element.id || null,
            className: element.className || null
          });
        }
      });
      
      return inlineStyles;
    }

    async extractPageAssets() {
      const assets = [];
      const processedUrls = new Set();
      
      // Initialize media tracking if not already done
      if (!this.mediaTracker) {
        this.initializeMediaTracking();
      }
      
      try {
        // 1. Extract <img> tags
        document.querySelectorAll('img').forEach(img => {
          if (img.src && !processedUrls.has(img.src)) {
            processedUrls.add(img.src);
            
            // Track the actual URL if it's loaded
            if (img.complete && img.naturalWidth > 0) {
              this.trackMediaUrl(img.src);
            }
            
            // Classify the image type
            const styles = window.getComputedStyle(img);
            const naturalWidth = img.naturalWidth || 0;
            const offsetWidth = img.offsetWidth || 0;
            
            const isBackgroundLike = 
              naturalWidth > 600 || 
              offsetWidth > 600 ||
              styles.position === 'absolute' ||
              styles.position === 'fixed' ||
              styles.objectFit === 'cover' ||
              styles.width === '100%' || 
              styles.width === '100vw' ||
              styles.height === '100vh' ||
              img.closest('.hero, .banner, .background, [class*="hero"], [class*="banner"], [class*="background"], section') !== null;
            
            assets.push({
              type: 'image',
              url: img.src,
              selector: this.getElementSelector(img),
              attributes: {
                alt: img.alt || '',
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
                isBackgroundLike: isBackgroundLike,
                objectFit: styles.objectFit,
                position: styles.position
              }
            });
          }
        });
        
        // 2. Extract background images from computed styles
        document.querySelectorAll('*').forEach(element => {
          try {
            const computed = window.getComputedStyle(element);
            const bgImage = computed.backgroundImage;
            
            if (bgImage && bgImage !== 'none') {
              const matches = bgImage.matchAll(/url\(['"]?([^'"]+)['"]?\)/g);
              for (const match of matches) {
                const url = match[1];
                if (!processedUrls.has(url)) {
                  processedUrls.add(url);
                  assets.push({
                    type: 'background',
                    url: url,
                    selector: this.getElementSelector(element),
                    cssProperty: 'background-image',
                    // Capture background properties for proper restoration
                    attributes: {
                      backgroundSize: computed.backgroundSize,
                      backgroundPosition: computed.backgroundPosition,
                      backgroundRepeat: computed.backgroundRepeat,
                      backgroundAttachment: computed.backgroundAttachment,
                      width: element.offsetWidth,
                      height: element.offsetHeight
                    }
                  });
                }
              }
            }
          } catch (e) {
            // Ignore errors for specific elements
          }
        });
        
        // 3. Extract SVG images and picture sources
        document.querySelectorAll('svg image, picture source').forEach(element => {
          try {
            const url = element.href?.baseVal || element.srcset;
            if (url && !processedUrls.has(url)) {
              processedUrls.add(url);
              assets.push({
                type: element.tagName.toLowerCase(),
                url: url,
                selector: this.getElementSelector(element)
              });
            }
          } catch (e) {
            // Ignore errors
          }
        });
        
        // 4. Extract video posters
        document.querySelectorAll('video[poster]').forEach(video => {
          if (video.poster && !processedUrls.has(video.poster)) {
            processedUrls.add(video.poster);
            assets.push({
              type: 'video-poster',
              url: video.poster,
              selector: this.getElementSelector(video)
            });
          }
        });
        
        // Convert relative URLs to absolute and resolve masked URLs
        return assets.map(asset => {
          try {
            // Convert to absolute URL
            const absoluteUrl = new URL(asset.url, window.location.href).href;
            
            // Check if we have a tracked real URL (for masked URLs)
            const realUrl = this.findRealUrl(absoluteUrl);
            
            return {
              ...asset,
              url: realUrl || absoluteUrl
            };
          } catch {
            return asset;
          }
        });
      } catch (error) {
        console.warn('⚠️ SAJKO V4: Error extracting assets:', error);
        return [];
      }
    }
    
    captureComputedStyles() {
      const computedStyles = {
        rootVariables: {},
        elementVariables: [], // CSS variables defined on non-root elements
        layoutElements: [],
        criticalStyles: {}
      };
      
      try {
        // Capture CSS custom properties (variables) from root
        const rootStyle = getComputedStyle(document.documentElement);
        const rootProps = Array.from(rootStyle).filter(prop => prop.startsWith('--'));
        rootProps.forEach(prop => {
          computedStyles.rootVariables[prop] = rootStyle.getPropertyValue(prop);
        });
        
        // Capture CSS variables from ALL elements (not just root)
        // This is critical for WordPress themes that define variables at various levels
        const allElements = document.querySelectorAll('*');
        let varCount = 0;
        const maxVarElements = 500; // Limit to prevent performance issues
        
        for (let element of allElements) {
          if (varCount >= maxVarElements) break;
          
          const computed = window.getComputedStyle(element);
          const elementVars = {};
          let hasVars = false;
          
          // Check if this element defines any CSS variables
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i];
            if (prop.startsWith('--')) {
              const value = computed.getPropertyValue(prop);
              // Only store if different from root or parent
              if (value && value !== computedStyles.rootVariables[prop]) {
                elementVars[prop] = value;
                hasVars = true;
              }
            }
          }
          
          if (hasVars) {
            computedStyles.elementVariables.push({
              selector: this.getElementSelector(element),
              variables: elementVars,
              id: element.id || null,
              className: element.className || null
            });
            varCount++;
          }
        }
        
        // Capture computed styles for layout-critical and text elements
        const layoutSelectors = [
          '.container', '.grid', '.flex',
          // Hero and banner elements - CRITICAL for gradient backgrounds
          '.hero', '.banner', '.hero-section', '.banner-section',
          '[class*="hero"]', '[class*="banner"]',
          '.jumbotron', '.masthead', '.showcase',
          // WordPress Gutenberg blocks
          '[class*="wp-block"]', '[class*="wp-container"]', '[class*="wp-elements"]',
          '.wp-block-columns', '.wp-block-column', '.wp-block-group',
          '.wp-block-cover', '.wp-block-media-text', '.wp-block-image',
          // Elementor page builder
          '.elementor-section', '.elementor-container', '.elementor-row',
          '.elementor-column', '.elementor-widget', '.elementor-element',
          '[class*="elementor-"]',
          // Divi builder
          '.et_pb_section', '.et_pb_row', '.et_pb_column',
          '.et_pb_module', '.et_pb_text', '.et_pb_image',
          '[class*="et_pb_"]',
          // Visual Composer/WPBakery
          '.vc_row', '.vc_column', '.wpb_wrapper',
          '.vc_column_container', '[class*="vc_"]',
          // Beaver Builder
          '.fl-row', '.fl-col', '.fl-module',
          '.fl-row-content', '[class*="fl-"]',
          // Common WordPress theme classes
          '.site-header', '.site-content', '.site-footer',
          '.entry-content', '.entry-header', '.entry-footer',
          '.widget-area', '.widget', '.sidebar',
          // Standard layout classes
          '[class*="grid-cols"]', '[class*="flex-"]',
          'header', 'nav', 'main', 'section', 'aside', 'article',
          '[class*="col-"], [class*="row-"]',
          '.testimonials', '.testimonial',
          '[class*="columns"]', '[class*="layout"]',
          // Text elements
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'span', 'a', 'li', 'dt', 'dd',
          'blockquote', 'figcaption', 'label',
          // Text-related classes
          '[class*="text-"]', '[class*="heading"]',
          '[class*="title"]', '[class*="subtitle"]',
          '[class*="font-"]', '[class*="leading-"]',
          // Common header/footer elements
          'header h1', 'header h2', 'header p',
          'nav a', 'nav span',
          'footer p', 'footer span'
        ];
        
        layoutSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
              if (index > 200) return; // Limit to first 200 of each type for better coverage
              
              const styles = window.getComputedStyle(element);
              
              // Determine if this is an image and what type
              const isImage = element.tagName === 'IMG';
              let isBackgroundLikeImage = false;
              
              if (isImage) {
                // Classify image based on various criteria
                const naturalWidth = element.naturalWidth || 0;
                const naturalHeight = element.naturalHeight || 0;
                const offsetWidth = element.offsetWidth || 0;
                const offsetHeight = element.offsetHeight || 0;
                const parent = element.parentElement;
                
                isBackgroundLikeImage = 
                  // Large images are often backgrounds
                  naturalWidth > 600 || 
                  offsetWidth > 600 ||
                  // Absolute/fixed positioned images
                  styles.position === 'absolute' ||
                  styles.position === 'fixed' ||
                  // Images with cover/contain object-fit
                  styles.objectFit === 'cover' ||
                  styles.objectFit === 'contain' ||
                  // Images in hero/banner/background containers
                  element.closest('.hero, .banner, .background, .bg-image, [class*="hero"], [class*="banner"], [class*="background"], section, header') !== null ||
                  // Full-width images
                  (styles.width === '100%' || styles.width === '100vw') ||
                  // Images that fill viewport height
                  (styles.height === '100vh' || styles.height === '100%');
              }
              
              // Only skip dimensions for small logo/icon images
              const shouldSkipDimensions = isImage && !isBackgroundLikeImage;
              
              const layoutStyles = {
                selector: selector,
                index: index,
                // Capture all layout-critical properties
                display: styles.display,
                position: styles.position,
                gridTemplateColumns: styles.gridTemplateColumns,
                gridTemplateRows: styles.gridTemplateRows,
                gridGap: styles.gridGap,
                gap: styles.gap,
                flexDirection: styles.flexDirection,
                flexWrap: styles.flexWrap,
                justifyContent: styles.justifyContent,
                alignItems: styles.alignItems,
                // Selectively capture width/height based on image type
                width: !shouldSkipDimensions ? styles.width : undefined,
                minWidth: !shouldSkipDimensions ? styles.minWidth : undefined,
                maxWidth: !shouldSkipDimensions ? styles.maxWidth : undefined,
                height: !shouldSkipDimensions ? styles.height : undefined,
                minHeight: !shouldSkipDimensions ? styles.minHeight : undefined,
                maxHeight: !shouldSkipDimensions ? styles.maxHeight : undefined,
                padding: styles.padding,
                margin: styles.margin,
                boxSizing: styles.boxSizing,
                overflow: styles.overflow,
                float: styles.float,
                clear: styles.clear,
                columns: styles.columns,
                columnCount: styles.columnCount,
                columnGap: styles.columnGap,
                // Add positioning for absolute/fixed elements
                top: styles.top,
                left: styles.left,
                right: styles.right,
                bottom: styles.bottom,
                // Add typography that affects layout
                fontSize: styles.fontSize,
                lineHeight: styles.lineHeight,
                // Add text alignment and styling
                textAlign: styles.textAlign,
                textDecoration: styles.textDecoration,
                textTransform: styles.textTransform,
                fontWeight: styles.fontWeight,
                fontStyle: styles.fontStyle,
                fontFamily: styles.fontFamily,
                letterSpacing: styles.letterSpacing,
                wordSpacing: styles.wordSpacing,
                verticalAlign: styles.verticalAlign,
                textIndent: styles.textIndent,
                // Individual padding values
                paddingTop: styles.paddingTop,
                paddingRight: styles.paddingRight,
                paddingBottom: styles.paddingBottom,
                paddingLeft: styles.paddingLeft,
                // Individual margin values
                marginTop: styles.marginTop,
                marginRight: styles.marginRight,
                marginBottom: styles.marginBottom,
                marginLeft: styles.marginLeft,
                // Add flex/grid child properties
                flexGrow: styles.flexGrow,
                flexShrink: styles.flexShrink,
                flexBasis: styles.flexBasis,
                gridColumn: styles.gridColumn,
                gridRow: styles.gridRow,
                // Add color properties
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                // Add background properties for proper background image display
                backgroundImage: styles.backgroundImage,
                backgroundSize: styles.backgroundSize,
                backgroundPosition: styles.backgroundPosition,
                backgroundRepeat: styles.backgroundRepeat,
                backgroundAttachment: styles.backgroundAttachment,
                backgroundClip: styles.backgroundClip,
                backgroundOrigin: styles.backgroundOrigin
              };
              
              // Store all elements, including inline ones for text alignment
              // Text elements often have display:inline but need their styles preserved
              const isTextElement = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LABEL', 'LI'].includes(element.tagName);
              const hasTextStyles = layoutStyles.textAlign !== 'start' || 
                                   layoutStyles.fontWeight !== '400' ||
                                   layoutStyles.letterSpacing !== 'normal';
              
              // Store if it has layout properties OR is a text element OR has text styles
              if (layoutStyles.display !== 'inline' || 
                  layoutStyles.position !== 'static' || 
                  isTextElement || 
                  hasTextStyles) {
                // Add a unique identifier if element has one
                if (element.id) {
                  layoutStyles.id = element.id;
                } else if (element.className) {
                  layoutStyles.className = element.className;
                }
                computedStyles.layoutElements.push(layoutStyles);
              }
            });
          } catch (e) {
            // Ignore selector errors
          }
        });
        
        // Capture viewport-specific breakpoint information
        computedStyles.criticalStyles.viewportWidth = window.innerWidth;
        computedStyles.criticalStyles.viewportHeight = window.innerHeight;
        computedStyles.criticalStyles.devicePixelRatio = window.devicePixelRatio;
        
      } catch (error) {
        console.error('❌ SAJKO V4: Error capturing computed styles:', error);
      }
      
      return computedStyles;
    }
    
    async captureCSSStyles() {
      const cssData = {
        stylesheets: [],
        inlineStyles: [],
        externalLinks: [],
        totalSize: 0
      };

      try {
        // Capture ALL stylesheets, not just first 10
        const styleSheets = Array.from(document.styleSheets).filter(sheet => {
          // Filter out WordPress admin stylesheets
          if (sheet.href) {
            return !sheet.href.includes('wp-admin') && 
                   !sheet.href.includes('wp-includes/css/admin') &&
                   !sheet.href.includes('admin-bar');
          }
          return true;
        });
        for (let i = 0; i < styleSheets.length; i++) {
          const sheet = styleSheets[i];
          try {
            if (sheet.href && sheet.href.startsWith(window.location.origin)) {
              // Try to read same-origin stylesheets
              const response = await fetch(sheet.href);
              if (response.ok) {
                const cssText = await response.text();
                cssData.stylesheets.push({
                  href: sheet.href,
                  cssText: cssText.substring(0, 500000), // Increased to 500KB per stylesheet
                  index: i
                });
              }
            } else if (sheet.cssRules) {
              // Read inline stylesheets - capture ALL rules
              let cssText = '';
              for (let j = 0; j < sheet.cssRules.length; j++) {
                cssText += sheet.cssRules[j].cssText + '\n';
              }
              cssData.stylesheets.push({
                href: sheet.href || 'inline',
                cssText: cssText.substring(0, 500000), // Increased to 500KB
                index: i
              });
            } else if (sheet.href) {
              // Store external stylesheet links for proxy loading
              cssData.externalLinks.push({
                href: sheet.href,
                index: i,
                media: sheet.media?.mediaText || 'all',
                type: 'external'
              });
              console.log('📎 SAJKO V4: External stylesheet to proxy:', sheet.href);
            }
          } catch (e) {
            // Store cross-origin stylesheets for proxy loading
            if (sheet.href) {
              cssData.externalLinks.push({
                href: sheet.href,
                index: i,
                media: sheet.media?.mediaText || 'all',
                type: 'cross-origin'
              });
              console.log('📎 SAJKO V4: Cross-origin stylesheet to proxy:', sheet.href);
            }
          }
        }

        // Capture ALL inline styles from style tags
        const styleTags = document.querySelectorAll('style');
        styleTags.forEach((style, index) => {
          if (style.textContent) {
            cssData.inlineStyles.push({
              index,
              cssText: style.textContent // No truncation - capture full content
            });
          }
        });
        
        // Also capture link tags for external stylesheets that might not be in document.styleSheets
        const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
        
        // Try to fetch and inline external stylesheets to avoid CORS issues in replay
        const fetchPromises = [];
        linkTags.forEach((link) => {
          const href = link.getAttribute('href');
          if (href && !cssData.externalLinks.some(e => e.href === href)) {
            // Try to fetch the stylesheet content
            const fetchPromise = fetch(href)
              .then(response => {
                if (response.ok) {
                  return response.text();
                }
                throw new Error('Failed to fetch');
              })
              .then(cssText => {
                // Successfully fetched - store as inline CSS
                console.log('✅ SAJKO V4: Fetched external stylesheet:', href);
                cssData.stylesheets.push({
                  href: href,
                  cssText: cssText.substring(0, 1000000), // Limit to 1MB per stylesheet
                  index: cssData.stylesheets.length,
                  type: 'fetched-external',
                  media: link.getAttribute('media') || 'all'
                });
              })
              .catch(error => {
                // Failed to fetch - store as external link for fallback
                console.log('📎 SAJKO V4: Could not fetch stylesheet, storing as external link:', href);
                cssData.externalLinks.push({
                  href: href,
                  media: link.getAttribute('media') || 'all',
                  type: 'link-tag',
                  crossOrigin: link.getAttribute('crossorigin'),
                  integrity: link.getAttribute('integrity')
                });
              });
            
            fetchPromises.push(fetchPromise);
          }
        });
        
        // Wait for all fetch attempts to complete
        await Promise.allSettled(fetchPromises);

        // Calculate total size
        cssData.totalSize = cssData.stylesheets.reduce((sum, sheet) => sum + (sheet.cssText?.length || 0), 0) +
                           cssData.inlineStyles.reduce((sum, style) => sum + (style.cssText?.length || 0), 0);

      } catch (error) {
        console.error('❌ SAJKO V4: Error capturing CSS:', error);
      }

      return cssData;
    }

    // Helper methods
    getElementSelector(element) {
      if (!element) return '';
      
      if (element.id) {
        return `#${element.id}`;
      }
      
      if (element.className) {
        const classes = element.className.trim().split(/\s+/).slice(0, 2);
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
      
      return element.tagName?.toLowerCase() || '';
    }

    shouldMaskInput(element) {
      const type = element.type?.toLowerCase();
      const name = element.name?.toLowerCase() || '';
      
      return type === 'password' || 
             name.includes('password') ||
             name.includes('credit') ||
             name.includes('card');
    }

    detectDevice() {
      const userAgent = navigator.userAgent;
      
      // Parse browser info
      let browserName = 'Unknown';
      let browserVersion = 'Unknown';
      
      if (userAgent.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
        browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('Safari') > -1) {
        browserName = 'Safari';
        browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('Edge') > -1) {
        browserName = 'Edge';
        browserVersion = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] || 'Unknown';
      }
      
      // Parse OS info
      let osName = 'Unknown';
      let osVersion = 'Unknown';
      
      if (userAgent.indexOf('Windows NT 10.0') > -1) {
        osName = 'Windows';
        osVersion = '10';
      } else if (userAgent.indexOf('Windows NT 6.3') > -1) {
        osName = 'Windows';
        osVersion = '8.1';
      } else if (userAgent.indexOf('Mac OS X') > -1) {
        osName = 'macOS';
        osVersion = userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
      } else if (userAgent.indexOf('Linux') > -1) {
        osName = 'Linux';
      } else if (userAgent.indexOf('Android') > -1) {
        osName = 'Android';
        osVersion = userAgent.match(/Android (\d+\.\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('iOS') > -1) {
        osName = 'iOS';
        osVersion = userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
      }
      
      const deviceType = /mobile|tablet|android|ipad|iphone/i.test(userAgent) ? 'mobile' : 'desktop';
      
      return {
        userAgent,
        deviceType,
        browserName,
        browserVersion,
        osName,
        osVersion,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    }

    getOrCreateSessionId() {
      const stored = sessionStorage.getItem('sajko_session_v4');
      if (stored) {
        const session = JSON.parse(stored);
        if (Date.now() - session.created < 30 * 60 * 1000) {
          return session.id;
        }
      }
      
      const sessionId = `sajko_v4_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('sajko_session_v4', JSON.stringify({
        id: sessionId,
        created: Date.now()
      }));
      
      return sessionId;
    }

    getOrCreateVisitorId() {
      let visitorId = localStorage.getItem('sajko_visitor_id');
      if (!visitorId) {
        visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('sajko_visitor_id', visitorId);
      }
      return visitorId;
    }

    stop() {
      this.isRecording = false;
      
      // Flush remaining events
      this.flushEvents();
      
      // Cleanup
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      
      this.eventCleanup.forEach(cleanup => cleanup());
      
      // Clean up SPA observer
      if (this.spaObserver) {
        this.spaObserver.disconnect();
        this.spaObserver = null;
      }
      
      console.log('🛑 SAJKO V4: Recording stopped');
    }

    getMetrics() {
      const metrics = {
        sessionId: this.sessionId,
        isRecording: this.isRecording,
        queueSize: this.eventQueue.length,
        hasWasm: this.wasmBridge?.isReady || false
      };
      
      if (this.wasmBridge && this.wasmBridge.isReady) {
        Object.assign(metrics, this.wasmBridge.getMetrics());
      }
      
      return metrics;
    }
    
    // Media URL Tracking Methods
    initializeMediaTracking() {
      const self = this;
      
      // Track image loads
      const originalImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (originalImageSrc && !this.mediaTracker) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          get: originalImageSrc.get,
          set: function(value) {
            originalImageSrc.set.call(this, value);
            
            // Track when image loads successfully
            this.addEventListener('load', function() {
              if (this.src && this.naturalWidth > 0) {
                self.trackMediaUrl(this.src);
              }
            }, { once: true });
          }
        });
      }
      
      // Track successful fetch requests for images
      if (!this.mediaTracker) {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          return originalFetch.apply(this, args).then(response => {
            if (response.ok && response.url) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                self.trackMediaUrl(response.url);
              }
            }
            return response;
          });
        };
      }
      
      // Track XMLHttpRequest for images
      if (!this.mediaTracker) {
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
          this._trackUrl = url;
          return originalXHROpen.apply(this, [method, url, ...args]);
        };
        
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
          this.addEventListener('load', function() {
            if (this.status >= 200 && this.status < 300) {
              const contentType = this.getResponseHeader('content-type');
              if (contentType && contentType.startsWith('image/') && this._trackUrl) {
                const fullUrl = new URL(this._trackUrl, window.location.href).href;
                self.trackMediaUrl(fullUrl);
              }
            }
          });
          return originalXHRSend.apply(this, args);
        };
      }
      
      this.mediaTracker = true;
      console.log('📷 SAJKO V4: Media tracking initialized');
    }
    
    trackMediaUrl(url) {
      // Only track Next.js static media and images we haven't seen
      if (!url.includes('/_next/static/media/') || this.trackedMediaUrls.has(url)) {
        return;
      }
      
      // Extract filename pattern for matching masked URLs
      const filename = url.split('/').pop();
      if (filename) {
        // Create pattern for masked versions (e.g., file.hash.png -> file.*.png)
        const match = filename.match(/^(.+?)\.([a-f0-9]{8,})\.(\w+)$/);
        if (match) {
          const pattern = `${match[1]}.*.${match[3]}`;
          this.trackedMediaUrls.set(pattern, url);
        }
        this.trackedMediaUrls.set(filename, url);
        
        console.log(`📷 SAJKO V4: Tracked media URL: ${url}`);
        
        // Send to tracking API if configured
        if (CONFIG.apiEndpoint) {
          fetch(`${CONFIG.apiEndpoint}/api/track-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            mode: 'cors'
          }).then(response => {
            if (response.ok) {
              console.log(`📷 SAJKO V4: URL tracked on server: ${url}`);
            }
          }).catch(err => {
            console.warn(`📷 SAJKO V4: Failed to track URL on server:`, err);
          });
        }
      }
    }
    
    // Find real URL from potentially masked URL
    findRealUrl(maskedUrl) {
      // Direct lookup
      if (this.trackedMediaUrls.has(maskedUrl)) {
        return this.trackedMediaUrls.get(maskedUrl);
      }
      
      // Extract filename and try pattern matching
      const filename = maskedUrl.split('/').pop();
      if (filename) {
        // Check exact filename
        if (this.trackedMediaUrls.has(filename)) {
          return this.trackedMediaUrls.get(filename);
        }
        
        // Try pattern matching for masked files
        for (const [pattern, realUrl] of this.trackedMediaUrls.entries()) {
          if (pattern.includes('*')) {
            const regexPattern = pattern
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              .replace(/\\\*/g, '.*');
            
            if (new RegExp(`^${regexPattern}$`).test(filename)) {
              console.log(`📷 SAJKO V4: Found real URL for ${filename} -> ${realUrl}`);
              return realUrl;
            }
          }
        }
      }
      
      return maskedUrl; // Return original if no match found
    }
  }

  // Initialize
  async function init() {
    try {
      console.log('🚀 SAJKO V4: Starting initialization...');
      console.log('📊 SAJKO V4: Config:', CONFIG);
      
      // Load dependencies
      await loadDependencies();
      
      // Create recorder instance
      const recorder = new SajkoSessionRecorderV4();
      window.__sajkoRecorderV4Instance = recorder;
      
      // Initialize recording
      await recorder.initialize();
      
      // Expose API
      window.SajkoReplay = {
        start: () => recorder.initialize(),
        stop: () => recorder.stop(),
        flush: () => recorder.flushEvents(),
        isRecording: recorder.isRecording,
        sessionId: recorder.sessionId,
        getMetrics: () => recorder.getMetrics(),
        version: '4.0.0',
        useWasm: true
      };
      
      console.log('🚀 SAJKO Session Replay V4 (Go-powered) loaded successfully');
    } catch (error) {
      console.error('❌ SAJKO V4: Failed to initialize:', error);
      console.error('Stack trace:', error.stack);
      
      // Don't fallback to v3, just log the error
      console.error('❌ SAJKO V4: Recording disabled due to initialization failure');
      // Optionally, we could try to work without WASM
      // but for now, we'll require WASM to work properly
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

})();