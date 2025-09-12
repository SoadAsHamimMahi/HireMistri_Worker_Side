import React from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';

const Root = () => {
    return (
        <div className='min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200'>
            <Navbar />
            <main className="p-4">
                <Outlet />
            </main>
            <Footer></Footer>
        </div>
    );
};

export default Root;