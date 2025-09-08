'use client';

import React from 'react';
import { SajkoScript } from './script';
import { SajkoConfig } from '@sajko/tracker';

/**
 * Props for SajkoTracker component
 */
export interface SajkoTrackerProps {
  /** Website ID */
  websiteId: string;
  /** API endpoint (optional) */
  apiEndpoint?: string;
  /** Whether to enable debug mode */
  debug?: boolean;
  /** Custom configuration */
  config?: Partial<SajkoConfig>;
}

/**
 * Client Component for App Router
 * 
 * Configures SAJKO tracking in Next.js apps
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { SajkoTracker } from '@sajko/nextjs';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <SajkoTracker websiteId={process.env.NEXT_PUBLIC_SAJKO_WEBSITE_ID!} />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */
export function SajkoTracker({
  websiteId,
  apiEndpoint,
  debug,
  config
}: SajkoTrackerProps) {
  // Build configuration
  const sajkoConfig: SajkoConfig = {
    websiteId,
    apiEndpoint: apiEndpoint || 'https://app.sajko.sk',
    hasUserConsent: true,
    debug: debug ?? false,
    ...config
  };
  
  return <SajkoScript config={sajkoConfig} strategy="afterInteractive" />;
}

/**
 * Client Component wrapper for dynamic configuration
 * 
 * Use this when you need to configure SAJKO based on client-side state
 * 
 * @example
 * ```tsx
 * 'use client';
 * 
 * import { useState } from 'react';
 * import { SajkoClientTracker } from '@sajko/nextjs';
 * 
 * function ConsentBanner() {
 *   const [hasConsent, setHasConsent] = useState(false);
 * 
 *   return (
 *     <>
 *       {hasConsent && (
 *         <SajkoClientTracker 
 *           websiteId="your-website-id"
 *           hasConsent={hasConsent}
 *         />
 *       )}
 *       <button onClick={() => setHasConsent(true)}>
 *         Accept Tracking
 *       </button>
 *     </>
 *   );
 * }
 * ```
 */
export function SajkoClientTracker({
  websiteId,
  hasConsent = true,
  apiEndpoint,
  debug,
  config
}: {
  websiteId: string;
  hasConsent?: boolean;
  apiEndpoint?: string;
  debug?: boolean;
  config?: Partial<SajkoConfig>;
}) {
  const sajkoConfig: SajkoConfig = {
    websiteId,
    apiEndpoint: apiEndpoint || 'https://app.sajko.sk',
    hasUserConsent: hasConsent,
    debug: debug ?? false,
    ...config
  };
  
  return <SajkoScript config={sajkoConfig} strategy="afterInteractive" />;
}