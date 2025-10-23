import React, { useState, useEffect } from 'react';
import './EcartDirectModal.css';

const EcartDirectModal = ({ onClose, onSave, currentData, vergers, varietes }) => {
    const [formData, setFormData] = useState(
        currentData || { numpal: '', refver: '', codvar: '', dtepal: '', numbl: '', pdsfru: '' }
    );

    useEffect(() => {
        if (currentData) {
            setFormData({
                ...currentData,
                dtepal: currentData.dtepal ? new Date(currentData.dtepal).toISOString().split('T')[0] : ''
            });
        } else {
            setFormData({ numpal: '', refver: '', codvar: '', dtepal: '', numbl: '', pdsfru: '' });
        }
    }, [currentData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{currentData ? 'Edit' : 'Add New'} Ecart Direct</h2>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Numéro Palette</label>
                            <input
                                type="number"
                                name="numpal"
                                value={formData.numpal || ''}
                                onChange={handleChange}
                                required
                                readOnly
                            />
                        </div>
                        <div className="input-group">
                            <label>Réf. Verger</label>
                            <select
                                name="refver"
                                value={formData.refver || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Verger</option>
                                {vergers.map(verger => (
                                    <option key={verger.refver} value={verger.refver}>
                                        {verger.refver} - {verger.nomver || 'N/A'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Code Variété</label>
                            <select
                                name="codvar"
                                value={formData.codvar || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Variete</option>
                                {varietes.map(variete => (
                                    <option key={variete.codvar} value={variete.codvar}>
                                        {variete.codvar} - {variete.nomvar || 'N/A'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Date Palette</label>
                            <input
                                type="date"
                                name="dtepal"
                                value={formData.dtepal || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="input-group">
                            <label>Numéro BL</label>
                            <input
                                type="number"
                                name="numbl"
                                value={formData.numbl || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="input-group">
                            <label>Poids Fruit</label>
                            <input
                                type="number"
                                step="0.01"
                                name="pdsfru"
                                value={formData.pdsfru || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="clear-btn" onClick={onClose}>Cancel</button>
                            <button type="submit" className="save-btn">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EcartDirectModal;
