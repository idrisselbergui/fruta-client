import React, { useState, useEffect } from 'react';
import './EcartDirectModal.css';

const EcartDirectModal = ({ onClose, onSave, currentData }) => {
    const [formData, setFormData] = useState(
        currentData || { numpal: '', refver: '', codvar: '', dtepal: '', numbl: '' }
    );

    useEffect(() => {
        if (currentData) {
            setFormData({
                ...currentData,
                dtepal: currentData.dtepal ? new Date(currentData.dtepal).toISOString().split('T')[0] : ''
            });
        } else {
            setFormData({ numpal: '', refver: '', codvar: '', dtepal: '', numbl: '' });
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
                                readOnly={!!currentData}
                            />
                        </div>
                        <div className="input-group">
                            <label>Réf. Verger</label>
                            <input
                                type="number"
                                name="refver"
                                value={formData.refver || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="input-group">
                            <label>Code Variété</label>
                            <input
                                type="number"
                                name="codvar"
                                value={formData.codvar || ''}
                                onChange={handleChange}
                            />
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
