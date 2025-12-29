import React from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';

const Root = () => {
    return (
        <div className="min-h-screen bg-base-100 transition-colors duration-300">
            <Navbar />
            <main className="min-h-[calc(100vh-200px)]">
                <Outlet />
            </main>
            <Footer></Footer>
        </div>
    );
};

export default Root;