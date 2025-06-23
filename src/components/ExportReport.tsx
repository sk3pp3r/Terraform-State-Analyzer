import React, { useState } from 'react';
import { AnalysisResult } from '../types/terraform';
import { 
  Download, 
  FileText, 
  Mail, 
  Share2, 
  Settings,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Network,
  BarChart3,
  Calendar,
  User,
  Building
} from 'lucide-react';

interface ExportReportProps {
  analysis: AnalysisResult;
  onBack: () => void;
}

interface ReportConfig {
  includeExecutiveSummary: boolean;
  includeSecurityAnalysis: boolean;
  includeDependencyAnalysis: boolean;
  includeResourceInventory: boolean;
  includeRecommendations: boolean;
  includeCharts: boolean;
  format: 'pdf' | 'html' | 'json' | 'csv';
  anonymizeData: boolean;
  includeTimestamp: boolean;
}

export const ExportReport: React.FC<ExportReportProps> = ({
  analysis,
  onBack
}) => {
  const [config, setConfig] = useState<ReportConfig>({
    includeExecutiveSummary: true,
    includeSecurityAnalysis: true,
    includeDependencyAnalysis: true,
    includeResourceInventory: true,
    includeRecommendations: true,
    includeCharts: true,
    format: 'pdf',
    anonymizeData: false,
    includeTimestamp: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [reportMetadata, setReportMetadata] = useState({
    title: 'Infrastructure Security Analysis Report',
    author: '',
    organization: '',
    description: 'Comprehensive analysis of Terraform infrastructure state'
  });

  const updateConfig = (key: keyof ReportConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (config.format === 'json') {
        downloadJsonReport();
      } else if (config.format === 'csv') {
        downloadCsvReport();
      } else if (config.format === 'html') {
        downloadHtmlReport();
      } else {
        // PDF generation would require a library like jsPDF
        alert('PDF generation - coming soon!');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadJsonReport = () => {
    const reportData = {
      metadata: {
        ...reportMetadata,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      summary: analysis.summary,
      ...(config.includeSecurityAnalysis && { securityIssues: analysis.securityIssues }),
      ...(config.includeDependencyAnalysis && { dependencies: analysis.dependencies }),
      ...(config.includeResourceInventory && { resources: config.anonymizeData ? anonymizeResources(analysis.resources) : analysis.resources })
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'infrastructure-analysis-report.json');
  };

  const downloadCsvReport = () => {
    const csvData = generateCsvData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    downloadFile(blob, 'infrastructure-analysis-report.csv');
  };

  const downloadHtmlReport = () => {
    const htmlContent = generateHtmlReport();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    downloadFile(blob, 'infrastructure-analysis-report.html');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const anonymizeResources = (resources: any[]) => {
    return resources.map(resource => ({
      ...resource,
      name: `resource_${Math.random().toString(36).substr(2, 9)}`,
      instances: resource.instances.map((instance: any) => ({
        ...instance,
        attributes: {
          ...instance.attributes,
          // Remove sensitive data
          name: undefined,
          tags: undefined,
          arn: undefined
        }
      }))
    }));
  };

  const generateCsvData = () => {
    const headers = ['Resource Type', 'Resource Name', 'Security Issues', 'Dependencies', 'Provider'];
    const rows = analysis.resources.map(resource => [
      resource.type,
      config.anonymizeData ? 'anonymized' : resource.name,
      analysis.securityIssues.filter(issue => issue.resource.includes(resource.name)).length,
      analysis.dependencies.filter(dep => dep.source.includes(resource.name) || dep.target.includes(resource.name)).length,
      resource.provider || 'unknown'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateHtmlReport = () => {
    const timestamp = new Date().toLocaleString();
    const criticalIssues = analysis.securityIssues.filter(issue => issue.severity === 'critical');
    const highIssues = analysis.securityIssues.filter(issue => issue.severity === 'high');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportMetadata.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 3px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #1F2937; font-size: 2.5em; margin: 0; }
        .subtitle { color: #6B7280; font-size: 1.2em; margin: 10px 0; }
        .metadata { background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .section { margin: 30px 0; }
        .section-title { color: #1F2937; font-size: 1.8em; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #6B7280; font-size: 0.9em; }
        .critical { color: #EF4444; }
        .high { color: #F59E0B; }
        .medium { color: #10B981; }
        .low { color: #3B82F6; }
        .issue-list { background: #F9FAFB; padding: 20px; border-radius: 8px; }
        .issue-item { background: white; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #EF4444; }
        .resource-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .resource-table th, .resource-table td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
        .resource-table th { background: #F9FAFB; font-weight: 600; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${reportMetadata.title}</h1>
        <p class="subtitle">${reportMetadata.description}</p>
        ${config.includeTimestamp ? `<p>Generated on: ${timestamp}</p>` : ''}
    </div>

    ${config.includeExecutiveSummary ? `
    <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.totalResources}</div>
                <div class="metric-label">Total Resources</div>
            </div>
            <div class="metric-card">
                <div class="metric-value critical">${criticalIssues.length}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value high">${highIssues.length}</div>
                <div class="metric-label">High Priority Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.securityScore}</div>
                <div class="metric-label">Security Score</div>
            </div>
        </div>
    </div>
    ` : ''}

    ${config.includeSecurityAnalysis ? `
    <div class="section">
        <h2 class="section-title">Security Analysis</h2>
        <div class="issue-list">
            ${criticalIssues.slice(0, 5).map(issue => `
                <div class="issue-item">
                    <h4>${issue.title}</h4>
                    <p><strong>Resource:</strong> ${config.anonymizeData ? 'anonymized' : issue.resource}</p>
                    <p>${issue.description}</p>
                    <p><strong>Remediation:</strong> ${issue.remediation}</p>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${config.includeResourceInventory ? `
    <div class="section">
        <h2 class="section-title">Resource Inventory</h2>
        <table class="resource-table">
            <thead>
                <tr>
                    <th>Resource Type</th>
                    <th>Count</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(analysis.summary.resourcesByType)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([type, count]) => `
                    <tr>
                        <td>${type}</td>
                        <td>${count}</td>
                        <td>${((count / analysis.summary.totalResources) * 100).toFixed(1)}%</td>
                    </tr>
                  `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>Report generated by Terraform State Visual Analyzer</p>
        ${reportMetadata.author ? `<p>Author: ${reportMetadata.author}</p>` : ''}
        ${reportMetadata.organization ? `<p>Organization: ${reportMetadata.organization}</p>` : ''}
    </div>
</body>
</html>
    `;
  };

  const shareReport = () => {
    if (navigator.share) {
      navigator.share({
        title: reportMetadata.title,
        text: 'Infrastructure Security Analysis Report',
        url: window.location.href
      });
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mb-4 flex items-center space-x-2"
          >
            <span>← Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Export Report</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Generate comprehensive reports for your team and stakeholders
          </p>
        </div>
      </div>

      {/* Report Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Report Information</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Title
            </label>
            <input
              type="text"
              value={reportMetadata.title}
              onChange={(e) => setReportMetadata(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author
            </label>
            <input
              type="text"
              value={reportMetadata.author}
              onChange={(e) => setReportMetadata(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization
            </label>
            <input
              type="text"
              value={reportMetadata.organization}
              onChange={(e) => setReportMetadata(prev => ({ ...prev, organization: e.target.value }))}
              placeholder="Company name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={reportMetadata.description}
              onChange={(e) => setReportMetadata(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Report Configuration</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Content Sections */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Include Sections</h3>
            <div className="space-y-3">
              {[
                { key: 'includeExecutiveSummary', label: 'Executive Summary', icon: BarChart3 },
                { key: 'includeSecurityAnalysis', label: 'Security Analysis', icon: Shield },
                { key: 'includeDependencyAnalysis', label: 'Dependency Analysis', icon: Network },
                { key: 'includeResourceInventory', label: 'Resource Inventory', icon: FileText },
                { key: 'includeRecommendations', label: 'Recommendations', icon: CheckCircle2 },
                { key: 'includeCharts', label: 'Charts & Visualizations', icon: BarChart3 }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={key}
                    checked={config[key as keyof ReportConfig] as boolean}
                    onChange={(e) => updateConfig(key as keyof ReportConfig, e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <label htmlFor={key} className="text-sm text-gray-700 dark:text-gray-300">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Format and Options */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Format & Options</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Format
                </label>
                <select
                  value={config.format}
                  onChange={(e) => updateConfig('format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pdf">PDF Report (soon)</option>
                  <option value="html">HTML Report</option>
                  <option value="json">JSON Data</option>
                  <option value="csv">CSV Export</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="anonymizeData"
                    checked={config.anonymizeData}
                    onChange={(e) => updateConfig('anonymizeData', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="anonymizeData" className="text-sm text-gray-700 dark:text-gray-300">
                    Anonymize sensitive data
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeTimestamp"
                    checked={config.includeTimestamp}
                    onChange={(e) => updateConfig('includeTimestamp', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includeTimestamp" className="text-sm text-gray-700 dark:text-gray-300">
                    Include generation timestamp
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Report Preview</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Summary Stats</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Resources:</span>
                <span className="font-medium text-gray-900 dark:text-white">{analysis.summary.totalResources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Security Score:</span>
                <span className="font-medium text-gray-900 dark:text-white">{analysis.summary.securityScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Critical Issues:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{analysis.summary.criticalIssues}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Security Issues</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Critical:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {analysis.securityIssues.filter(i => i.severity === 'critical').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">High:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {analysis.securityIssues.filter(i => i.severity === 'high').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Medium:</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {analysis.securityIssues.filter(i => i.severity === 'medium').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <Network className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Dependencies</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="font-medium text-gray-900 dark:text-white">{analysis.dependencies.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Explicit:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {analysis.dependencies.filter(d => d.type === 'explicit').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Implicit:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {analysis.dependencies.filter(d => d.type === 'implicit').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
        >
          <Download className="w-5 h-5" />
          <span>{isGenerating ? 'Generating...' : 'Generate Report'}</span>
        </button>

        <button
          onClick={shareReport}
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>

        <button
          onClick={() => {
            alert('Email functionality - coming soon!');
          }}
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          <Mail className="w-5 h-5" />
          <span>Email (soon)</span>
        </button>
      </div>

      {/* Format Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 transition-colors duration-300">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Export Format Information</h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><strong>PDF:</strong> Professional report suitable for presentations and documentation (coming soon)</p>
              <p><strong>HTML:</strong> Interactive report that can be viewed in any web browser</p>
              <p><strong>JSON:</strong> Raw data export for integration with other tools and systems</p>
              <p><strong>CSV:</strong> Tabular data export for spreadsheet analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};