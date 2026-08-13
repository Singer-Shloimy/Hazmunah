import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Studio } from './pages/Studio'
import { Admin } from './pages/Admin'
import { Checkout } from './pages/Checkout'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
