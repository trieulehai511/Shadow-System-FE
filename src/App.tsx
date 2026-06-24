import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import DailyQuest from './components/quests/DailyQuest';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Trang login nằm riêng lẻ, không có sidebar hay header */}
                <Route path="/login" element={<Login />} />

                {/* Hệ thống bảo mật bắt buộc qua ProtectedRoute và dùng chung MainLayout */}
                <Route 
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Vào đường dẫn gốc tự động đá qua trang nhiệm vụ */}
                    <Route path="/" element={<Navigate to="/daily-quest" replace />} />
                    <Route path="/daily-quest" element={<DailyQuest />} />
                </Route>

                {/* Tự động chuyển hướng nếu gõ sai URL */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}