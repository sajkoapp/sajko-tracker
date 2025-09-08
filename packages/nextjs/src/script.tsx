'use client';

import React from 'react';
import Script from 'next/script';
import { SajkoConfig } from '@sajko/tracker';

/**
 * Props for SajkoScript component
 */
export interface SajkoScriptProps {
  /** SAJKO configuration */
  config: SajkoConfig;
  /** Custom CDN URL for the script */
  cdnUrl?: string;
  /** Script loading strategy */
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  /** Callback when script loads */
  onLoad?: () => void;
  /** Callback when script fails to load */
  onError?: () => void;
}

/**
 * Next.js Script component for SAJKO
 * 
 * Loads the SAJKO tracking script with proper Next.js optimizations
 * 
 * @example
 * ```tsx
 * // app/layout.tsx (App Router)
 * import { SajkoScript } from '@sajko/nextjs';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <SajkoScript 
 *           config={{ 
 *             websiteId: 'your-website-id',
 *             hasUserConsent: true 
 *           }}
 *           strategy="afterInteractive"
 *         />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // pages/_app.tsx (Pages Router)
 * import { SajkoScript } from '@sajko/nextjs';
 * 
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <>
 *       <SajkoScript 
 *         config={{ websiteId: 'your-website-id' }}
 *         strategy="afterInteractive"
 *       />
 *       <Component {...pageProps} />
 *     </>
 *   );
 * }
 * ```
 */
export function SajkoScript({
  config,
  cdnUrl,
  strategy = 'afterInteractive',
  onLoad,
  onError
}: SajkoScriptProps) {
  const scriptUrl = cdnUrl || 
    (config.apiEndpoint ? `${config.apiEndpoint}/sajko-replay-v4.js` : 'https://app.sajko.sk/sajko-replay-v4.js');
  
  const handleLoad = () => {
    console.log('SAJKO: Script loaded successfully', {
      sessionId: window.SajkoReplay?.sessionId,
      version: window.SajkoReplay?.version
    });
    onLoad?.();
  };
  
  const handleError = () => {
    console.error('SAJKO: Failed to load script');
    onError?.();
  };
  
  return (
    <>
      {/* Set configuration before script loads */}
      <Script
        id="sajko-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.sajkoConfig = ${JSON.stringify(config)};
          `
        }}
      />
      
      {/* Load the main script */}
      <Script
        id="sajko-script"
        src={scriptUrl}
        strategy={strategy}
        onLoad={handleLoad}
        onError={handleError}
        data-website-id={config.websiteId}
        data-api-endpoint={config.apiEndpoint}
        data-user-consent={String(config.hasUserConsent || false)}
        data-debug={String(config.debug || false)}
      />
    </>
  );
}