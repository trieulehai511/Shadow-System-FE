import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import DailyQuest from './pages/DailyQuest/DailyQuest';
import QuestHistory from './pages/QuestHistory/QuestHistory';
import Profile from './pages/Profile/Profile';
import ExerciseSelection from './pages/ExerciseSelection/ExerciseSelection';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Register from './pages/Register/Register';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import HunterSearch from './pages/HunterSearch/HunterSearch';
export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Login and registration pages use a standalone layout. */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected pages share the main application layout. */}
                <Route 
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Redirect the root route to the daily quest. */}
                    <Route path="/" element={<Navigate to="/daily-quest" replace />} />
                    <Route path="/daily-quest" element={<DailyQuest />} />
                    <Route path="/exercises" element={<ExerciseSelection />} />
                    <Route path="/history" element={<QuestHistory />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/hunter-search" element={<HunterSearch />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Redirect unknown routes to login. */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
