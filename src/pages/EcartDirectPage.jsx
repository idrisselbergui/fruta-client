import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import EcartDirectModal from '../components/EcartDirectModal';
import './EcartDirectPage.css';

const EcartDirectPage = () => {
    const [ecartDirects, setEcartDirects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await apiGet('/api/ecartdirect');
            setEcartDirects(data);
        } catch (err) {
            setError('Failed to fetch Ecart Direct records.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (item = null) => {
        setError(null);
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async (itemData) => {
        setError(null);
        try {
            if (currentItem) {
                await apiPut(`/api/ecartdirect/${currentItem.numpal}`, itemData);
            } else {
                await apiPost('/api/ecartdirect', itemData);
            }
            handleCloseModal();
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            setError(null);
            try {
                await apiDelete(`/api/ecartdirect/${id}`);
                fetchData();
            } catch (err) {
                setError(err.message);
            }
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Gestion Ecart Direct</h1>
                <button className="add-btn" onClick={() => handleOpenModal()}>+ Add New Ecart</button>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Numéro Palette</th>
                            <th>Réf. Verger</th>
                            <th>Code Variété</th>
                            <th>Date Palette</th>
                            <th>Numéro BL</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ecartDirects.map(item => (
                            <tr key={item.numpal}>
                                <td>{item.numpal}</td>
                                <td>{item.refver}</td>
                                <td>{item.codvar}</td>
                                <td>{item.dtepal ? new Date(item.dtepal).toLocaleDateString() : ''}</td>
                                <td>{item.numbl}</td>
                                <td className="action-buttons">
                                    <button className="edit-btn" onClick={() => handleOpenModal(item)}>Edit</button>
                                    <button className="delete-btn" onClick={() => handleDelete(item.numpal)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <EcartDirectModal
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    currentData={currentItem}
                />
            )}
        </div>
    );
};

export default EcartDirectPage;
