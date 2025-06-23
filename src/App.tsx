import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { SecurityAnalysis } from './components/SecurityAnalysis';
import { NetworkDiagram } from './components/NetworkDiagram';
import { DependencyGraph } from './components/DependencyGraph';
import { ExportReport } from './components/ExportReport';
import { ThemeToggle } from './components/ThemeToggle';
import { useFileProcessor } from './hooks/useFileProcessor';
import { ThemeProvider } from './contexts/ThemeContext';
import { GitHub, LinkedIn, Briefcase } from "lucide-react";

type ViewMode = 'upload' | 'dashboard' | 'security' | 'network' | 'dependencies' | 'export';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewMode>('upload');
  const { isProcessing, error, result, progress, processFile, reset } = useFileProcessor();

  const handleFileSelect = (file: File) => {
    processFile(file);
  };

  const handleAnalysisComplete = () => {
    setCurrentView('dashboard');
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view as ViewMode);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleReset = () => {
    reset();
    setCurrentView('upload');
  };

  const handleGoHome = () => {
    reset();
    setCurrentView('upload');
  };

  // Auto-navigate to dashboard when analysis is complete
  React.useEffect(() => {
    if (result && !isProcessing && currentView === 'upload') {
      handleAnalysisComplete();
    }
  }, [result, isProcessing, currentView]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        {/* Header Navigation */}
        {result && currentView !== 'upload' && (
          <div className="mb-8">
            <nav className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="flex items-center mr-6">
                  <button 
                    onClick={handleGoHome}
                    className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <img 
                      src="/pcoDP_KqQC2xfBfOideQaQ-removebg-preview.png" 
                      alt="Logo" 
                      className="w-10 h-10 mr-3"
                    />
                    <span className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Terraform Analyzer
                    </span>
                  </button>
                </div>
                
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('security')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'security'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Security
                </button>
                <button
                  onClick={() => setCurrentView('network')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'network'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Network
                </button>
                <button
                  onClick={() => setCurrentView('dependencies')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'dependencies'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Dependencies
                </button>
                <button
                  onClick={() => setCurrentView('export')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'export'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Export
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                  New Analysis
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Theme Toggle for Upload Page */}
        {currentView === 'upload' && (
          <div className="absolute top-8 right-8">
            <ThemeToggle />
          </div>
        )}

        {/* Main Content */}
        {currentView === 'upload' && (
          <FileUpload
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
            error={error}
            progress={progress}
          />
        )}

        {currentView === 'dashboard' && result && (
          <Dashboard
            analysis={result}
            onViewDetails={handleViewChange}
          />
        )}

        {currentView === 'security' && result && (
          <SecurityAnalysis
            issues={result.securityIssues}
            onBack={handleBackToDashboard}
          />
        )}

        {currentView === 'network' && result && (
          <NetworkDiagram
            analysis={result}
            onBack={handleBackToDashboard}
          />
        )}

        {currentView === 'dependencies' && result && (
          <DependencyGraph
            analysis={result}
            onBack={handleBackToDashboard}
          />
        )}

        {currentView === 'export' && result && (
          <ExportReport
            analysis={result}
            onBack={handleBackToDashboard}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <button 
                onClick={handleGoHome}
                className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img 
                  src="/pcoDP_KqQC2xfBfOideQaQ-removebg-preview.png" 
                  alt="Logo" 
                  className="w-8 h-8"
                />
              </button>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                © 2025 Haim Cohen. All rights reserved.
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <a 
                href="https://linkedin.com/in/haimc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm transition-colors" 
                aria-label="LinkedIn"
              >
                <LinkedIn className="w-5 h-5" />
              </a>
              <a 
                href="https://sk3pp3r.github.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm transition-colors"
                aria-label="Portfolio"
              >
                <Briefcase className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/sk3pp3r/Terraform-State-Analyzer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm transition-colors"
                aria-label="GitHub Repository"
              >
                <GitHub className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;