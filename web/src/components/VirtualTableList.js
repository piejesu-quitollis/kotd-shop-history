import React, { useState, useEffect, useRef, useCallback } from 'react';
import TableCard from './TableCard';

const VirtualTableList = () => {
  const [dates, setDates] = useState([]);
  const [weaponsData, setWeaponsData] = useState({});
  const [positions, setPositions] = useState([]);
  const [totalHeight, setTotalHeight] = useState(0);
  const [visibleDates, setVisibleDates] = useState([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const cardRefs = useRef({});
  
  // Add buffer zones for smoother scrolling
  const BUFFER_SIZE = 500; // pixels to add above and below viewport

  const fetchDates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/dates');
      if (!response.ok) {
        throw new Error(`Failed to fetch dates: ${response.statusText}`);
      }
      const data = await response.json();
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

  // Initialize positions with proper spacing
  useEffect(() => {
    if (!dates.length) {
      setPositions([]);
      setTotalHeight(0);
      setVisibleDates([]);
      return;
    }

    // Estimate initial height for better initial rendering
    const ESTIMATED_CARD_HEIGHT = 400; // Adjust based on your typical card height
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

    // Use requestAnimationFrame to ensure DOM is ready
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
  }, [positions, weaponsData]);

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

    // Use requestAnimationFrame for smoother scroll handling
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="py-8 px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Weapons Shop History
        </h1>

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
                    visibility: isVisible ? 'visible' : 'hidden', // Use visibility instead of conditional rendering
                  }}
                >
                  <TableCard
                    date={date}
                    data={weaponsData[date] || []}
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