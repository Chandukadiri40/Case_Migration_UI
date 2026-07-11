import React from 'react';
import { Package } from 'lucide-react';

export default function Deliverables() {
    return (
        <div style={{ padding: '24px', height: '100%', background: '#f3f4f6' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={28} color="#4f46e5" /> Deliverables
            </h1>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' }}>
                <p style={{ color: '#4b5563', fontSize: '16px' }}>
                    Deliverables component is ready. Future deliverables tracking and generation can be implemented here.
                </p>
            </div>
        </div>
    );
}
