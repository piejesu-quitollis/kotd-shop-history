import { useState, useEffect, useCallback, useRef } from 'react';
import { getLatestDaily } from '../services/functions-client';

export default function useWeaponShopData() {
  // New model view: show static weapons with latest daily metrics.
  const [latestDate, setLatestDate] = useState('');
  const [latestItems, setLatestItems] = useState([]); // dailyPrices rows (optionally joined)
  // prev date/items removed in minimal view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // previous-day logic removed

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLatestDaily(true);
      const date = res?.date || '';
      const items = Array.isArray(res?.items) ? res.items : [];
      // Sort by numeric weaponId
      items.sort((a, b) => Number(a.weaponId) - Number(b.weaponId));
      setLatestDate(date);
      setLatestItems(items);
  // previous-day fetch removed
    } catch (e) {
      console.error('Error loading latest:', e);
      setError(e.message || 'Failed to load latest');
      setLatestDate('');
      setLatestItems([]);
  // prev state not used
    } finally {
      setLoading(false);
    }
  }, []);

  // No-op stubs retained for compatibility (not used after refactor)
  const fetchDataForDate = useCallback(async () => {}, []);

  // Silent variant for background fetches (does not toggle global loading)
  const fetchDataForDateSilent = useCallback(async () => {}, []);

  // Batch background fetch with concurrency limit and de-duplication
  const fetchDataForDatesSilentBatch = useCallback(async () => {}, []);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  // best stats removed from minimal view

  const refresh = useCallback(async () => { await loadLatest(); }, [loadLatest]);

  return {
  latestDate,
  latestItems,
  loading,
  error,
  refresh,
  fetchDataForDate,
  fetchDataForDateSilent,
  fetchDataForDatesSilentBatch,
  };
}
