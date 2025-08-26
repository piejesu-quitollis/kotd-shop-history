import React from 'react';
import { getPriceChangeInfo, calculatePricePerDurability, calculatePricePerDamageTimesDurability } from '../utils/weapon-utils.js';

const TableCard = ({ data, date, previousData }) => {
  const getElementBadgeClass = (element) => {
    const badgeClasses = {
      'Blessed': 'bg-warning',
      'Cursed': 'bg-dark',
      'Synthetic': 'bg-info',
      'Air': 'bg-info',
      'Sun': 'bg-warning',
      'Moon': 'bg-primary',
      'Earth': 'bg-secondary',
      'Fire': 'bg-danger',
      'Water': 'bg-primary',
      'Organic': 'bg-success'
    };
    return `badge ${badgeClasses[element] || 'bg-secondary'}`;
  };

  const formatMetric = (num) => {
    if (num == null) return '-';
    return parseFloat(num.toFixed(2)).toString();
  };

  const computeStats = (values) => {
    const nums = values.filter(v => v != null && !Number.isNaN(v));
    if (nums.length === 0) return { avg: null, min: null, max: null, sorted: [], n: 0 };
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const sorted = nums.slice().sort((a, b) => a - b);
    return { avg, min, max, sorted, n: sorted.length };
  };

  const lowerBound = (arr, x) => {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  const upperBound = (arr, x) => {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= x) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  const percentileOf = (value, stats) => {
    const { sorted, n } = stats || {};
    if (!sorted || !n) return null;
    const lo = lowerBound(sorted, value);
    const hi = upperBound(sorted, value);
    // Midrank percentile in [0,1]
    return ((lo + hi) / 2) / n;
  };

  const valueToColor = (value, stats) => {
    if (value == null || !stats || stats.n === 0) return undefined;
    // 5-stop palette based on percentiles: 0, 0.25, 0.5, 0.75, 1.0
    const STOPS = [
      { p: 0.0, h: 148, s: 41, l: 54 }, // max green
      { p: 0.25, h: 82, s: 43, l: 63 }, // between green & middle
      { p: 0.5, h: 44, s: 100, l: 70 }, // middle (yellow)
      { p: 0.75, h: 26, s: 85, l: 69 }, // between red & middle
      { p: 1.0, h: 4, s: 71, l: 68 },   // max red
    ];
    if (stats.min === stats.max) {
      const c = STOPS[2];
      return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
    }
    const p = percentileOf(value, stats);
    if (p == null) return undefined;
    // Clamp percentile to [0,1]
    const pc = p < 0 ? 0 : p > 1 ? 1 : p;
    // Find surrounding stops
    let left = STOPS[0];
    let right = STOPS[STOPS.length - 1];
    for (let i = 0; i < STOPS.length - 1; i++) {
      const a = STOPS[i], b = STOPS[i + 1];
      if (pc >= a.p && pc <= b.p) { left = a; right = b; break; }
    }
    const span = Math.max(right.p - left.p, 1e-6);
    const t = (pc - left.p) / span; // 0..1
    const lerp = (a, b, tt) => a + (b - a) * tt;
    const h = Math.round(lerp(left.h, right.h, t));
    const s = Math.round(lerp(left.s, right.s, t));
    const l = Math.round(lerp(left.l, right.l, t));
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  // Precompute metric arrays and stats
  const ppdList = data.map(w => calculatePricePerDurability(w));
  const ppddList = data.map(w => calculatePricePerDamageTimesDurability(w));
  const ppdStats = computeStats(ppdList);
  const ppddStats = computeStats(ppddList);

  return (
    <div className="row mx-3 mb-4 g-3">
      {/* Left card: calculated metrics */}
      <div className="col-12 col-lg-3">
        <div className="card shadow-sm h-100">
          <div className="card-header bg-secondary text-white">
            <h5 className="card-title mb-0">Calculated Metrics</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Price/Durability</th>
                    <th style={{ width: '50%' }}>Price/(Damage*Durability)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((weapon, idx) => {
                    const ppd = ppdList[idx];
                    const ppdd = ppddList[idx];
                    return (
                      <tr key={`metrics-${weapon.id}`}>
                        <td style={{ backgroundColor: valueToColor(ppd, ppdStats) }}>{formatMetric(ppd)}</td>
                        <td style={{ backgroundColor: valueToColor(ppdd, ppddStats) }}>{formatMetric(ppdd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Right card: main weapon data */}
      <div className="col-12 col-lg-9">
        <div className="card shadow-sm h-100">
          <div className="card-header bg-primary text-white">
            <h5 className="card-title mb-0">Shop: {date}</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0">
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Damage</th>
                    <th>Durability</th>
                    <th>Element</th>
                    <th>Req Lv.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((weapon) => {
                    const priceChangeInfo = getPriceChangeInfo(weapon, previousData);
                    return (
                      <tr key={weapon.id}>
                        <td>
                          {weapon.price}
                          {priceChangeInfo && (
                            <span style={{ color: priceChangeInfo.color, marginLeft: '5px', fontSize: '0.9em' }}>
                              ({priceChangeInfo.sign}
                              {typeof priceChangeInfo.amount === 'string'
                                ? priceChangeInfo.amount
                                : `${priceChangeInfo.amount.toFixed(1)}%`}
                              )
                            </span>
                          )}
                        </td>
                        <td>{weapon.id}</td>
                        <td>{weapon.type}</td>
                        <td><strong>{weapon.name}</strong></td>
                        <td>{weapon.damage}</td>
                        <td>{weapon.durability}</td>
                        <td>
                          <span className={getElementBadgeClass(weapon.element)}>
                            {weapon.element}
                          </span>
                        </td>
                        <td>{weapon.reqLevel != null ? weapon.reqLevel : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableCard;