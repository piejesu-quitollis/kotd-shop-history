import React from 'react';
import TableCard from './table-card';
import DateSelector from './date-selector';
import BestWeaponsCard from './best-weapons-card';
import useWeaponShopData from '../hooks/useWeaponShopData';

function WeaponsShopView() {
  const {
    dataByDate,
    dates,
    selectedDate,
    previousComparisonDate,
    pickerDate,
    loading,
    error,
    validDates,
    bestStats,
    handleDateChange,
    refresh,
  } = useWeaponShopData();

  return (
    <div className="container-fluid bg-light" style={{ minHeight: '100vh' }}>
      <div className="py-4">
        <h1 className="display-4 text-center mb-4">Weapons Shop History</h1>

        <DateSelector
          selectedDateObj={pickerDate}
          onChange={handleDateChange}
          validDates={validDates}
          disabled={loading && !dates.length}
          onRefresh={refresh}
          loading={loading}
          hasDates={dates.length > 0}
        />

        {error && (
          <div className="alert alert-danger text-center" role="alert">{error}</div>
        )}

        {!loading && selectedDate && dataByDate[selectedDate] && dataByDate[selectedDate].length > 0 && (
          <BestWeaponsCard
            bestPPDWeapon={bestStats.bestPPDWeapon}
            bestDPCWeapon={bestStats.bestDPCWeapon}
            bestOCEWeapon={bestStats.bestOCEWeapon}
          />
        )}

        <div className="mt-4">
          {!selectedDate && !loading && !error && dates.length > 0 && (
            <div className="alert alert-info text-center" role="alert">Please select a date to view the shop history.</div>
          )}
          {!selectedDate && !loading && !error && dates.length === 0 && (
            <div className="alert alert-info text-center" role="alert">No dates available or still loading initial data.</div>
          )}

          {loading && selectedDate && (!dataByDate[selectedDate] || dataByDate[selectedDate]?.length === 0) && (
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

          {!loading && selectedDate && dataByDate[selectedDate] && dataByDate[selectedDate].length > 0 && (
            <TableCard
              date={selectedDate}
              data={dataByDate[selectedDate]}
              previousData={previousComparisonDate ? dataByDate[previousComparisonDate] : null}
            />
          )}

          {!loading && selectedDate && (!dataByDate[selectedDate] || dataByDate[selectedDate].length === 0) && !error && (
            <div className="alert alert-warning text-center" role="alert">No data available for the selected date: {selectedDate}.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeaponsShopView;
