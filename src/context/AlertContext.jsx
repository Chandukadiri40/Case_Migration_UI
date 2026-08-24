import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState({
        isOpen: false,
        message: '',
        title: 'Notification',
        type: 'info', // 'info', 'error', 'confirm'
        resolve: null
    });

    const showAlert = useCallback((message, title = 'Notification', type = 'info') => {
        return new Promise(resolve => {
            setAlert({ isOpen: true, message, title, type, resolve });
        });
    }, []);

    const showConfirm = useCallback((message, title = 'Confirm Action') => {
        return new Promise(resolve => {
            setAlert({ isOpen: true, message, title, type: 'confirm', resolve });
        });
    }, []);

    const handleConfirm = useCallback((result) => {
        if (alert.resolve) alert.resolve(result);
        setAlert(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [alert]);

    const closeAlert = useCallback(() => {
        handleConfirm(false);
    }, [handleConfirm]);

    const contextValue = React.useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm]);

    return (
        <AlertContext.Provider value={contextValue}>
            {children}
            {alert.isOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px'
                    }}
                    onClick={closeAlert}
                >
                    <div 
                        style={{
                            background: 'white',
                            borderRadius: '10px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            width: '100%',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            animation: 'modalSlideIn 0.2s ease-out forwards'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {alert.type === 'error' ? 
                                    <AlertCircle size={18} color="#ef4444" /> : 
                                    <Info size={18} color="#3b82f6" />
                                }
                                <h3 style={{ 
                                    margin: 0, 
                                    fontSize: '14px', 
                                    fontWeight: '600',
                                    color: '#1e293b'
                                }}>
                                    {alert.title}
                                </h3>
                            </div>
                            <button 
                                onClick={closeAlert}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    borderRadius: '4px'
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ padding: '16px', color: '#475569', fontSize: '13px', lineHeight: '1.4' }}>
                            {alert.message}
                        </div>
                        <div style={{
                            padding: '12px 16px',
                            background: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px'
                        }}>
                            {alert.type === 'confirm' && (
                                <button
                                    onClick={() => handleConfirm(false)}
                                    style={{
                                        background: 'white',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        padding: '6px 14px',
                                        borderRadius: '5px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => handleConfirm(true)}
                                style={{
                                    background: alert.type === 'error' ? '#ef4444' : '#4f46e5',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '5px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                                onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                                onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
                            >
                                {alert.type === 'confirm' ? 'Confirm' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
};
