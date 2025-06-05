import React, { useState, useEffect, useCallback } from 'react';
import TableCard from './table-card';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parseISO, isValid, format } from 'date-fns';

const FUNCTION_BASE_URL = 'https://europe-west1-kotd-shop-history.cloudfunctions.net';

function VirtualTableList() {
  const [data, setData] = useState({});
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [previousComparisonDate, setPreviousComparisonDate] = useState('');
  const [pickerDate, setPickerDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDates = useCallback(async () => {
    try {
      const response = await fetch(`${FUNCTION_BASE_URL}/getAllDates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      const result = await response.json();
      return result.data.map((d) => d.snapshot_date);
    } catch (err) {
      setError(err.message || 'Failed to fetch dates');
      return [];
    }
  }, []);

  const fetchWeaponsForDate = useCallback(async (date) => {
    if (!date) return [];
    try {
      const response = await fetch(`${FUNCTION_BASE_URL}/getWeaponsByDate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { date } }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      const result = await response.json();
      return result.data;
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
      if (weapons && weapons.length > 0) {
        weapons.sort((a, b) => a.id - b.id);
      }
      setData(prevState => ({ ...prevState, [date]: weapons || [] }));
    } catch (err) {
      setData(prevState => ({ ...prevState, [date]: [] }));
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
        if (isValid(dateObj)) {
          setPickerDate(dateObj);
        }

        let latestDateWeapons = await fetchWeaponsForDate(latestDateStr);
        if (latestDateWeapons && latestDateWeapons.length > 0) {
          latestDateWeapons.sort((a, b) => a.id - b.id);
        }
        initialData[latestDateStr] = latestDateWeapons || [];

        const sortedAllDates = [...fetchedDates].sort((a, b) => b.localeCompare(a));
        const currentIndex = sortedAllDates.indexOf(latestDateStr);
        let newPrevComparisonDate = '';

        if (currentIndex !== -1 && currentIndex + 1 < sortedAllDates.length) {
          const foundPreviousDate = sortedAllDates[currentIndex + 1];
          newPrevComparisonDate = foundPreviousDate;
          if (!initialData[foundPreviousDate]) {
            let previousDateWeapons = await fetchWeaponsForDate(foundPreviousDate);
            if (previousDateWeapons && previousDateWeapons.length > 0) {
              previousDateWeapons.sort((a, b) => a.id - b.id);
            }
            initialData[foundPreviousDate] = previousDateWeapons || [];
          }
        }
        setPreviousComparisonDate(newPrevComparisonDate);
      }

      setData(initialData);
      setSelectedDate(newSelectedDate);

    } catch (err) {
      setError(err.message || 'Failed to fetch initial data');
      setData({});
      setSelectedDate('');
      setPreviousComparisonDate('');
    } finally {
      setLoading(false);
    }
  }, [fetchDates, fetchWeaponsForDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const handleDateChange = useCallback((date) => {
    setPickerDate(date);
    if (date && isValid(date)) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setSelectedDate(formattedDate);
      if (!data[formattedDate] || data[formattedDate]?.length === 0) {
        fetchDataForDate(formattedDate);
      }
      fetchPreviousDateDataIfNeeded(formattedDate, dates, data);
    } else {
      setSelectedDate('');
      setPreviousComparisonDate('');
    }
  }, [fetchDataForDate, data, dates, fetchPreviousDateDataIfNeeded]);

  const validDates = React.useMemo(() => 
    dates.map(dateStr => parseISO(dateStr)).filter(isValid), 
    [dates]
  );

  return (
    <div className="container-fluid bg-light" style={{ minHeight: '100vh' }}>
      <div className="py-4">
        <h1 className="display-4 text-center mb-4">
          Weapons Shop History
        </h1>
      
        <div className="d-flex justify-content-center align-items-center mb-3">
          <label htmlFor="date-select" className="me-2 form-label">
            Select Date:
          </label>
          <DatePicker
            id="date-select"
            selected={pickerDate}
            onChange={handleDateChange}
            includeDates={validDates.length > 0 ? validDates : undefined}
            dateFormat="yyyy-MM-dd"
            className="form-select me-2"
            placeholderText={dates.length > 0 ? "Select a date" : "Loading dates..."}
            maxDate={new Date()} 
            disabled={loading && !dates.length}
          />
      
          <button 
            onClick={handleRefresh}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading && !selectedDate && !dates.length ? 'Fetching Dates...' : 'Refresh Dates'}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger text-center" role="alert">
            {error}
          </div>
        )}

        <div className="mt-4">
          {!selectedDate && !loading && !error && dates.length > 0 && (
            <div className="alert alert-info text-center" role="alert">
              Please select a date to view the shop history.
            </div>
          )}
          {!selectedDate && !loading && !error && dates.length === 0 && (
            <div className="alert alert-info text-center" role="alert">
              No dates available or still loading initial data.
            </div>
          )}

          {loading && selectedDate && (!data[selectedDate] || data[selectedDate]?.length === 0) && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading weapons for {selectedDate}...</span>
              </div>
              <p className="mt-2 text-muted">Loading weapons for {selectedDate}...</p>
            </div>
          )}
          
          {loading && !selectedDate && dates.length === 0 && (
            <div className="text-center py-3">
              <div className="spinner-border text-secondary" role="status">
                <span className="visually-hidden">Loading available dates...</span>
              </div>
              <p className="mt-2 text-muted">Loading available dates...</p>
            </div>
          )}

          {!loading && selectedDate && data[selectedDate] && data[selectedDate].length > 0 && (
            <TableCard
              date={selectedDate}
              data={data[selectedDate]}
              previousData={previousComparisonDate ? data[previousComparisonDate] : null}
            />
          )}

          {!loading && selectedDate && (!data[selectedDate] || data[selectedDate].length === 0) && !error && (
            <div className="alert alert-warning text-center" role="alert">
              No data available for the selected date: {selectedDate}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VirtualTableList;
