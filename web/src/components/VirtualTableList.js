import React, { useState, useEffect, useRef, useCallback } from 'react';
import TableCard from './TableCard';

const VirtualTableList = () => {
  const [dates, setDates] = useState([]);
  const [weaponsData, setWeaponsData] = useState({});
  const [positions, setPositions] = useState([]);   // { date, top, bottom } for each date
  const [totalHeight, setTotalHeight] = useState(0);
  const [visibleDates, setVisibleDates] = useState([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  // A ref object where each date maps to the DOM element of its card
  const cardRefs = useRef({});

  // ----------------
  // FETCH THE DATES
  // ----------------
  const fetchDates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/dates');
      if (!response.ok) {
        throw new Error(`Failed to fetch dates: ${response.statusText}`);
      }
      const data = await response.json();
      // Suppose each object has a "snapshot_date" property
      return data.map((d) => d.snapshot_date);
    } catch (error) {
      console.error('Error fetching dates:', error);
      return [];
    }
  };

  const fetchWeaponsForDate = async (date) => {
    try {
      const response = await fetch(`http://localhost:3001/api/weapons/${date}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch weapons for date ${date}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching weapons for date ${date}:`, error);
      return [];
    }
  };

  // -----------------------------
  // LOAD THE DATA ONCE AT START
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchedDates = await fetchDates();
        setDates(fetchedDates);

        const data = {};
        for (const date of fetchedDates) {
          const weapons = await fetchWeaponsForDate(date);
          data[date] = weapons;
        }
        setWeaponsData(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // -----------------------------------------------------
  // 1) Initialize positions array when we get new dates
  // -----------------------------------------------------
  useEffect(() => {
    // If no dates, positions remain empty
    if (!dates.length) {
      setPositions([]);
      setTotalHeight(0);
      setVisibleDates([]);
      return;
    }

    // Start each date with top/bottom = 0.
    // We'll fill these values after measuring the DOM.
    const initialPositions = dates.map((date) => ({
      date,
      top: 0,
      bottom: 0,
    }));

    setPositions(initialPositions);
  }, [dates]);

  // ------------------------------------------------------
  // 2) After render, measure each card's actual height
  // ------------------------------------------------------
  useEffect(() => {
    if (!positions.length) return;

    // We must measure in a layout effect or after the
    // DOM has rendered the elements in order to read their heights.
    // Here we do it in a normal effect, but often you'd do it in 
    // useLayoutEffect for more accurate measurement timing.
    const measuredPositions = [];
    let runningOffset = 0;

    for (const pos of positions) {
      // The card’s DOM element
      const cardEl = cardRefs.current[pos.date];
      // If it’s not rendered in the DOM yet (for whatever reason), skip
      if (!cardEl) {
        measuredPositions.push({ ...pos, top: runningOffset, bottom: runningOffset });
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

    // Update positions with real measurements
    setPositions(measuredPositions);

    // Compute totalHeight from the last item’s bottom
    if (measuredPositions.length > 0) {
      const lastBottom = measuredPositions[measuredPositions.length - 1].bottom;
      setTotalHeight(lastBottom);
    }
  }, [positions, weaponsData]);

  // ------------------------------------------------------
  // 3) Determine visible items on scroll
  // ------------------------------------------------------
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = containerRef.current.clientHeight;

    // Filter positions to those that overlap our viewport range
    // i.e. item is visible if [top, bottom] intersects [scrollTop, scrollTop+viewportHeight]
    const inViewDates = positions
      .filter(({ top, bottom }) => {
        return bottom >= scrollTop && top <= scrollTop + viewportHeight;
      })
      .map((p) => p.date);

    setVisibleDates(inViewDates);
  }, [positions]);

  // Attach scroll handler once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    // run once on mount
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // ----------------
  // RENDER
  // ----------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="py-8 px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Weapons Shop History
        </h1>

        {/* Outer scroll container */}
        <div
          ref={containerRef}
          className="h-[calc(100vh-12rem)] overflow-y-auto rounded-xl bg-white/50 backdrop-blur-sm shadow-inner relative"
        >
          {/* The big absolute container that’s as tall as all items combined */}
          <div
            className="relative"
            style={{ height: `${totalHeight}px` }}
          >
            {/* Render a div for each date so we can measure it.
                Only mount <TableCard> if the item is in visibleDates. */}
            {positions.map(({ date, top, bottom }) => {
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
                  }}
                >
                  {/* Only render if within scroll window, to keep DOM small */}
                  {isVisible && (
                    <TableCard
                      date={date}
                      data={weaponsData[date] || []}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading indicator */}
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
