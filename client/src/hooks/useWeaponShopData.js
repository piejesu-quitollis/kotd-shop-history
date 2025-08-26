import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseISO, isValid, format } from 'date-fns';
import { callHttpFunction } from '../services/functionsClient';
import { computeBestStats } from '../utils/best-stats';

export default function useWeaponShopData() {
  const [dataByDate, setDataByDate] = useState({});
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [previousComparisonDate, setPreviousComparisonDate] = useState('');
  const [pickerDate, setPickerDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDates = useCallback(async () => {
    try {
      const result = await callHttpFunction('getAllDates');
      let datesResult = [];
      if (result && result.data) {
        if (Array.isArray(result.data)) {
          datesResult = result.data;
        } else if (Array.isArray(result.data.data)) {
          datesResult = result.data.data;
        }
      }
      return (datesResult || [])
        .filter(d => d && typeof d.snapshot_date !== 'undefined')
        .map((d) => d.snapshot_date);
    } catch (err) {
      console.error('Error in fetchDates:', err);
      setError(err.message || 'Failed to fetch dates');
      return [];
    }
  }, []);

  const fetchWeaponsForDate = useCallback(async (date) => {
    if (!date) return [];
    try {
      const result = await callHttpFunction('getWeaponsByDate', { date });
      if (result && result.data && Array.isArray(result.data.data)) {
        return result.data.data;
      }
      if (result && Array.isArray(result.data)) {
         return result.data;
      }
      console.warn('Unexpected data structure from getWeaponsByDate:', result?.data);
      return [];
    } catch (err) {
      setError(err.message || `Failed to fetch weapons for ${date}`);
      return [];
    }
  }, []);

  const fetchDataForDate = useCallback(async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      let weapons = await fetchWeaponsForDate(date);
      if (weapons && weapons.length > 0) weapons.sort((a, b) => a.id - b.id);
      setDataByDate(prev => ({ ...prev, [date]: weapons || [] }));
    } catch (err) {
      console.error(`Error fetching data for date ${date}:`, err);
      setDataByDate(prev => ({ ...prev, [date]: [] }));
    } finally {
      setLoading(false);
    }
  }, [fetchWeaponsForDate]);

  const fetchPreviousDateDataIfNeeded = useCallback(async (currentSelectedDate, allDates, currentData) => {
    if (!currentSelectedDate || !allDates || allDates.length === 0) {
      setPreviousComparisonDate('');
      return;
    }
    const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a));
    const currentIndex = sortedDates.indexOf(currentSelectedDate);
    if (currentIndex !== -1 && currentIndex + 1 < sortedDates.length) {
      const foundPreviousDate = sortedDates[currentIndex + 1];
      setPreviousComparisonDate(foundPreviousDate);
      if (!currentData[foundPreviousDate] || currentData[foundPreviousDate]?.length === 0) {
        await fetchDataForDate(foundPreviousDate);
      }
    } else {
      setPreviousComparisonDate('');
    }
  }, [fetchDataForDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setPickerDate(null);
    setPreviousComparisonDate('');

    let initialData = {};
    let newSelectedDate = '';

    try {
      const fetchedDates = await fetchDates();
      setDates(fetchedDates);

      if (fetchedDates && fetchedDates.length > 0) {
        const latestDateStr = [...fetchedDates].sort((a, b) => b.localeCompare(a))[0];
        newSelectedDate = latestDateStr;

        const dateObj = parseISO(latestDateStr);
        if (isValid(dateObj)) setPickerDate(dateObj);

        let latestDateWeapons = await fetchWeaponsForDate(latestDateStr);
        if (latestDateWeapons && latestDateWeapons.length > 0) latestDateWeapons.sort((a, b) => a.id - b.id);
        initialData[latestDateStr] = latestDateWeapons || [];

        const sortedAllDates = [...fetchedDates].sort((a, b) => b.localeCompare(a));
        const currentIndex = sortedAllDates.indexOf(latestDateStr);
        let newPrevComparisonDate = '';

        if (currentIndex !== -1 && currentIndex + 1 < sortedAllDates.length) {
          const foundPreviousDate = sortedAllDates[currentIndex + 1];
          newPrevComparisonDate = foundPreviousDate;
          if (!initialData[foundPreviousDate]) {
            let previousDateWeapons = await fetchWeaponsForDate(foundPreviousDate);
            if (previousDateWeapons && previousDateWeapons.length > 0) previousDateWeapons.sort((a, b) => a.id - b.id);
            initialData[foundPreviousDate] = previousDateWeapons || [];
          }
        }
        setPreviousComparisonDate(newPrevComparisonDate);
      }

      setDataByDate(initialData);
      setSelectedDate(newSelectedDate);

    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err.message || 'Failed to fetch initial data');
      setDataByDate({});
      setSelectedDate('');
      setPreviousComparisonDate('');
    } finally {
      setLoading(false);
    }
  }, [fetchDates, fetchWeaponsForDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDateChange = useCallback((date) => {
    setPickerDate(date);
    if (date && isValid(date)) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setSelectedDate(formattedDate);
      if (!dataByDate[formattedDate] || dataByDate[formattedDate]?.length === 0) {
        fetchDataForDate(formattedDate);
      }
      fetchPreviousDateDataIfNeeded(formattedDate, dates, dataByDate);
    } else {
      setSelectedDate('');
      setPreviousComparisonDate('');
    }
  }, [fetchDataForDate, dataByDate, dates, fetchPreviousDateDataIfNeeded]);

  const validDates = useMemo(() => dates.map(dateStr => parseISO(dateStr)).filter(isValid), [dates]);

  const bestStats = useMemo(() => {
    const currentWeapons = dataByDate[selectedDate];
    return computeBestStats(currentWeapons);
  }, [dataByDate, selectedDate]);

  const refresh = useCallback(async () => { await fetchData(); }, [fetchData]);

  return {
    // state
    dataByDate,
    dates,
    selectedDate,
    previousComparisonDate,
    pickerDate,
    loading,
    error,
    // derived
    validDates,
    bestStats,
    // actions
    handleDateChange,
    refresh,
    fetchDataForDate,
  };
}
