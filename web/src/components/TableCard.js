import React from 'react';

const TableCard = ({ data, date }) => {
  console.log("data:", data);
  console.log("date:", date);

  // Helper function to get element color
  const getElementColor = (element) => {
    const elementColors = {
      'Blessed': 'text-yellow-600',
      'Cursed': 'text-purple-800',
      'Synthetic': 'text-blue-400',
      'Air': 'text-sky-400',
      'Sun': 'text-orange-500',
      'Moon': 'text-indigo-400',
      'Earth': 'text-amber-700',
      'Fire': 'text-red-600',
      'Water': 'text-blue-500',
      'Organic': 'text-green-600'
    };
    return elementColors[element] || 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100 mb-5">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h3 className="text-xl font-bold text-white">Shop: {date}</h3>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-lg whitespace-nowrap">
                Price
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                ID
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Type
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Name
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Damage
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Durability
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Element
              </th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-lg whitespace-nowrap">
                Req Lv.
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {data.map((weapon) => (
              <tr 
                key={weapon.id} 
                className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200"
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{weapon.price}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{weapon.id}</td>
                <td className="px-4 py-3 text-sm">{weapon.type}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{weapon.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{weapon.damage}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{weapon.durability}</td>
                <td className={`px-4 py-3 text-sm font-medium ${getElementColor(weapon.element)}`}>
                  {weapon.element}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{weapon.req_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableCard;