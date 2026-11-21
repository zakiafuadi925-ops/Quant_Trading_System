import { useState, useEffect, useCallback } from 'react';
import { getTabFromPath, getPathForTab } from '../config/menu';

export interface AppRouterState {
  activeTab: string;
  navigate: (tabId: string) => void;
}

/**
 * Lightweight client-side router hook utilizing HTML5 History API.
 * Provides deep-linking, browser Back/Forward (popstate) handling,
 * and View Transitions API integration.
 */
export function useAppRouter(): AppRouterState {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getTabFromPath(window.location.pathname);
    }
    return 'overview';
  });

  const navigate = useCallback((tabId: string) => {
    if (tabId === activeTab) return;

    const targetPath = getPathForTab(tabId);
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tabId }, '', targetPath);
      }
    }

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        setActiveTabState(tabId);
      });
    } else {
      setActiveTabState(tabId);
    }
  }, [activeTab]);

  // Listen to browser Back / Forward events
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTabState(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { activeTab, navigate };
}
