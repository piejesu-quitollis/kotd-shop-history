import React, { useState, useEffect, useCallback } from 'react';
import TableCard from './table-card';

function VirtualTableList() {
  const [data, setData] = useState({});
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
    
  const FUNCTION_BASE_URL = 'https://europe-west1-kotd-shop-history.cloudfunctions.net';

  const fetchDates = useCallback(async () => {
    try {
        const response = await fetch(`${FUNCTION_BASE_URL}/getAllDates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        const result = await response.json();
        console.log('Result from getAllDates:', result);
        return result.data.map((d) => d.snapshot_date);
    } catch (error) {
        console.error('Error fetching dates:', error);
        setError(error.message || 'Failed to fetch dates');
        return [];
    }
  }, []);

  const fetchWeaponsForDate = useCallback(async (date) => {
    try {
        const response = await fetch(`${FUNCTION_BASE_URL}/getWeaponsByDate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { date } }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        const result = await response.json();
        console.log('Result from getWeaponsByDate:', result);
        return result.data;
    } catch (error) {
        console.error(`Error fetching weapons for date ${date}:`, error);
        setError(error.message || `Failed to fetch weapons for ${date}`);
        return [];
    }
  }, []);
    
  const fetchData = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
          const fetchedDates = await fetchDates();
          setDates(fetchedDates);
          setData({});
      } catch (error) {
          console.error('Error fetching initial dates:', error);
          setError(error.message || 'Failed to fetch initial dates');
      } finally {
          setLoading(false);
      }
  }, [fetchDates]);
    
  useEffect(() => {
      fetchData();
  }, [fetchData]);

  const fetchDataForDate = async (date) => {
    if (!date) return;
    setLoading(true);
    setError('');
    try {
        const weapons = await fetchWeaponsForDate(date);
        setData(prevState => ({ ...prevState, [date]: weapons }));
    } catch (error) {
        console.error(`Error fetching data for date ${date}:`, error);
        setError(error.message || `Failed to fetch data for ${date}`);
    } finally {
        setLoading(false);
    }
  };
  
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (newDate) {
        fetchDataForDate(newDate);
    } else {
    }
  };
    
  const handleRefresh = async () => {
      setLoading(true);
      setError('');
      try {
          await fetchData();
          setSelectedDate('');
      } catch (err) {
          console.error('Failed to refresh dates.', err.message);
          setError('Failed to refresh dates');
      } finally {
          setLoading(false);
      }
  };
  

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
          <input
            type="date"
            id="date-select"
            value={selectedDate}
            onChange={handleDateChange}
            className="form-select me-2"
            style={{ width: 'auto' }}
          />
      
          <button 
            onClick={handleRefresh}
            className="btn btn-primary"
            disabled={loading && !selectedDate}
          >
            {loading && !dates.length ? 'Fetching Dates...' : 'Refresh Dates'}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger text-center" role="alert">
            {error}
          </div>
        )}

        <div className="mt-4">
          {!selectedDate && !loading && !error && (
            <div className="alert alert-info text-center" role="alert">
              Please select a date to view the shop history.
            </div>
          )}

          {loading && selectedDate && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading weapons for {selectedDate}...</span>
              </div>
              <p className="mt-2 text-muted">Loading weapons for {selectedDate}...</p>
            </div>
          )}

          {!loading && selectedDate && data[selectedDate] && (
            <TableCard
              date={selectedDate}
              data={data[selectedDate]}
            />
          )}

          {!loading && selectedDate && !data[selectedDate] && !error && (
            <div className="alert alert-warning text-center" role="alert">
              No data available for the selected date: {selectedDate}.
            </div>
          )}
          
          {loading && !selectedDate && (
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