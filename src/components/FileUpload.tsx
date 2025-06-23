import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
  progress: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  isProcessing,
  error,
  progress
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json', '.tfstate']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  if (isProcessing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors duration-300">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Analyzing Terraform State
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Processing your infrastructure configuration...
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{progress}% Complete</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="/pcoDP_KqQC2xfBfOideQaQ-removebg-preview.png" 
            alt="Terraform State Analyzer Logo" 
            className="w-32 h-32 mr-6"
          />
          <div className="text-left">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Terraform State Analyzer
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mt-2">
              Upload your Terraform state file to visualize infrastructure, identify security issues, and analyze dependencies
            </p>
          </div>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : isDragReject
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }
          ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
            error ? 'bg-red-100 dark:bg-red-900/30' : isDragActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {error ? (
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            ) : (
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
            )}
          </div>
          
          {error ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-700 dark:text-red-400">Upload Error</p>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                Please try again with a valid .tfstate or .json file
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {isDragActive ? 'Drop your file here' : 'Drop your Terraform state file here'}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                or <span className="text-blue-600 dark:text-blue-400 font-medium">browse to choose</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports .tfstate and .json files up to 50MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Preview */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Security Analysis</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Detect public exposures, encryption gaps, and access control issues
          </p>
        </div>

        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dependency Mapping</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Visualize resource relationships and infrastructure topology
          </p>
        </div>

        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interactive Reports</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Export findings and share insights with your team
          </p>
        </div>
      </div>
    </div>
  );
};