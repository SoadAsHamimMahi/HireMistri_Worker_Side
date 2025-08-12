import React from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';

const Root = () => {
    return (
        <div className=''>
            <Navbar />
            <main className="p-4">
                <Outlet />
            </main>
        </div>
    );
};

export default Root;