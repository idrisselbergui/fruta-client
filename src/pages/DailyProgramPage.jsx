import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import './DailyProgram.css';

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

    // State for the dropdown options
    const [destinationsOptions, setDestinationsOptions] = useState([]);
    const [partenairesOptions, setPartenairesOptions] = useState([]);
    const [grpVarsOptions, setGrpVarsOptions] = useState([]);
    const [tpalettesOptions, setTPalettesOptions] = useState([]);

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const partnerType = "EXPORTATEUR";
                const [destRes, partRes, grpRes, palRes] = await Promise.all([
                    fetch(`${lookupApiUrl}/destinations`),
                    fetch(`${lookupApiUrl}/partenaires/${partnerType}`),
                    fetch(`${lookupApiUrl}/grpvars`),
                    fetch(`${lookupApiUrl}/tpalettes`)
                ]);

                if (!destRes.ok || !partRes.ok || !grpRes.ok || !palRes.ok) {
                    throw new Error('Failed to fetch all lookup data');
                }

                // Transform data into { value, label } format for React Select
                const destData = (await destRes.json()).map(d => ({ value: d.coddes, label: d.vildes }));
                const partData = (await partRes.json()).map(p => ({ value: p.ref, label: p.nom }));
                const grpData = (await grpRes.json()).map(g => ({ value: g.codgrv, label: g.nomgrv })); // Use corrected names
                 const palData = (await palRes.json()).map(p => ({ value: p.codtyp, label: p.nomemb }));

                setDestinationsOptions(destData);
                setPartenairesOptions(partData);
                setGrpVarsOptions(grpData);
                setTPalettesOptions(palData);
            } catch (error) {
                console.error("Failed to fetch lookup data:", error);
            }
        };
        fetchLookups();
    }, []);

    useEffect(() => {
        if (isEditing) {
            const fetchProgram = async () => {
                try {
                    const response = await fetch(`${apiUrl}/${id}`);
                    if (!response.ok) throw new Error('Program not found');
                    
                    const data = await response.json();
                    data.havday = data.havday ? data.havday.split('T')[0] : '';
                    data.dteprog = data.dteprog ? data.dteprog.split('T')[0] : '';
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

    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setProgram(prev => ({ ...prev, [name]: value }));
    };
    
    const handleHeaderSelectChange = (selectedOption, actionMeta) => {
        setProgram(prev => ({ ...prev, [actionMeta.name]: selectedOption.value }));
    };

    const handleDetailChange = (index, e) => {
        const { name, value, type, checked } = e.target;
        const updatedDetails = [...program.details];
        let typedValue;
        if (type === 'checkbox') {
            typedValue = checked ? 1 : 0;
        } else if (name === 'codtyp') {
            typedValue = value;
        } else {
            typedValue = parseInt(value, 10) || 0;
        }
        updatedDetails[index] = { ...updatedDetails[index], [name]: typedValue };
        setProgram(prev => ({ ...prev, details: updatedDetails }));
    };

    const handleDetailSelectChange = (index, selectedOption, actionMeta) => {
        const updatedDetails = [...program.details];
        updatedDetails[index] = { ...updatedDetails[index], [actionMeta.name]: selectedOption.value };
        setProgram(prev => ({ ...prev, details: updatedDetails }));
    };

   const addDetailRow = () => {
    setProgram(prev => ({
        ...prev,
        details: [...prev.details, { codgrv: 0, codtyp: '', nbrpal: 0, nbrcoli: 0, valide: 0, numProg: program.numProg }]
    }));
};

    const removeDetailRow = (index) => {
        setProgram(prev => ({ ...prev, details: program.details.filter((_, i) => i !== index) }));
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
                    <div className="input-group"><label>Num Prog</label><input type="number" name="numProg" value={program.numProg} onChange={handleHeaderChange} /></div>
                    <div className="input-group"><label>PO Number</label><input type="text" name="po" value={program.po} onChange={handleHeaderChange} /></div>
                    <div className="input-group"><label>Lot</label><input type="text" name="lot" value={program.lot} onChange={handleHeaderChange} /></div>
                    <div className="input-group">
                        <label>Destination</label>
                        <Select name="coddes" options={destinationsOptions} value={destinationsOptions.find(d => d.value === program.coddes)} onChange={handleHeaderSelectChange} placeholder="Search..." isClearable />
                    </div>
                    <div className="input-group">
                        <label>Partenaire (Exporter)</label>
                        <Select name="refexp" options={partenairesOptions} value={partenairesOptions.find(p => p.value === program.refexp)} onChange={handleHeaderSelectChange} placeholder="Search..." isClearable />
                    </div>
                    <div className="input-group"><label>Harvest Date</label><input type="date" name="havday" value={program.havday} onChange={handleHeaderChange} /></div>
                    <div className="input-group"><label>Program Date</label><input type="date" name="dteprog" value={program.dteprog} onChange={handleHeaderChange} /></div>
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
                            <th>Group</th>
                            <th>Palette Type</th>
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
                    <Select
                        name="codgrv" // Corrected name
                        options={grpVarsOptions}
                        value={grpVarsOptions.find(g => g.value === detail.codgrv)} // Corrected property
                        onChange={(opt, act) => handleDetailSelectChange(index, opt, act)}
                        placeholder="Search..."
                    />
                </td>
                                <td>
                                    <Select name="codtyp" options={tpalettesOptions} value={tpalettesOptions.find(p => p.value === detail.codtyp)} onChange={(opt, act) => handleDetailSelectChange(index, opt, act)} placeholder="Search..." />
                                </td>
                                <td><input type="number" name="nbrpal" value={detail.nbrpal} onChange={(e) => handleDetailChange(index, e)} /></td>
                                <td><input type="number" name="nbrcoli" value={detail.nbrcoli} onChange={(e) => handleDetailChange(index, e)} /></td>
                                <td><input type="checkbox" name="valide" checked={detail.valide === 1} onChange={(e) => handleDetailChange(index, e)} /></td>
                                <td className="action-buttons"><button className="delete-btn" onClick={() => removeDetailRow(index)}>Delete</button></td>
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