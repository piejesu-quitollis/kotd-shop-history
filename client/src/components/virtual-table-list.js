import { httpsCallable } from 'firebase/functions';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TableCard from './table-card';
import { functions } from '../firebase';


function VirtualTableList() {
  const [data, setData] = useState({});
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [positions, setPositions] = useState([]);
  const [totalHeight, setTotalHeight] = useState(0);
  const [visibleDates, setVisibleDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const cardRefs = useRef({});

    // Add buffer zones for smoother scrolling
  const BUFFER_SIZE = 500; // pixels to add above and below viewport
    
  const fetchDates = useCallback(async () => {
    try {
        const getAllDatesFunction = httpsCallable(functions, 'getAllDates');
        const result = await getAllDatesFunction();
        console.log('Result from getAllDates:', result); 
        return result.data.map((d) => d.snapshot_date);
    } catch (error) {
        console.error('Error fetching dates:', error);
        setError(error.message);
        return [];
    }
}, []);

const fetchWeaponsForDate = useCallback(async (date) => {
  try {
      const getWeaponsByDateFunction = httpsCallable(functions, 'getWeaponsByDate');
      const result = await getWeaponsByDateFunction({ date });
      console.log('Result from getWeaponsByDate:', result); 
      return result.data;
  } catch (error) {
      console.error(`Error fetching weapons for date ${date}:`, error);
      setError(error.message);
      return [];
  }
}, []);
    
  const fetchData = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
          const fetchedDates = await fetchDates();
          setDates(fetchedDates);
          
          const data = {};
          for (const date of fetchedDates) {
              const weapons = await fetchWeaponsForDate(date);
              data[date] = weapons;
          }
          setData(data);
      } catch (error) {
          console.error('Error fetching data:', error);
          setError(error.message);
      } finally {
          setLoading(false);
      }
  }, [fetchDates, fetchWeaponsForDate]);
    
  useEffect(() => {
      fetchData();
  }, [fetchData]);
    
    // Initialize positions with proper spacing
    useEffect(() => {
        if (!dates.length) {
          setPositions([]);
            setTotalHeight(0);
            setVisibleDates([]);
            return;
        }
  
        // Estimate initial height for better initial rendering
      const ESTIMATED_CARD_HEIGHT = 400;
        const initialPositions = dates.map((date, index) => ({
          date,
          top: index * ESTIMATED_CARD_HEIGHT,
          bottom: (index + 1) * ESTIMATED_CARD_HEIGHT,
      }));

      setPositions(initialPositions);
        setTotalHeight(dates.length * ESTIMATED_CARD_HEIGHT);
    }, [dates]);
  
      // Measure actual heights and update positions
      useEffect(() => {
          if (!positions.length) return;
      
          // Use requestAnimationFram­e to ensure DOM is ready
          requestAnimationFrame(() => {
            const measuredPositions = [];
                let runningOffset = 0;
        
            for (const pos of positions) {
                 const cardEl = cardRefs.current[pos.date];
                 if (!cardEl) {
                   // Keep estimated height if element isn't measured yet
                    measuredPositions.push({ ...pos });
                 runningOffset = pos.bottom;
                   continue;
                }

               const height = cardEl.offsetHeight;
                const top = runningOffset;
              const bottom = top + height;
            runningOffset = bottom;
          
             measuredPositions.push({
                date: pos.date,
                top,
                bottom,
            });
        }
          
          setPositions(measuredPositions);
            if (measuredPositions.length > 0) {
              setTotalHeight(measuredPositions[measuredPositions.length - 1].bottom);
            }
          });
       }, [positions, data]);

    // Improved scroll handler with buffer zones
    const handleScroll = useCallback(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
          const viewportHeight = containerRef.current.clientHeight;
     
      // Add buffer zones above and below viewport
        const visibleTop = Math.max(0, scrollTop - BUFFER_SIZE);
      const visibleBottom = scrollTop + viewportHeight + BUFFER_SIZE;

        const inViewDates = positions
         .filter(({ top, bottom }) => {
            // Check if any part of the item is within the buffered viewport
          return bottom >= visibleTop && top <= visibleBottom;
         })
         .map((p) => p.date);

       setVisibleDates(inViewDates);
  }, [positions]);

  useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
       // Use requestAnimationFram­e for smoother scroll handling
      let rafId;
        const scrollListener = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              handleScroll();
           });
           };
        
        container.addEventListener('scroll', scrollListener, { passive: true });
      handleScroll(); // Initial check

        return () => {
            container.removeEventListener('scroll', scrollListener);
          cancelAnimationFrame(rafId);
       };
    }, [handleScroll]);

  const fetchDataForDate = async (date) => {
    setLoading(true);
      setError('');
    try {
        const weapons = await fetchWeaponsForDate(date);
        setData(prevState => ({ ...prevState, [date]: weapons }));
    } catch (error) {
        console.error(`Error fetching data for date ${date}:`, error);
          setError(error.message);
        } finally {
            setLoading(false);
        }
   };
  
  const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        fetchDataForDate(newDate)
    };
    
  const handleRefresh = async () => {
      setLoading(true);
      setError('');
      try {
          await fetchData(); // Fetch new data instead of calling a missing function
          setSelectedDate('');
          setData({});
      } catch (err) {
          console.error('Failed to fetch data.', err.message);
          setError('Failed to fetch data');
      } finally {
          setLoading(false);
      }
  };
  

  return (
    <div className="container-fluid vh-100 bg-light">
      <div className="py-4">
        <h1 className="display-4 text-center mb-4">
          Weapons Shop History
        </h1>
      
        <div className="d-flex justify-content-center align-items-center mb-3">
          <label htmlFor="date-select" className="me-2 form-label">
            Select Date:
          </label>
          <select
            id="date-select"
            value={selectedDate}
            onChange={handleDateChange}
            className="form-select me-2"
            style={{ width: 'auto' }}
          >
            <option value="">-- Select a date --</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
      
          <button 
            onClick={handleRefresh}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger text-center" role="alert">
            {error}
          </div>
        )}

        <div
          ref={containerRef}
          className="position-relative overflow-auto"
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <div
            className="position-relative"
            style={{ height: `${totalHeight}px` }}
          >
            {positions.map(({ date, top }) => {
              const isVisible = visibleDates.includes(date);
              return (
                <div
                  key={date}
                  ref={(el) => (cardRefs.current[date] = el)}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: 0,
                    right: 0,
                    visibility: isVisible ? 'visible' : 'hidden',
                  }}
                >
                  <TableCard
                    date={date}
                    data={data[date] || []}
                  />
                </div>
              );
            })}
          </div>
          
          {loading && (
            <div className="position-sticky bottom-0 text-center py-3 bg-white bg-opacity-75">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading more data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VirtualTableList;