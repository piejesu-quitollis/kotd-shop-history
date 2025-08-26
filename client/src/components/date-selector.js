import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function DateSelector({ selectedDateObj, onChange, validDates, disabled, onRefresh, loading, hasDates }) {
  return (
    <div className="d-flex justify-content-center align-items-center mb-3">
      <label htmlFor="date-select" className="me-2 form-label">Select Date:</label>
      <DatePicker
        id="date-select"
        selected={selectedDateObj}
        onChange={onChange}
        includeDates={validDates?.length > 0 ? validDates : undefined}
        dateFormat="yyyy-MM-dd"
        className="form-select me-2"
        placeholderText={hasDates ? 'Select a date' : 'Loading dates...'}
        maxDate={new Date()}
        disabled={disabled}
      />
      <button onClick={onRefresh} className="btn btn-primary" disabled={loading}>
        {loading && !hasDates ? 'Fetching Dates...' : 'Refresh Dates'}
      </button>
    </div>
  );
}
