import { useState, useCallback } from 'react';
import { TerraformParser } from '../utils/parser';
import { SecurityAnalyzer } from '../utils/security';
import { DependencyAnalyzer } from '../utils/dependencies';
import { AnalysisResult } from '../types/terraform';

interface ProcessingState {
  isProcessing: boolean;
  error: string | null;
  result: AnalysisResult | null;
  progress: number;
}

export const useFileProcessor = () => {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    error: null,
    result: null,
    progress: 0
  });

  const processFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));

    try {
      // Validate file
      if (!TerraformParser.validateFileType(file)) {
        throw new Error('Invalid file type. Please upload a .tfstate or .json file.');
      }

      if (!TerraformParser.validateFileSize(file)) {
        throw new Error('File size exceeds 50MB limit.');
      }

      setState(prev => ({ ...prev, progress: 20 }));

      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      setState(prev => ({ ...prev, progress: 40 }));

      // Parse Terraform state
      const state = TerraformParser.parseStateFile(content);
      setState(prev => ({ ...prev, progress: 60 }));

      // Generate initial analysis
      const analysis = TerraformParser.generateAnalysis(state);
      setState(prev => ({ ...prev, progress: 70 }));

      // Run security analysis
      const securityIssues = SecurityAnalyzer.analyzeResources(analysis.resources);
      analysis.securityIssues = securityIssues;
      analysis.summary.securityScore = SecurityAnalyzer.calculateSecurityScore(securityIssues);
      analysis.summary.criticalIssues = securityIssues.filter(issue => issue.severity === 'critical').length;

      setState(prev => ({ ...prev, progress: 85 }));

      // Analyze dependencies
      const dependencies = DependencyAnalyzer.analyzeDependencies(analysis.resources);
      analysis.dependencies = dependencies;

      setState(prev => ({ ...prev, progress: 100 }));

      // Complete processing
      setState({
        isProcessing: false,
        error: null,
        result: analysis,
        progress: 100
      });

    } catch (error) {
      setState({
        isProcessing: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        result: null,
        progress: 0
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      error: null,
      result: null,
      progress: 0
    });
  }, []);

  return {
    ...state,
    processFile,
    reset
  };
};