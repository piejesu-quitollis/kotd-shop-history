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
  const [pickerDate, setPickerDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDates = useCallback(async () => {
    console.log('Calling fetchDates');
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
        console.error('Error fetching dates:', err);
        setError(err.message || 'Failed to fetch dates');
        return [];
    }
  }, []);

  const fetchWeaponsForDate = useCallback(async (date) => {
    console.log(`Calling fetchWeaponsForDate for ${date}`);
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
        console.error(`Error fetching weapons for date ${date}:`, err);
        setError(err.message || `Failed to fetch weapons for ${date}`);
        return [];
    }
  }, []); 

  const fetchDataForDate = useCallback(async (date) => {
    if (!date) return;
    console.log(`Calling fetchDataForDate for ${date}`);
    setLoading(true);
    try {
        let weapons = await fetchWeaponsForDate(date);
        if (weapons && weapons.length > 0) {
            weapons.sort((a, b) => a.id - b.id);
        }
        setData(prevState => ({ ...prevState, [date]: weapons || [] }));
    } catch (err) {

        console.error(`Error in fetchDataForDate for date ${date}:`, err);
        setData(prevState => ({ ...prevState, [date]: [] }));
    } finally {
        setLoading(false);
    }
  }, [fetchWeaponsForDate]);

  const fetchData = useCallback(async () => {
    console.log('Calling fetchData (initial/refresh)');
    setLoading(true);
    setError('');
    setData({});
    setSelectedDate('');
    setPickerDate(null);

    try {
        const fetchedDates = await fetchDates();
        setDates(fetchedDates);

        if (fetchedDates && fetchedDates.length > 0) {
            const latestDateStr = [...fetchedDates].sort((a, b) => b.localeCompare(a))[0];
            setSelectedDate(latestDateStr);
            
            const dateObj = parseISO(latestDateStr);
            if (isValid(dateObj)) {
              setPickerDate(dateObj);
            }
            await fetchDataForDate(latestDateStr);
        } else {
            console.log('No dates fetched.');
        }
    } catch (err) {
        console.error('Error fetching initial data:', err);
        setError(err.message || 'Failed to fetch initial data');
    } finally {
        setLoading(false);
    }
  }, [fetchDates, fetchDataForDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    console.log('Calling handleRefresh');
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
    } else {
      setSelectedDate('');
    }
  }, [fetchDataForDate, data]);

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

          {!loading && selectedDate && data[selectedDate] && data[selectedDate].length > 0 && (
            <TableCard
              date={selectedDate}
              data={data[selectedDate]}
            />
          )}

          {!loading && selectedDate && (!data[selectedDate] || data[selectedDate].length === 0) && !error && (
            <div className="alert alert-warning text-center" role="alert">
              No data available for the selected date: {selectedDate}.
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
        </div>
      </div>
    </div>
  );
}

export default VirtualTableList;