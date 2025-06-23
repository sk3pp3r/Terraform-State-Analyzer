import React from 'react';
import { AnalysisResult } from '../types/terraform';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Server, 
  Network,
  Globe,
  Users,
  Cloud
} from 'lucide-react';

interface DashboardProps {
  analysis: AnalysisResult;
  onViewDetails: (section: string) => void;
}

// Cloud provider logo mapping
const cloudProviderLogos: Record<string, string> = {
  'aws': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
  'amazon': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
  'gcp': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
  'google': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
  'azure': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg',
  'microsoft': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg',
  'digitalocean': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/DigitalOcean_logo.svg',
  'linode': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Linode_logo.svg',
  'vultr': 'https://www.vultr.com/dist/img/brand/vultr-logo-onwhite-text.svg',
  'oracle': 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg',
  'ibm': 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
  'alibaba': 'https://upload.wikimedia.org/wikipedia/commons/2/26/Alibaba_Cloud_logo.svg',
  'tencent': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Tencent_Logo.svg'
};

const getProviderLogo = (provider: string): string | null => {
  const normalizedProvider = provider.toLowerCase().replace(/[^a-z]/g, '');
  
  // Check for exact matches first
  if (cloudProviderLogos[normalizedProvider]) {
    return cloudProviderLogos[normalizedProvider];
  }
  
  // Check for partial matches
  for (const [key, logo] of Object.entries(cloudProviderLogos)) {
    if (normalizedProvider.includes(key) || key.includes(normalizedProvider)) {
      return logo;
    }
  }
  
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  analysis, 
  onViewDetails 
}) => {
  const { summary, securityIssues } = analysis;
  
  const securityIssuesBySeverity = {
    critical: securityIssues.filter(issue => issue.severity === 'critical').length,
    high: securityIssues.filter(issue => issue.severity === 'high').length,
    medium: securityIssues.filter(issue => issue.severity === 'medium').length,
    low: securityIssues.filter(issue => issue.severity === 'low').length,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/pcoDP_KqQC2xfBfOideQaQ-removebg-preview.png" 
            alt="Logo" 
            className="w-16 h-16 mr-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Infrastructure Analysis Dashboard
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Comprehensive overview of your Terraform infrastructure
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Security Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Security Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(summary.securityScore)}`}>
                {summary.securityScore}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getScoreBgColor(summary.securityScore)}`}>
              <Shield className={`w-6 h-6 ${getScoreColor(summary.securityScore)}`} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    summary.securityScore >= 80 ? 'bg-green-500' : 
                    summary.securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${summary.securityScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Total Resources */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Resources</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalResources}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Across {summary.regions.length} regions
          </p>
        </div>

        {/* Critical Issues */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Critical Issues</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.criticalIssues}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Require immediate attention
          </p>
        </div>

        {/* Providers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Cloud Providers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.providers.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-2">
            {summary.providers.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {summary.providers.map((provider, index) => {
                  const logo = getProviderLogo(provider);
                  return (
                    <div key={index} className="flex items-center space-x-1">
                      {logo ? (
                        <img 
                          src={logo} 
                          alt={provider} 
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            // Fallback to cloud icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'inline-block';
                          }}
                        />
                      ) : (
                        <Cloud className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                      <Cloud className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {provider.replace(/[^a-zA-Z]/g, '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No providers detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Security Issues Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Security Issues Overview</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{securityIssuesBySeverity.critical}</p>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Critical</p>
          </div>

          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{securityIssuesBySeverity.high}</p>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">High</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{securityIssuesBySeverity.medium}</p>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Medium</p>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{securityIssuesBySeverity.low}</p>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Low</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onViewDetails('security')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            View Security Details
          </button>
          <button
            onClick={() => onViewDetails('network')}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            View Network Topology
          </button>
        </div>
      </div>

      {/* Resource Types Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Resource Distribution</h2>
        
        <div className="space-y-4">
          {Object.entries(summary.resourcesByType)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([type, count]) => {
              const percentage = (count / summary.totalResources) * 100;
              return (
                <div key={type} className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {type.replace('aws_', '').replace('_', ' ')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">
                        {count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Explore Dependencies</h3>
              <p className="text-blue-100 text-sm">
                Visualize resource relationships and infrastructure topology
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewDetails('dependencies')}
            className="mt-4 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium"
          >
            View Dependency Graph
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Export Report</h3>
              <p className="text-green-100 text-sm">
                Generate comprehensive reports for your team
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewDetails('export')}
            className="mt-4 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};