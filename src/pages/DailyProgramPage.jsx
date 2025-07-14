import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DailyProgram.css';

// Defines the structure of a new, blank program
const initialProgramState = {
    numProg: 0,
    coddes: 0,
    refexp: 0,
    po: '',
    havday: '',
    dteprog: '',
    lot: '',
    details: [],
};

const DailyProgramPage = () => {
    const [program, setProgram] = useState(initialProgramState);
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    const apiUrl = 'https://localhost:44374/api/dailyprogram';
    const lookupApiUrl = 'https://localhost:44374/api/lookup';

    // State for the dropdown lists
    const [destinations, setDestinations] = useState([]);
    const [partenaires, setPartenaires] = useState([]);
    const [varietes, setVarietes] = useState([]);

    // Effect to fetch lookup data for dropdowns
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [destResponse, partResponse, varResponse] = await Promise.all([
                    fetch(`${lookupApiUrl}/destinations`),
                    fetch(`${lookupApiUrl}/partenaires`),
                    fetch(`${lookupApiUrl}/varietes`)
                ]);

                if (!destResponse.ok || !partResponse.ok || !varResponse.ok) {
                    throw new Error('Failed to fetch all lookup data');
                }

                // Correctly process the JSON for each response
                const destData = await destResponse.json();
                const partData = await partResponse.json();
                const varData = await varResponse.json();

                // Set the state for all three lists
                setDestinations(destData);
                setPartenaires(partData);
                setVarietes(varData);

            } catch (error) {
                console.error("Failed to fetch lookup data:", error);
            }
        };
        fetchLookups();
    }, []);

    // Effect to fetch existing program data when in "edit" mode
    useEffect(() => {
        if (isEditing) {
            const fetchProgram = async () => {
                try {
                    const response = await fetch(`${apiUrl}/${id}`);
                    if (!response.ok) throw new Error('Program not found');
                    
                    const data = await response.json();
                    data.havday = data.havday.split('T')[0];
                    data.dteprog = data.dteprog.split('T')[0];
                    setProgram(data);
                } catch (error) {
                    console.error('Failed to fetch program:', error);
                    navigate('/programs');
                }
            };
            fetchProgram();
        } else {
            setProgram(initialProgramState);
        }
    }, [id, isEditing, navigate]);

    // Event Handlers
    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setProgram(prev => ({ ...prev, [name]: value }));
    };

    const handleDetailChange = (index, e) => {
        const { name, value, type, checked } = e.target;
        const updatedDetails = [...program.details];
        const typedValue = type === 'checkbox' ? (checked ? 1 : 0) : parseInt(value, 10) || 0;
        updatedDetails[index] = { ...updatedDetails[index], [name]: typedValue };
        setProgram(prev => ({ ...prev, details: updatedDetails }));
    };

    const addDetailRow = () => {
        setProgram(prev => ({
            ...prev,
            details: [...prev.details, { codvar: 0, nbrpal: 0, nbrcoli: 0, valide: 0, numProg: program.numProg }]
        }));
    };

    const removeDetailRow = (index) => {
        const updatedDetails = program.details.filter((_, i) => i !== index);
        setProgram(prev => ({ ...prev, details: updatedDetails }));
    };

    const handleSubmit = async () => {
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${apiUrl}/${id}` : apiUrl;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(program),
            });
            if (!response.ok) throw new Error('Failed to save the program');
            
            navigate('/programs');
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    return (
        <div className="program-page-container">
            <h1>{isEditing ? 'Edit Daily Program' : 'Create New Program'}</h1>
            
            <section className="form-section">
                <h2>Program Information</h2>
                <div className="form-grid">
                    <div className="input-group">
                        <label>Num Prog</label>
                        <input type="number" name="numProg" value={program.numProg} onChange={handleHeaderChange} />
                    </div>
                    <div className="input-group">
                        <label>PO Number</label>
                        <input type="text" name="po" value={program.po} onChange={handleHeaderChange} />
                    </div>
                    <div className="input-group">
                        <label>Lot</label>
                        <input type="text" name="lot" value={program.lot} onChange={handleHeaderChange} />
                    </div>
                    <div className="input-group">
                        <label>Destination</label>
                        <select name="coddes" value={program.coddes} onChange={handleHeaderChange}>
                            <option value="0">Select a destination...</option>
                            {destinations.map(dest => (
                                <option key={dest.coddes} value={dest.coddes}>{dest.vildes}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Partenaire (Exporter)</label>
                        <select name="refexp" value={program.refexp} onChange={handleHeaderChange}>
                            <option value="0">Select a partenaire...</option>
                            {partenaires.map(part => (
                                <option key={part.ref} value={part.ref}>{part.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Harvest Date</label>
                        <input type="date" name="havday" value={program.havday} onChange={handleHeaderChange} />
                    </div>
                    <div className="input-group">
                        <label>Program Date</label>
                        <input type="date" name="dteprog" value={program.dteprog} onChange={handleHeaderChange} />
                    </div>
                </div>
            </section>

            <section className="form-section">
                <div className="details-header">
                    <h2>Program Details</h2>
                    <button className="add-btn" onClick={addDetailRow}>+ Add New Detail</button>
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
                        {program.details.map((detail, index) => (
                            <tr key={index}>
                                <td>
                                    <select
                                        name="codvar"
                                        value={detail.codvar}
                                        onChange={(e) => handleDetailChange(index, e)}
                                    >
                                        <option value="0">Select variety...</option>
                                        {varietes.map(v => (
                                            <option key={v.codvar} value={v.codvar}>
                                                {v.nomvar}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td><input type="number" name="nbrpal" value={detail.nbrpal} onChange={(e) => handleDetailChange(index, e)} /></td>
                                <td><input type="number" name="nbrcoli" value={detail.nbrcoli} onChange={(e) => handleDetailChange(index, e)} /></td>
                                <td><input type="checkbox" name="valide" checked={detail.valide === 1} onChange={(e) => handleDetailChange(index, e)} /></td>
                                <td className="action-buttons">
                                    <button className="delete-btn" onClick={() => removeDetailRow(index)}>D</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
            <div className="main-actions">
                <button className="save-btn" onClick={handleSubmit}>Save Program</button>
                <button className="clear-btn" onClick={() => navigate('/programs')}>Cancel</button>
            </div>
        </div>
    );
};

export default DailyProgramPage;