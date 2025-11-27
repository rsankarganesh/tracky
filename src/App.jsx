import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp,
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Activity, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Globe, 
  MousePointer2, 
  Sparkles, 
  Bot, 
  X, 
  Pencil, 
  Save 
} from 'lucide-react';

// --- CONFIGURATION HELPER ---

/* GITHUB SECURITY NOTE:
   Do not paste keys directly here if you plan to commit this file to GitHub.
   Use a .env file in your project root.
*/

const getAppConfig = () => {
  // Fallback for manual entry if .env fails
  const MANUAL_KEYS = {
    GEMINI_API_KEY: "", 
    FIREBASE_CONFIG: {
      apiKey: "",             
      authDomain: "",         
      projectId: "",          
      storageBucket: "",      
      messagingSenderId: "",  
      appId: ""               
    }
  };

  let env = {};
  
  // Try to get Vite environment variables
  // We wrap this in a try-catch or check to prevent preview environment crashes
  try {
    // Vite replaces these static strings at build time
    env = {
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      firebase: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      }
    };
  } catch (e) {
    console.warn("Environment variables not loaded via import.meta.env");
  }

  // Merge: Use Env Vars if available, otherwise Manual Keys
  return {
    geminiKey: env.apiKey || MANUAL_KEYS.GEMINI_API_KEY,
    firebaseConfig: {
      apiKey: env.firebase?.apiKey || MANUAL_KEYS.FIREBASE_CONFIG.apiKey,
      authDomain: env.firebase?.authDomain || MANUAL_KEYS.FIREBASE_CONFIG.authDomain,
      projectId: env.firebase?.projectId || MANUAL_KEYS.FIREBASE_CONFIG.projectId,
      storageBucket: env.firebase?.storageBucket || MANUAL_KEYS.FIREBASE_CONFIG.storageBucket,
      messagingSenderId: env.firebase?.messagingSenderId || MANUAL_KEYS.FIREBASE_CONFIG.messagingSenderId,
      appId: env.firebase?.appId || MANUAL_KEYS.FIREBASE_CONFIG.appId
    }
  };
};

// --- GLOBAL INIT ---
const config = getAppConfig();
const appId = "web-sentinel-v1"; // Static ID for your data collection

let app, auth, db;

