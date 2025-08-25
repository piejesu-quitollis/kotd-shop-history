import React, { useState, useEffect, useCallback } from 'react';
import TableCard from './table-card';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parseISO, isValid, format } from 'date-fns';
import { projectId as firebaseProjectId } from '../firebase';
import {
  calculatePricePerDurability,
  calculateDamagePerCoin,
  calculateOverallCombatEfficiency,
} from '../utils/weapon-utils';

function VirtualTableList() {
  const [data, setData] = useState({});
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [previousComparisonDate, setPreviousComparisonDate] = useState('');
  const [pickerDate, setPickerDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const projectId = firebaseProjectId || process.env.REACT_APP_FIREBASE_PROJECT_ID;
  const baseUrl = isLocal
    ? (projectId ? `http://localhost:5001/${projectId}/europe-west1` : '')
    : (projectId ? `https://europe-west1-${projectId}.cloudfunctions.net` : '');

  const callHttpFunction = useCallback(async (name, payload) => {
    if (!baseUrl) {
      throw new Error('Firebase projectId is not set. Define REACT_APP_FIREBASE_PROJECT_ID in client/.env.local');
    }
    const res = await fetch(`${baseUrl}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload || {} })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    return res.json();
  }, [baseUrl]);

  const fetchDates = useCallback(async () => {
    try {
      const result = await callHttpFunction('getAllDates');
      let datesResult = [];
      if (result && result.data) {
        if (Array.isArray(result.data)) {
          datesResult = result.data;
        } else if (Array.isArray(result.data.data)) {
          datesResult = result.data.data;
        } else {
          console.error('Unexpected data structure from getAllDates. Expected array or { data: array }:', result.data);
        }
      } else {
        console.error('Unexpected result structure from getAllDates. No data field found or result is null/undefined:', result);
      }
      return datesResult
        .filter(d => d && typeof d.snapshot_date !== 'undefined')
        .map((d) => d.snapshot_date);
    } catch (err) {
      console.error('Error in fetchDates:', err);
      setError(err.message || 'Failed to fetch dates');
      return [];
    }
  }, [callHttpFunction]);

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
  }, [callHttpFunction]);

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
      console.error(`Error fetching data for date ${date}:`, err);
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
      console.error('Error fetching initial data:', err);
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

  const bestStats = React.useMemo(() => {
    const currentWeapons = data[selectedDate];
    if (!currentWeapons || currentWeapons.length === 0) {
      return {
        bestPPDWeapon: null,
        bestDPCWeapon: null,
        bestOCEWeapon: null,
      };
    }

    let bestPPD = { weapon: null, value: Infinity };
    let bestDPC = { weapon: null, value: 0 };
    let bestOCE = { weapon: null, value: 0 };

    currentWeapons.forEach(weapon => {
      const ppd = calculatePricePerDurability(weapon);
      const dpc = calculateDamagePerCoin(weapon);
      const oce = calculateOverallCombatEfficiency(weapon);

      if (ppd !== null && ppd < bestPPD.value) {
        bestPPD = { weapon, value: ppd };
      }
      if (dpc !== null && dpc > bestDPC.value) {
        bestDPC = { weapon, value: dpc };
      }
      if (oce !== null && oce > bestOCE.value) {
        bestOCE = { weapon, value: oce };
      }
    });

    return {
      bestPPDWeapon: bestPPD.value !== Infinity ? bestPPD : null,
      bestDPCWeapon: bestDPC.value !== 0 || (bestDPC.weapon && bestDPC.value === 0) ? bestDPC : null,
      bestOCEWeapon: bestOCE.value !== 0 || (bestOCE.weapon && bestOCE.value === 0) ? bestOCE : null,
    };
  }, [data, selectedDate]);

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

        {!loading && selectedDate && data[selectedDate] && data[selectedDate].length > 0 && (
          <div className="row justify-content-center my-3">
            <div className="col-lg-8 col-md-10 col-sm-12">
              <div className="card shadow-sm">
                <div className="card-header text-center bg-primary text-white">
                  <h4 className="mb-0">Daily Standouts</h4>
                </div>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                    <span className="fw-bold me-2">Best Value (Price/Durability):</span>
                    {bestStats.bestPPDWeapon ? (
                      <span className="text-success fw-bolder">
                        ID: {bestStats.bestPPDWeapon.weapon.id} {bestStats.bestPPDWeapon.weapon.type} - {bestStats.bestPPDWeapon.weapon.name} ({bestStats.bestPPDWeapon.value.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </li>
                  <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                    <span className="fw-bold me-2">Best Cost-Effectiveness (Damage/Coin):</span>
                    {bestStats.bestDPCWeapon ? (
                      <span className="text-success fw-bolder">
                        ID: {bestStats.bestDPCWeapon.weapon.id} {bestStats.bestDPCWeapon.weapon.type} - {bestStats.bestDPCWeapon.weapon.name} ({bestStats.bestDPCWeapon.value.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </li>
                  <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                    <span className="fw-bold me-2">Overall Combat Efficiency:</span>
                    {bestStats.bestOCEWeapon ? (
                      <span className="text-success fw-bolder">
                        ID: {bestStats.bestOCEWeapon.weapon.id} {bestStats.bestOCEWeapon.weapon.type} - {bestStats.bestOCEWeapon.weapon.name} ({bestStats.bestOCEWeapon.value.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </li>
                </ul>
              </div>
            </div>
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
