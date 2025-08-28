import React, { useState, useCallback } from 'react';
import { calculatePricePerDurability, calculatePricePerDamageTimesDurability } from '../utils/weapon-utils.js';
import { getHistoryByWeapon } from '../services/functions-client.js';

const TableCard = ({ data, date }) => {
  const [openRows, setOpenRows] = useState({}); // { [weaponId]: bool }
  const [seriesById, setSeriesById] = useState({}); // { [weaponId]: Array<{date, value}> }
  const [loadingSeries, setLoadingSeries] = useState({}); // { [weaponId]: bool }
  // Series removed in minimal view

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

  // Helpers for weekly chart

  const getPPDSeries = useCallback((weaponId) => {
    return seriesById[weaponId] || [];
  }, [seriesById]);

  const fetchPPDSeries = useCallback(async (weaponId) => {
    if (!weaponId) return;
    if (seriesById[weaponId] || loadingSeries[weaponId]) return; // cached or in-flight
    try {
      setLoadingSeries(prev => ({ ...prev, [weaponId]: true }));
      const data = await getHistoryByWeapon(String(weaponId)); // returns rows sorted asc by date
      const rows = Array.isArray(data) ? data : (data && data.history ? data.history : []);
      // Build newest->older so Sparkline (which reverses) shows older->newest left->right
      const series = rows.slice().reverse().map(r => ({ date: r.date, value: calculatePricePerDurability(r) }));
      setSeriesById(prev => ({ ...prev, [weaponId]: series }));
    } catch (err) {
      // On error, cache empty to avoid refetch loop, but leave a console hint
      // eslint-disable-next-line no-console
      console.error('Failed to fetch history for weapon', weaponId, err);
      setSeriesById(prev => ({ ...prev, [weaponId]: [] }));
    } finally {
      setLoadingSeries(prev => ({ ...prev, [weaponId]: false }));
    }
  }, [seriesById, loadingSeries]);

  const Sparkline = ({ series }) => {
    // Hover state must be declared before any early returns
    const [hoverIdx, setHoverIdx] = useState(null);
    if (!series || series.length === 0) {
      return <div className="text-muted small">No data in history.</div>;
    }
    // Reverse to older..newest for left->right
    const seq = [...series].reverse();
    const values = seq.map(p => p.value).filter(v => v != null);
    let min = values.length ? Math.min(...values) : 0;
    let max = values.length ? Math.max(...values) : 1;
    // Add a little padding so line/points don't touch borders
    if (values.length) {
      const pad = (max - min) * 0.05 || 1; // at least 1 for flat lines
      min = min - pad;
      max = max + pad;
    }
  // Size: make it comfortably wide and horizontally scrollable if needed
  const h = 160; // a bit taller for readability
    const PAD_TOP = 8;
    const PAD_RIGHT = 8;
    const Y_AXIS_W = 44;
    const X_AXIS_H = 22;
  const plotX = Y_AXIS_W;
  const plotY = PAD_TOP;
    const n = seq.length;
  // Target about 32px per step, minimum plot width 600
  const STEP_W = 16;
  const minPlotW = 300;
  const plotW = Math.max(minPlotW, n > 1 ? (n - 1) * STEP_W : 100);
  const plotH = h - PAD_TOP - X_AXIS_H;
  const w = plotW + Y_AXIS_W + PAD_RIGHT;

  const xAt = (i) => (n > 1 ? plotX + (i * plotW) / (n - 1) : plotX + plotW / 2);
    const yAt = (v) => {
      if (max === min) return plotY + plotH / 2;
      const t = (v - min) / (max - min);
      return plotY + (1 - t) * plotH;
    };

    const axisColor = '#ced4da'; // bootstrap border color
    const labelColor = '#6c757d'; // text-secondary
    const tickSize = 4;

    // Y-axis ticks: min, mid, max
    const yTicksVals = max === min ? [min] : [min, (min + max) / 2, max];
    const fmtNum = (v) => (v >= 1000 ? Math.round(v).toLocaleString() : Math.round(v).toString());
  // Downsample x labels if many points to avoid clutter
  const xLabels = seq.map(p => (typeof p.date === 'string' ? p.date.slice(5) : ''));
  const labelEvery = seq.length > 10 ? Math.ceil(seq.length / 6) : 1; // ~6 labels max

    // Hover helpers
    const onMove = (evt) => {
      const svg = evt.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      const inv = svg.getScreenCTM().inverse();
      const loc = pt.matrixTransform(inv);
      const x = loc.x;
      const t = Math.max(0, Math.min(1, (x - plotX) / Math.max(plotW, 1)));
      const idx = Math.round(t * (n - 1));
      setHoverIdx(idx);
    };
    const onLeave = () => setHoverIdx(null);

    const parseDay = (s) => new Date(`${s}T00:00:00Z`);
    const daysBetween = (a, b) => {
      if (!a || !b) return 0;
      const d1 = parseDay(a), d2 = parseDay(b);
      return Math.round((d2 - d1) / (24 * 3600 * 1000));
    };

    return (
      <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" onMouseMove={onMove} onMouseLeave={onLeave}>
          {/* axes */}
          <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={axisColor} strokeWidth="1" />
          <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={axisColor} strokeWidth="1" />
          {/* Y axis label */}
          <text x={12} y={plotY + plotH / 2} fontSize="10" fill={labelColor} textAnchor="middle" transform={`rotate(-90 12 ${plotY + plotH / 2})`}>
            P/D
          </text>

          {/* Y ticks and labels */}
          {yTicksVals.map((v, i) => {
            const y = yAt(v);
            return (
              <g key={`yt-${i}`}>
                <line x1={plotX - tickSize} y1={y} x2={plotX} y2={y} stroke={axisColor} strokeWidth="1" />
                <text x={plotX - tickSize - 2} y={y + 3} fontSize="10" fill={labelColor} textAnchor="end">{fmtNum(v)}</text>
                {/* optional grid */}
                <line x1={plotX} y1={y} x2={plotX + plotW} y2={y} stroke={axisColor} strokeWidth="0.5" opacity="0.25" />
              </g>
            );
          })}

          {/* X ticks and labels */}
          {seq.map((p, i) => {
            const x = xAt(i);
            return (
              <g key={`xt-${i}`}>
                <line x1={x} y1={plotY + plotH} x2={x} y2={plotY + plotH + tickSize} stroke={axisColor} strokeWidth="1" />
                {i % labelEvery === 0 && (
                  <text x={x - 2} y={plotY + plotH + tickSize + 10} fontSize="10" fill={labelColor} transform={`rotate(-45 ${x} ${plotY + plotH + tickSize + 10})`} textAnchor="end">
                    {xLabels[i]}
                  </text>
                )}
              </g>
            );
          })}

          {/* series: blue for consecutive days, grey for gaps (missing days > 1) */}
          {n > 1 && seq.map((p, i) => {
            if (i === 0) return null;
            const prev = seq[i - 1];
            if (p.value == null || prev.value == null) return null;
            const x1 = xAt(i - 1), y1 = yAt(prev.value);
            const x2 = xAt(i), y2 = yAt(p.value);
            const gap = daysBetween(prev.date, p.date);
            if (gap <= 1) {
              return <line key={`seg-b-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0d6efd" strokeWidth="2" />;
            }
            return <line key={`seg-g-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#adb5bd" strokeWidth="2" />;
          })}

          {/* points: blue for data */}
          {seq.map((p, i) => (
            p.value != null ? (
              <circle key={`pt-${i}`} cx={xAt(i)} cy={yAt(p.value)} r="3" fill="#0d6efd" />
            ) : null
          ))}

          {/* hover indicator and tooltip */}
          {hoverIdx != null && seq[hoverIdx] && (
            <g>
              <line x1={xAt(hoverIdx)} y1={plotY} x2={xAt(hoverIdx)} y2={plotY + plotH} stroke="#6c757d" strokeWidth="1" opacity="0.4" />
              {seq[hoverIdx].value != null && (
                <circle cx={xAt(hoverIdx)} cy={yAt(seq[hoverIdx].value)} r="4" fill="#0d6efd" stroke="#fff" strokeWidth="1" />
              )}
              {/* tooltip bubble */}
              <g transform={`translate(${Math.min(xAt(hoverIdx) + 8, plotX + plotW - 120)}, ${plotY + 8})`}>
                <rect width="120" height="40" rx="6" ry="6" fill="#212529" opacity="0.9" />
                <text x="8" y="16" fontSize="12" fill="#f8f9fa">{xLabels[hoverIdx]}</text>
                <text x="8" y="30" fontSize="12" fill="#f8f9fa">P/D: {seq[hoverIdx].value != null ? Math.round(seq[hoverIdx].value * 100) / 100 : '—'}</text>
              </g>
            </g>
          )}

          {/* capture pointer events */}
          <rect x={0} y={0} width={w} height={h} fill="transparent" pointerEvents="all" />
        </svg>
      </div>
    );
  };

  const toggleRow = async (weapon) => {
    const wid = weapon.id != null ? weapon.id : weapon.weaponId;
    setOpenRows(prev => {
      const willOpen = !prev[wid];
      // Trigger fetch if opening and not cached
      if (willOpen && !seriesById[wid] && !loadingSeries[wid]) {
        // fire and forget
        fetchPPDSeries(wid);
      }
      return { ...prev, [wid]: willOpen };
    });
  };

  return (
    <div className="card shadow-sm mx-0 mx-md-3 mb-4">
      <div className="card-body p-0">
        <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="table table-hover table-sm text-nowrap mb-0" style={{ fontSize: '0.9rem', minWidth: 640 }}>
            <thead>
              <tr className="align-middle">
                <th colSpan={2} className="bg-secondary text-white">Calculated Metrics</th>
                <th style={{ width: 12, backgroundColor: 'transparent', border: 'none' }}></th>
                <th colSpan={5} className="bg-primary text-white">Weapons</th>
              </tr>
              <tr>
                <th><span title="Price divided by Durability">P / Dur.</span></th>
                <th><span title="Price divided by (Damage × Durability)">P / (Dmg × Dur.)</span></th>
                <th style={{ width: 12, backgroundColor: 'transparent', border: 'none' }}></th>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Element</th>
                <th>Damage</th>
                {/* Price and Durability are hidden but used for calculations */}
              </tr>
            </thead>
            <tbody>
              {data.map((weapon, idx) => {
                const wid = weapon.id != null ? weapon.id : weapon.weaponId;
                const ppd = ppdList[idx];
                const ppdd = ppddList[idx];
                return (
                  <React.Fragment key={wid}>
                    <tr onClick={() => toggleRow(weapon)} style={{ cursor: 'pointer' }}>
                      <td style={{ backgroundColor: valueToColor(ppd, ppdStats) }}>{formatMetric(ppd)}</td>
                      <td style={{ backgroundColor: valueToColor(ppdd, ppddStats) }}>{formatMetric(ppdd)}</td>
                      <td style={{ width: 12, backgroundColor: 'transparent', border: 'none' }}></td>
                      <td>{wid}</td>
                      <td>{weapon.name || '-'}</td>
                      <td>{weapon.type || '-'}</td>
                      <td>
                        <span className={getElementBadgeClass(weapon.element)}>{weapon.element || '-'}</span>
                      </td>
                      <td>{weapon.damage != null ? weapon.damage : (weapon.baseDamage != null ? weapon.baseDamage : '-')}</td>
                    </tr>
                    {openRows[wid] && (
                      <tr>
                        <td colSpan={8} style={{ minWidth: 0, overflowX: 'hidden' }}>
                          <div className="p-2" style={{ paddingBottom: 0 }}>
                            <div className="small text-muted mb-2">P/D over full history (most recent on the right)</div>
                            {loadingSeries[wid] ? (
                              <div className="text-muted small">Loading history…</div>
                            ) : (
                              <Sparkline series={getPPDSeries(wid)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableCard;