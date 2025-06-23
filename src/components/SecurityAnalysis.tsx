import React, { useState } from 'react';
import { SecurityIssue } from '../types/terraform';
import {
  AlertTriangle,
  Shield,
  Lock,
  Users,
  FileX,
  ChevronDown,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

interface SecurityAnalysisProps {
  issues: SecurityIssue[];
  onBack: () => void;
}

export const SecurityAnalysis: React.FC<SecurityAnalysisProps> = ({
  issues,
  onBack
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const severityColors = {
    critical: { 
      bg: 'bg-red-50 dark:bg-red-900/20', 
      border: 'border-red-200 dark:border-red-800', 
      text: 'text-red-700 dark:text-red-300', 
      icon: 'text-red-600 dark:text-red-400' 
    },
    high: { 
      bg: 'bg-orange-50 dark:bg-orange-900/20', 
      border: 'border-orange-200 dark:border-orange-800', 
      text: 'text-orange-700 dark:text-orange-300', 
      icon: 'text-orange-600 dark:text-orange-400' 
    },
    medium: { 
      bg: 'bg-yellow-50 dark:bg-yellow-900/20', 
      border: 'border-yellow-200 dark:border-yellow-800', 
      text: 'text-yellow-700 dark:text-yellow-300', 
      icon: 'text-yellow-600 dark:text-yellow-400' 
    },
    low: { 
      bg: 'bg-blue-50 dark:bg-blue-900/20', 
      border: 'border-blue-200 dark:border-blue-800', 
      text: 'text-blue-700 dark:text-blue-300', 
      icon: 'text-blue-600 dark:text-blue-400' 
    }
  };

  const categoryIcons = {
    public_exposure: Shield,
    encryption: Lock,
    access_control: Users,
    compliance: FileX
  };

  // Filter out issues with invalid severity and normalize them
  const validIssues = issues.filter(issue => {
    return issue && 
           issue.severity && 
           ['critical', 'high', 'medium', 'low'].includes(issue.severity) &&
           issue.category &&
           ['public_exposure', 'encryption', 'access_control', 'compliance'].includes(issue.category);
  });

  const filteredIssues = validIssues.filter(issue => {
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.resource?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSeverity && matchesCategory && matchesSearch;
  });

  const toggleExpanded = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const issuesBySeverity = {
    critical: validIssues.filter(issue => issue.severity === 'critical').length,
    high: validIssues.filter(issue => issue.severity === 'high').length,
    medium: validIssues.filter(issue => issue.severity === 'medium').length,
    low: validIssues.filter(issue => issue.severity === 'low').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mb-4 flex items-center space-x-2"
          >
            <span>← Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Analysis</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Detailed security findings and recommendations for your infrastructure
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{issuesBySeverity.critical}</p>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Critical Issues</p>
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{issuesBySeverity.high}</p>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">High Priority</p>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{issuesBySeverity.medium}</p>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Medium Priority</p>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{issuesBySeverity.low}</p>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Low Priority</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search issues, resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="public_exposure">Public Exposure</option>
              <option value="encryption">Encryption</option>
              <option value="access_control">Access Control</option>
              <option value="compliance">Compliance</option>
            </select>
            <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredIssues.length} of {validIssues.length} issues</span>
          {validIssues.length !== issues.length && (
            <span className="text-yellow-600 dark:text-yellow-400">
              ({issues.length - validIssues.length} invalid issues filtered out)
            </span>
          )}
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-100 dark:border-gray-700 text-center transition-colors duration-300">
            <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Issues Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || selectedSeverity !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'Your infrastructure looks secure!'
              }
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            // Ensure we have valid severity and category
            const severity = issue.severity || 'low';
            const category = issue.category || 'compliance';
            
            const colors = severityColors[severity as keyof typeof severityColors] || severityColors.low;
            const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons] || FileX;
            const isExpanded = expandedIssues.has(issue.id);

            return (
              <div
                key={issue.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border ${colors.border} shadow-sm overflow-hidden transition-colors duration-300`}
              >
                <div
                  className={`${colors.bg} p-6 cursor-pointer transition-colors duration-300`}
                  onClick={() => toggleExpanded(issue.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                      <CategoryIcon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {issue.resource || 'Unknown Resource'}
                        </span>
                      </div>
                      
                      <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>
                        {issue.title || 'Security Issue'}
                      </h3>
                      
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {issue.description || 'No description available'}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors duration-300">
                    <div className="space-y-6">
                      {/* Remediation */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          💡 Recommended Action
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                            {issue.remediation || 'No remediation steps available'}
                          </p>
                        </div>
                      </div>

                      {/* Technical Details */}
                      {issue.details && Object.keys(issue.details).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            🔍 Technical Details
                          </h4>
                          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                              {JSON.stringify(issue.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Category Info */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          📋 Category
                        </h4>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {category.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};