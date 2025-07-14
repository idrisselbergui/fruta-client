import React from 'react';

const ProgramDetails = () => {
  return (
    <section className="form-section">
      <div className="details-header">
        <h2>Program Details</h2>
        <button className="add-btn">+ Add New Detail</button>
      </div>
      <table className="details-table">
        <thead>
          <tr>
            <th>Variety (codvar)</th>
            <th># Pallets</th>
            <th># Boxes</th>
            <th>Valid</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nadorcott</td>
            <td>10</td>
            <td>1000</td>
            <td><input type="checkbox" defaultChecked /></td>
            <td className="action-buttons">
              <button className="edit-btn">E</button>
              <button className="delete-btn">D</button>
            </td>
          </tr>
          <tr>
            <td>Afourer</td>
            <td>5</td>
            <td>500</td>
            <td><input type="checkbox" defaultChecked /></td>
            <td className="action-buttons">
              <button className="edit-btn">E</button>
              <button className="delete-btn">D</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
};

export default ProgramDetails;