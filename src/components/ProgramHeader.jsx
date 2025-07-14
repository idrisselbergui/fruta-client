import React from 'react';

const ProgramHeader = () => {
  return (
    <section className="form-section">
      <h2>Program Information</h2>
      <div className="form-grid">
        <div className="input-group">
          <label htmlFor="numprog">Num Prog</label>
          <input type="number" id="numprog" defaultValue="12345" />
        </div>
        <div className="input-group">
          <label htmlFor="po">PO Number</label>
          <input type="text" id="po" defaultValue="PO-XYZ-123" />
        </div>
        <div className="input-group">
          <label htmlFor="coddes">Destination</label>
          <select id="coddes">
            <option>Destination A</option>
            <option>Destination B</option>
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="lot">Lot</label>
          <input type="text" id="lot" defaultValue="ABC-2025" />
        </div>
        <div className="input-group">
          <label htmlFor="refexp">Exporter</label>
          <select id="refexp">
            <option>Exporter X</option>
            <option>Exporter Y</option>
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="havday">Harvest Date</label>
          <input type="date" id="havday" defaultValue="2025-07-14" />
        </div>
        <div className="input-group">
          <label htmlFor="dteprog">Program Date</label>
          <input type="date" id="dteprog" defaultValue="2025-07-15" />
        </div>
      </div>
    </section>
  );
};

export default ProgramHeader;