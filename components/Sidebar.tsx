import { useState, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  selectedModel?: string;
  onModelSelect?: (modelId: string) => void;
}

const AVAILABLE_MODELS = [
  { id: "llama-3.3-70b", name: "LLAMA-3.3-70B" },
  { id: "llama-3.1-8b", name: "LLAMA-3.1-8B" },
  { id: "llama-4-scout-17b-16e-instruct", name: "LLAMA-4-SCOUT-17B" },
  { id: "qwen-3-32b", name: "QWEN-3-32B" },
];

export default function Sidebar({ isOpen, onClose, onToggle, selectedModel: propSelectedModel, onModelSelect }: SidebarProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });

  // Function to load values from localStorage (browser-only)
  const loadSavedValues = () => {
    // Only access localStorage in browser environment
    if (typeof window !== "undefined") {
      const savedApiKey = localStorage.getItem("CEREBRAS_API_KEY") || "";
      // Use the prop value if provided, otherwise use localStorage
      const modelToUse = propSelectedModel || localStorage.getItem("selected_model") || "llama-3.3-70b";
      
      setApiKey(savedApiKey);
      setSelectedModel(modelToUse);
    } else {
      // In server environment, just use the prop
      if (propSelectedModel) {
        setSelectedModel(propSelectedModel);
      }
    }
  };

  // Load values when component mounts or when propSelectedModel changes
  useEffect(() => {
    loadSavedValues();
  }, [propSelectedModel]);

  // Handle model change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    
    // Call the parent's onModelSelect if provided
    if (onModelSelect) {
      onModelSelect(newModel);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      setSaveMessage({ type: "error", text: "API key is required" });
      return;
    }

    setIsSaving(true);
    
    // Save to localStorage (browser-only)
    if (typeof window !== "undefined") {
      localStorage.setItem("CEREBRAS_API_KEY", apiKey);
      localStorage.setItem("selected_model", selectedModel);
    }
    
    // Call the parent's onModelSelect if provided
    if (onModelSelect) {
      onModelSelect(selectedModel);
    }
    
    // Simulate saving delay
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage({ type: "success", text: "Settings saved successfully" });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
        onClose();
      }, 1500);
    }, 500);
  };

  return (
    <>
      {/* Toggle button outside sidebar */}
      <button 
        onClick={onToggle}
        className={`fixed top-16 right-0 z-40 p-1.5 border-t border-l border-b border-primary-600/30 bg-dark-900 text-primary-400 hover:text-primary-300 transition-all ${isOpen ? 'translate-x-0' : 'translate-x-0'}`}
        aria-label="Toggle settings panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Main sidebar */}
      <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-dark-900 border-l border-primary-900/30 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out animate-fade-in`}>
        {/* Vertical accent line */}
        <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-primary-600/10 via-primary-600/30 to-primary-600/10"></div>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-primary-900/30 px-4 py-3">
            <h2 className="text-sm font-mono font-semibold tracking-tight text-primary-500 uppercase">Config</h2>
            <button 
              onClick={onClose}
              className="text-dark-300 hover:text-primary-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Model Selection */}
              <div>
                <label htmlFor="model-selector" className="block text-xs font-mono uppercase tracking-wider text-dark-200 mb-1">
                  Model Selection
                </label>
                <div className="relative">
                  <select
                    id="model-selector"
                    value={selectedModel}
                    onChange={handleModelChange}
                    className="block w-full border-1 border-primary-600/30 bg-dark-800 text-white focus:border-primary-500 focus:ring-0 text-xs font-mono py-1.5 px-2 appearance-none"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-primary-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label htmlFor="api-key" className="block text-xs font-mono uppercase tracking-wider text-dark-200 mb-1">
                  Cerebras API Key
                </label>
                <input
                  type="password"
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="block w-full border-1 border-primary-600/30 bg-dark-800 text-white focus:border-primary-500 focus:ring-0 text-xs font-mono py-1.5 px-2"
                />
                <br />
                <p className="mt-1 text-xs font-mono text-dark-400">
                  Get your key at{" "}
                  <a
                    href="https://cloud.cerebras.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:text-primary-400 no-underline border-b border-primary-600/30 hover:border-primary-500/50"
                  >
                    cloud.cerebras.ai<br /><br />
                  </a>
                </p>
                <p className="mt-1 text-xs font-mono text-dark-400">
                  1. Create an account on Cerebras Cloud <br /><br />
                  2. Navigate to "API Keys" in the left menu <br /><br />
                  3. Create a new API key and copy it here
                </p>
              </div>

              {/* Save Button */}
              <div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full border-1 border-accent-600/50 bg-dark-800 hover:bg-dark-700 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-accent-400 hover:text-accent-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-accent-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      PROCESSING...
                    </div>
                  ) : "SAVE CONFIG"}
                </button>
                {saveMessage.text && (
                  <p className={`mt-2 text-xs font-mono ${saveMessage.type === "error" ? "text-accent-500" : "text-primary-500"}`}>
                    {saveMessage.text}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-primary-900/30 px-4 py-3">
            <div className="text-xs font-mono text-dark-400 flex items-center justify-between">
              {/* <span>CEREBRAS API</span> */}
              <span className="text-primary-500">CEREBRAS API</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
