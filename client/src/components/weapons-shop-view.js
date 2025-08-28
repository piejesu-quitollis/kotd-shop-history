import React from 'react';
import TableCard from './table-card';
import useWeaponShopData from '../hooks/use-weapon-shop-data';

function WeaponsShopView() {
  const {
    latestDate,
    latestItems,
    loading,
    error,
    refresh,
  } = useWeaponShopData();

  return (
    <div className="container-fluid bg-light px-0 px-md-3" style={{ minHeight: '100vh' }}>
      <div className="py-4">
        <h1 className="display-4 text-center mb-4">Weapons Shop History</h1>

        <div className="text-center mb-3">
          <div className="d-inline-flex align-items-center gap-2">
            <div className="text-muted">Latest date: {latestDate || '-'}</div>
            <button className="btn btn-outline-primary btn-sm" onClick={refresh} disabled={loading}>Refresh</button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger text-center" role="alert">{error}</div>
        )}

        {/* Daily standouts removed for now */}

        <div className="mt-4">
          {loading && latestDate && (!latestItems || latestItems.length === 0) && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading latest shop...</span>
              </div>
              <p className="mt-2 text-muted">Loading latest shop...</p>
            </div>
          )}

          {loading && !latestDate && (
            <div className="text-center py-3">
              <div className="spinner-border text-secondary" role="status">
                <span className="visually-hidden">Loading available dates...</span>
              </div>
              <p className="mt-2 text-muted">Loading available dates...</p>
            </div>
          )}

  {!loading && latestDate && latestItems && latestItems.length > 0 && (
            <div className="w-100 text-center">
            <TableCard
              date={latestDate}
              data={latestItems.map(i => ({
        id: Number(i.weaponId),
        // join static fields (returned under i.weapon when includeStatic=true)
        name: i.name || (i.weapon && i.weapon.name) || '-',
        type: i.type || (i.weapon && i.weapon.type) || '-',
                element: i.element || (i.weapon && i.weapon.element) || '-',
        damage: (i.baseDamage != null ? i.baseDamage : (i.weapon && i.weapon.baseDamage)) ?? null,
                price: i.price,
                durability: i.durability,
              }))}
              previousData={null}
              allDates={[]}
              dataByDate={{}}
            />
            </div>
          )}

          {!loading && latestDate && (!latestItems || latestItems.length === 0) && !error && (
            <div className="alert alert-warning text-center" role="alert">No data available for the latest date: {latestDate}.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeaponsShopView;
