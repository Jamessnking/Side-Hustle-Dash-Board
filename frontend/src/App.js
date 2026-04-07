import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import SkoolDownloader from './pages/SkoolDownloader';
import PinterestDownloader from './pages/PinterestDownloader';
import ContentLibrary from './pages/ContentLibrary';
import InstagramManager from './pages/InstagramManager';
import TrendAnalyser from './pages/TrendAnalyser';
import PromptCreator from './pages/PromptCreator';
import KanbanPlanner from './pages/KanbanPlanner';
import ModuleBuilder from './pages/ModuleBuilder';
import Settings from './pages/Settings';
import CustomModulePage from './pages/CustomModulePage';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function AppLayout({ modules }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentPath={location.pathname}
        customModules={modules}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/skool" element={<SkoolDownloader />} />
            <Route path="/pinterest" element={<PinterestDownloader />} />
            <Route path="/library" element={<ContentLibrary />} />
            <Route path="/instagram" element={<InstagramManager />} />
            <Route path="/trends" element={<TrendAnalyser />} />
            <Route path="/prompts" element={<PromptCreator />} />
            <Route path="/planner" element={<KanbanPlanner />} />
            <Route path="/modules/new" element={<ModuleBuilder />} />
            <Route path="/settings" element={<Settings />} />
            {modules.map(mod => (
              <Route
                key={mod.module_id}
                path={`/module/${mod.module_id}`}
                element={<CustomModulePage module={mod} />}
              />
            ))}
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  const [modules, setModules] = useState([]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/modules`)
      .then(r => setModules(r.data))
      .catch(() => {});
  }, []);

  return (
    <Router>
      <AppLayout modules={modules} />
    </Router>
  );
}
