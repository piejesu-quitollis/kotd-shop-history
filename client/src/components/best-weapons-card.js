import React from 'react';

export default function BestWeaponsCard({ bestPPDWeapon, bestDPCWeapon, bestOCEWeapon }) {
  if (!bestPPDWeapon && !bestDPCWeapon && !bestOCEWeapon) return null;
  return (
    <div className="row justify-content-center my-3">
      <div className="col-lg-8 col-md-10 col-sm-12">
        <div className="card shadow-sm">
          <div className="card-header text-center bg-primary text-white">
            <h4 className="mb-0">Daily Standouts</h4>
          </div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">Best Value (Price/Durability):</span>
              {bestPPDWeapon ? (
                <span className="text-success fw-bolder">
                  ID: {bestPPDWeapon.weapon.id} {bestPPDWeapon.weapon.type} - {bestPPDWeapon.weapon.name} ({bestPPDWeapon.value.toFixed(2)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">Best Cost-Effectiveness (Damage/Coin):</span>
              {bestDPCWeapon ? (
                <span className="text-success fw-bolder">
                  ID: {bestDPCWeapon.weapon.id} {bestDPCWeapon.weapon.type} - {bestDPCWeapon.weapon.name} ({bestDPCWeapon.value.toFixed(2)})
                </span>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </li>
            <li className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
              <span className="fw-bold me-2">Overall Combat Efficiency:</span>
              {bestOCEWeapon ? (
                <span className="text-success fw-bolder">
                  ID: {bestOCEWeapon.weapon.id} {bestOCEWeapon.weapon.type} - {bestOCEWeapon.weapon.name} ({bestOCEWeapon.value.toFixed(2)})
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
