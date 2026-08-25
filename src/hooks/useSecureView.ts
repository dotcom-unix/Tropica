import { useEffect, useRef } from 'react';
import SecureView from '../lib/SecureView';

export function useSecureView(containerId: string, options?: {
  encryptionKey?: string;
  showIndicator?: boolean;
}) {
  const secureViewRef = useRef<SecureView | null>(null);

  useEffect(() => {
    const secureView = new SecureView(options);
    secureView.init(containerId);
    secureViewRef.current = secureView;

    return () => {
      secureView.clear();
    };
  }, [containerId, options]);

  return secureViewRef.current;
}