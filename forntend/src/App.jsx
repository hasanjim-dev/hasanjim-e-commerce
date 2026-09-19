import React from 'react';
import { Routes, Route } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Storefront from './Storefront.jsx';
import AdminDashboard from './AdminDashboard.jsx';

export default function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}