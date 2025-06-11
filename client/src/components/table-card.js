import React from 'react';
import { getPriceChangeInfo } from '../utils/weapon-utils.js';

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

  return (
    <div className="card shadow-sm mx-3 mb-4">
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
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableCard;