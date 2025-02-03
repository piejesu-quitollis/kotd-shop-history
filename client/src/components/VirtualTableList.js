import React, { useState, useEffect, useRef, useCallback } from 'react';
import TableCard from './TableCard';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';


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
    
    const fetchDates = async () => {
        try {
            const getAvailableDatesFunction = httpsCallable(functions, "getAvailableDates");
            const result = await getAvailableDatesFunction();
            return result.data.map((d) => d.snapshot_date);
        } catch (error) {
            console.error('Error fetching dates:', error);
            setError(error.message);
            return [];
        }
    };

    const fetchWeaponsForDate = async (date) => {
      try {
        const getWeaponsByDateFunction = httpsCallable(functions, "getWeaponsByDate");
          const result = await getWeaponsByDateFunction({date: date});
          return result.data;
      } catch (error) {
          console.error(`Error fetching weapons for date ${date}:`, error.message);
          setError(error.message);
          return [];
      }
    };
    
    const fetchData = async () => {
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
    };
    
    useEffect(() => {
        fetchData();
    });
    
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
      setLoading(true)
       setError('');
       try {
           const triggerUpdateFunction = httpsCallable(functions, "triggerUpdate");
            const updateData = await triggerUpdateFunction()
             if(updateData.data.message === 'Data saved successfully' ||
                updateData.data.message === 'Update triggered successfully') {
                    await fetchData();
                setSelectedDate('');
              setData({});
              }
                else {
             setError('Failed to fetch data')
           }
        } catch (err) {
          console.error('Failed to fetch data.', err.message)
          setError('Failed to fetch data')
        } finally{
          setLoading(false)
      }

 };

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="py-8 px-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Weapons Shop History
          </h1>
        
            <div className="flex justify-center mb-4">
                <label htmlFor="date-select" className="mr-2 text-sm font-medium text-gray-900 dark:text-white">
                    Select Date:
                  </label>
               <select
                 id="date-select"
                  value={selectedDate}
                    onChange={handleDateChange}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                      <option value="">-- Select a date --</option>
                       {dates.map((date) => (
                           <option
                               key={date}
                            value={date}
                           >
                             {date}
                            </option>
                            ))}
              </select>
           
              <button 
              onClick={handleRefresh}
                className="ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={loading}
                  >
                  {loading ? 'Fetching...' : 'Refresh Data'}
                 </button>
        </div>
          <div className="px-2 pb-2">
            {error && <p className="text-red-500">{error}</p>}
          </div>
        <div
          ref={containerRef}
          className="h-[calc(100vh-9rem)] overflow-y-auto rounded-xl bg-white/50 backdrop-blur-sm shadow-inner relative"
            >
            <div
            className="relative"
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
               <div className="text-center py-8 sticky bottom-0 bg-white/50 backdrop-blur-sm">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]"
                    role="status"
                  >
                <span className="hidden">Loading...</span>
                  </div>
                    <p className="mt-4 text-gray-600 font-medium">Loading more data...</p>
               </div>
                  )}
            </div>
      </div>
     </div>
    );
};

export default VirtualTableList;