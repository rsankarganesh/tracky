import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Activity, 
  Search, 
  Clock, 
  Globe, 
  MousePointer2, 
  X, 
  Pencil, 
  Save 
} from 'lucide-react';

// --- COMPONENT: CARD ---
const MonitorCard = ({ monitor, onDelete, onEdit, onCheck }) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    // Fake delay to feel like it's working
    setTimeout(() => {
      onCheck(monitor);
      setIsChecking(false);
    }, 800);
  };

  const timeAgo = (dateString) => {
    if (!dateString) return 'Never checked';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow flex flex-col h-full group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`p-2 rounded-lg ${monitor.status === 'changed' ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
            <Globe size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate pr-4">{monitor.name}</h3>
            <a 
              href={monitor.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              {new URL(monitor.url).hostname} <ExternalLink size={10} />
            </a>
          </div>
        </div>
        <div className="flex gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
           <button onClick={() => onEdit(monitor)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(monitor.id)} className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <MousePointer2 size={12} />
            <span className="font-mono truncate">{monitor.selector}</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="w-full">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Value</p>
              <p className="text-sm font-medium text-slate-800 break-all line-clamp-2">
                {monitor.lastValue || "No value recorded"}
              </p>
            </div>
          </div>
           <button 
            onClick={handleCheck}
            disabled={isChecking}
            className={`absolute bottom-2 right-2 p-1.5 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all ${isChecking ? 'animate-spin' : ''}`}
            title="Simulate Check"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs pt-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock size={14} />
            <span>{timeAgo(monitor.lastChecked)}</span>
          </div>
          {monitor.status === 'changed' && (
              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                Changed
              </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [monitors, setMonitors] = useState([]);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [name, setName] = useState('');
  const [manualValue, setManualValue] = useState(''); 

  // 1. Load data from LocalStorage when app starts
  useEffect(() => {
    const saved = localStorage.getItem('tracky_monitors');
    if (saved) {
      setMonitors(JSON.parse(saved));
    }
  }, []);

  // 2. Save data to LocalStorage whenever monitors list changes
  useEffect(() => {
    localStorage.setItem('tracky_monitors', JSON.stringify(monitors));
  }, [monitors]);

  const resetForm = () => {
    setUrl(''); setSelector(''); setName(''); setManualValue('');
    setEditingId(null); setIsFormOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;

    const now = new Date().toISOString();

    if (editingId) {
      // Edit existing
      setMonitors(monitors.map(m => {
        if (m.id === editingId) {
          return {
            ...m,
            url, selector, name,
            lastValue: manualValue || m.lastValue,
            lastChecked: manualValue ? now : m.lastChecked,
            status: manualValue ? 'changed' : m.status
          };
        }
        return m;
      }));
    } else {
      // Create new
      const newMonitor = {
        id: Date.now().toString(), // Simple ID based on time
        url, selector, name,
        lastValue: null,
        lastChecked: null,
        status: 'new',
        createdAt: now
      };
      setMonitors([newMonitor, ...monitors]);
    }
    resetForm();
  };

  const handleEditClick = (monitor) => {
    setEditingId(monitor.id);
    setUrl(monitor.url);
    setSelector(monitor.selector);
    setName(monitor.name);
    setManualValue(monitor.lastValue || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm("Delete this monitor?")) {
      setMonitors(monitors.filter(m => m.id !== id));
      if (editingId === id) resetForm();
    }
  };

  // The "Fake" checker logic
  const simulateCheck = (monitor) => {
    const possibleValues = ["$49.99", "In Stock", "Out of Stock", "UNREGISTERED", "REGISTERED"];
    const randomValue = possibleValues[Math.floor(Math.random() * possibleValues.length)];
    
    setMonitors(monitors.map(m => {
      if (m.id === monitor.id) {
        return {
          ...m,
          lastValue: randomValue,
          lastChecked: new Date().toISOString(),
          status: 'changed'
        };
      }
      return m;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Tracky <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded px-1">Offline Mode</span></h1>
          </div>
          <button 
            onClick={() => {
                if (isFormOpen) resetForm();
                else setIsFormOpen(true);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm ${isFormOpen ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {isFormOpen ? <X size={18} /> : <Plus size={18} />}
            {isFormOpen ? 'Cancel' : 'Add'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {isFormOpen && (
          <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">
                  {editingId ? 'Edit Monitor' : 'New Monitor'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Friendly Name</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-300" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target URL</label>
                  <input type="url" required className="w-full px-4 py-2 rounded-lg border border-slate-300" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">CSS Selector</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-300 font-mono text-sm" value={selector} onChange={(e) => setSelector(e.target.value)} />
                </div>

                {editingId && (
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                         <label className="block text-sm font-medium text-slate-700 mb-1">Manual Status Update</label>
                         <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white" value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Type new value here..." />
                    </div>
                )}

                <div className="md:col-span-2 flex justify-end mt-2 gap-2">
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2">
                    <Save size={18} /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {monitors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No monitors yet</h3>
            <p className="text-slate-500 mb-6">Your data is saved safely on this device.</p>
            <button onClick={() => setIsFormOpen(true)} className="text-blue-600 font-medium hover:text-blue-800">
              Create your first monitor &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.map(monitor => (
              <MonitorCard 
                key={monitor.id} 
                monitor={monitor} 
                onDelete={() => handleDelete(monitor.id)}
                onEdit={handleEditClick}
                onCheck={simulateCheck}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
