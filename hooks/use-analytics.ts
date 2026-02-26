'use client';

import { useEffect } from 'react';
import { analytics_events } from '@/lib/analytics';

/**
 * Call once at the top of a page component.
 * Fires a page_view event on mount and returns all typed analytics helpers.
 */
export function useAnalytics() {
  useEffect(() => {
    analytics_events.pageView();
  }, []);

  return analytics_events;
}