try {
  if (config.firebaseConfig.apiKey) {
    app = initializeApp(config.firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.log("Firebase Config missing. App will start in offline/config mode.");
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// --- Gemini API Helper ---
const callGemini = async (prompt) => {
  if (!config.geminiKey) return "API Key missing. Check .env file.";
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${config.geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API call failed');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis available.";
  } catch (error) {
    console.error("AI Error:", error);
    return "AI service is currently unavailable.";
  }
};

// --- Components ---

const AiSelectorModal = ({ isOpen, onClose, onSelect }) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!htmlInput.trim()) return;
    setLoading(true);
    setError('');

    const prompt = `
      I have a snippet of HTML. I need a robust CSS selector to target the most meaningful content within it (like a price, status, or title).
      Return ONLY the CSS selector string. Do not include markdown formatting or explanations.
      HTML Snippet:
      ${htmlInput}
    `;

    try {
      const result = await callGemini(prompt);
      const cleanSelector = result.replace(/`/g, '').trim(); 
      onSelect(cleanSelector);
      onClose();
    } catch (err) {
      setError('Failed to analyze HTML. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2 text-indigo-700">
            <Sparkles size={20} />
            <h3 className="font-semibold">AI Selector Finder</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4">
            Paste a snippet of HTML code below (Right-click element &gt; Inspect &gt; Right-click HTML &gt; Copy &gt; Copy OuterHTML). Gemini will extract the best CSS selector for you.
          </p>
          <textarea
            className="w-full h-40 p-3 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none resize-none"
            placeholder='<div class="product-price" id="p-123">$49.99</div>'
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAnalyze}
            disabled={loading || !htmlInput}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Bot size={16} />}
            {loading ? 'Analyzing...' : 'Generate Selector'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MonitorCard = ({ monitor, onDelete, onEdit, onCheck }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setAnalysis(null);
    await onCheck(monitor);
    setTimeout(() => setIsChecking(false), 800);
  };

  const handleAnalyzeChange = async () => {
    if (!monitor.lastValue) return;
    setAnalyzing(true);
    
    // Simulate previous value for context 
    const mockPreviousValue = "Different Value"; 

    const prompt = `
      Analyze the change in this website monitor data. 
      Item Name: "${monitor.name}"
      Previous Value: "${mockPreviousValue}" (Contextual guess)
      New Value: "${monitor.lastValue}"
      
      Write a short, fun, 1-sentence notification summary for the user. 
      If the price went down, be excited. If stock returned, be urgent.
    `;

    const result = await callGemini(prompt);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return 'Never checked';
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
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
           <button 
            onClick={() => onEdit(monitor)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors"
            title="Edit Monitor"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => onDelete(monitor.id)}
            className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete Monitor"
          >
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
            title="Simulate Check (Generates Mock Data)"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* AI Analysis Result */}
        {analysis && (
          <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-sm border border-indigo-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2 items-start">
              <Sparkles size={14} className="mt-0.5 shrink-0" />
              <p>{analysis}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock size={14} />
            <span>{timeAgo(monitor.lastChecked)}</span>
          </div>
          
          <div className="flex gap-2">
            {monitor.status === 'changed' && !analysis && (
               <button 
                 onClick={handleAnalyzeChange}
                 disabled={analyzing}
                 className="flex items-center gap-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full font-medium transition-colors disabled:opacity-50"
               >
                 {analyzing ? <RefreshCw size={12} className="animate-spin"/> : <Sparkles size={12} />}
                 Analyze
               </button>
            )}

            {monitor.status === 'stable' && (
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                <CheckCircle2 size={12} /> Stable
              </span>
            )}
            {monitor.status === 'changed' && (
              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                <AlertCircle size={12} /> Changed
              </span>
            )}
            {monitor.status === 'new' && (
              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                <Activity size={12} /> New
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [name, setName] = useState('');
  const [manualValue, setManualValue] = useState(''); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    // Only try to auth if we have an auth instance
    if (!auth) {
        setLoading(false);
        return;
    }

    const initAuth = async () => {
       if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
           await signInWithCustomToken(auth, __initial_auth_token);
       } else {
           await signInAnonymously(auth);
       }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const q = query(
        collection(db, 'artifacts', appId, 'users', user.uid, 'monitors')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMonitors(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching monitors:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setUrl('');
    setSelector('');
    setName('');
    setManualValue('');
    setEditingId(null);
    setIsFormOpen(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url || !selector || !name) return;
    if (!db || !user) {
        alert("Database connection not ready. Check API keys.");
        return;
    }

    try {
      if (editingId) {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'monitors', editingId);
        
        const updateData = {
            url,
            selector,
            name,
            updatedAt: serverTimestamp()
        };

        if (manualValue) {
             updateData.lastValue = manualValue;
             updateData.lastChecked = serverTimestamp();
             updateData.status = 'stable';
        }

        await updateDoc(docRef, updateData);

      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'monitors'), {
          url,
          selector,
          name,
          lastValue: null,
          lastChecked: null,
          status: 'new',
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (err) {
      console.error("Error saving monitor:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Stop tracking this item?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'monitors', id));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const simulateCheck = async (monitor) => {
    const possibleValues = [
      "$49.99", 
      "In Stock", 
      "Out of Stock", 
      "UNREGISTERED", 
      "REGISTERED"
    ];
    
    const newValue = possibleValues[Math.floor(Math.random() * possibleValues.length)];
    const status = (monitor.lastValue && monitor.lastValue !== newValue) ? 'changed' : 'stable';

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'monitors', monitor.id), {
        lastValue: newValue,
        lastChecked: serverTimestamp(),
        status: status
      });
    } catch (err) {
      console.error("Error updating monitor:", err);
    }
  };

  if (!auth) {
     return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 max-w-md w-full shadow-sm">
                <h1 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle /> Configuration Needed
                </h1>
                <p className="text-slate-700 mb-4 text-sm">
                    This app requires Firebase keys to run. 
                </p>
                <div className="text-xs bg-white p-3 rounded border border-red-200 font-mono text-slate-500 overflow-x-auto">
                   1. Ensure your <strong>.env</strong> file exists in the project root.<br/>
                   2. Ensure variables start with <strong>VITE_</strong>.<br/>
                   3. Run <strong>npm run deploy</strong> again to rebuild.
                </div>
            </div>
        </div>
     );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin text-blue-600">
          <RefreshCw size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AiSelectorModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        onSelect={(newSelector) => setSelector(newSelector)}
      />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Tracky</h1>
          </div>
          <button 
            onClick={() => {
                if (isFormOpen) resetForm();
                else setIsFormOpen(true);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm ${isFormOpen ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {isFormOpen ? <X size={18} /> : <Plus size={18} />}
            {isFormOpen ? 'Cancel' : 'Add Monitor'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {isFormOpen && (
          <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                {editingId ? <Pencil size={120} /> : <Activity size={120} />}
              </div>
              
              <h2 className="text-lg font-semibold mb-4 text-slate-800 relative z-10">
                  {editingId ? 'Edit Tracker' : 'Configure New Tracker'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Friendly Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Survey Registration Status"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target URL</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://example.com/product"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">CSS Selector</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. .status-label or #register-status"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-mono text-sm"
                      value={selector}
                      onChange={(e) => setSelector(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      title="Use AI to find selector"
                    >
                      <Sparkles size={16} />
                      <span className="text-sm font-medium">AI Helper</span>
                    </button>
                  </div>
                </div>

                {editingId && (
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                         <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                            Manual Status Update 
                            <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Optional</span>
                         </label>
                         <p className="text-xs text-slate-500 mb-2">Since the app cannot auto-scrape due to browser security, paste the current value here if you want to update it manually.</p>
                         <input 
                            type="text" 
                            placeholder="e.g. UNREGISTERED"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                            value={manualValue}
                            onChange={(e) => setManualValue(e.target.value)}
                         />
                    </div>
                )}

                <div className="md:col-span-2 flex justify-end mt-2 gap-2">
                  <button 
                    type="submit" 
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Save size={18} />
                    {editingId ? 'Save Changes' : 'Start Monitoring'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-700">Active Monitors ({monitors.length})</h2>
          {monitors.length > 0 && (
             <div className="text-xs text-slate-500 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-2">
               <AlertCircle size={14} className="text-blue-500"/>
               Simulation Mode: Auto-scraping is simulated. Use Edit to update manually.
             </div>
          )}
        </div>

        {monitors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No monitors yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              Add a website URL and a CSS selector to start tracking changes in prices, text, or availability.
            </p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Create your first monitor &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.map(monitor => (
              <MonitorCard 
                key={monitor.id} 
                monitor={monitor} 
                onDelete={handleDelete}
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
