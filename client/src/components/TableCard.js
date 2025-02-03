import React from 'react';

const TableCard = ({ data, date }) => {
  const getElementBadgeClass = (element) => {
    const badgeClasses = {
      'Blessed': 'text-bg-warning',
      'Cursed': 'text-bg-dark',
      'Synthetic': 'text-bg-info',
      'Air': 'text-bg-info',
      'Sun': 'text-bg-warning',
      'Moon': 'text-bg-primary',
      'Earth': 'text-bg-secondary',
      'Fire': 'text-bg-danger',
      'Water': 'text-bg-primary',
      'Organic': 'text-bg-success'
    };
    return `badge ${badgeClasses[element] || 'text-bg-secondary'}`;
  };

  return (
    <div className="card shadow mb-4">
      <div className="card-header bg-primary text-white">
        <h3 className="mb-0">Shop: {date}</h3>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover">
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
              {data.map((weapon) => (
                <tr key={weapon.id}>
                  <td>${weapon.price}</td>
                  <td>{weapon.id}</td>
                  <td>{weapon.type}</td>
                  <td><strong>{weapon.name}</strong></td>
                  <td>{weapon.damage}</td>
                  <td>{weapon.durability}</td>
                  <td><span className={getElementBadgeClass(weapon.element)}>{weapon.element}</span></td>
                  <td>{weapon.req_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableCard;