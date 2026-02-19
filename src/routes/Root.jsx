import React from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';

const Root = () => {
    return (
        <div className="min-h-screen app-root transition-colors duration-300 flex flex-col">
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto">
                <Outlet />
            </main>
            <Footer></Footer>
        </div>
    );
};

export default Root;