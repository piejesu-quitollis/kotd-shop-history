import React from 'react';

export default function BestWeaponsCard({ bestPPDWeapon, bestPPDDWeapon, bestPPDByType, bestPPDDByType }) {
  const hasAny = bestPPDWeapon || bestPPDDWeapon || (bestPPDByType && (bestPPDByType.magic || bestPPDByType.melee || bestPPDByType.range)) || (bestPPDDByType && (bestPPDDByType.magic || bestPPDDByType.melee || bestPPDDByType.range));
  if (!hasAny) return null;
  const fmt = (n) => n == null ? '-' : parseFloat(n.toFixed(2)).toString();
  const label = (key) => key === 'magic' ? '🔮 Magic' : key === 'melee' ? '⚔️ Melee' : key === 'range' ? '🏹 Range' : key;
  return (
    <div className="row justify-content-center my-3">
      <div className="col-lg-8 col-md-10 col-sm-12">
        <div className="card shadow-sm">
          <div className="card-header text-center bg-primary text-white">
            <h4 className="mb-0">Daily Standouts</h4>
          </div>
          <ul className="list-group list-group-flush">
            {/* Overall */}
            <li className="list-group-item fw-semibold" style={{ backgroundColor: '#e9ecef' }}>Best Overall</li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/Durability):</span>
              {bestPPDWeapon ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDWeapon.weapon.id} {bestPPDWeapon.weapon.type} - {bestPPDWeapon.weapon.name} ({fmt(bestPPDWeapon.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/(Damage*Durability)):</span>
              {bestPPDDWeapon ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDDWeapon.weapon.id} {bestPPDDWeapon.weapon.type} - {bestPPDDWeapon.weapon.name} ({fmt(bestPPDDWeapon.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>

            {/* Magic */}
            <li className="list-group-item fw-semibold" style={{ backgroundColor: '#e9ecef' }}>{label('magic')}</li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/Durability):</span>
              {bestPPDByType && bestPPDByType.magic ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDByType.magic.weapon.id} {bestPPDByType.magic.weapon.type} - {bestPPDByType.magic.weapon.name} ({fmt(bestPPDByType.magic.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/(Damage*Durability)):</span>
              {bestPPDDByType && bestPPDDByType.magic ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDDByType.magic.weapon.id} {bestPPDDByType.magic.weapon.type} - {bestPPDDByType.magic.weapon.name} ({fmt(bestPPDDByType.magic.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>

            {/* Melee */}
            <li className="list-group-item fw-semibold" style={{ backgroundColor: '#e9ecef' }}>{label('melee')}</li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/Durability):</span>
              {bestPPDByType && bestPPDByType.melee ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDByType.melee.weapon.id} {bestPPDByType.melee.weapon.type} - {bestPPDByType.melee.weapon.name} ({fmt(bestPPDByType.melee.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/(Damage*Durability)):</span>
              {bestPPDDByType && bestPPDDByType.melee ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDDByType.melee.weapon.id} {bestPPDDByType.melee.weapon.type} - {bestPPDDByType.melee.weapon.name} ({fmt(bestPPDDByType.melee.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>

            {/* Range */}
            <li className="list-group-item fw-semibold" style={{ backgroundColor: '#e9ecef' }}>{label('range')}</li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/Durability):</span>
              {bestPPDByType && bestPPDByType.range ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDByType.range.weapon.id} {bestPPDByType.range.weapon.type} - {bestPPDByType.range.weapon.name} ({fmt(bestPPDByType.range.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">(Price/(Damage*Durability)):</span>
              {bestPPDDByType && bestPPDDByType.range ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDDByType.range.weapon.id} {bestPPDDByType.range.weapon.type} - {bestPPDDByType.range.weapon.name} ({fmt(bestPPDDByType.range.value)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
