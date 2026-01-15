"use client";

import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const UnsoldEstimateProcessor = () => {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        setError('Please select an Excel file (.xlsx)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('The file appears to be empty');
      }

      // Group by Opportunity Number
      const grouped = {};
      jsonData.forEach((row) => {
        const opportunityNumber = row['Opportunity Number'];
        if (!opportunityNumber) return;

        if (!grouped[opportunityNumber]) {
          grouped[opportunityNumber] = {
            opportunityNumber,
            customerName: row['Customer Name'],
            locationPhone: row['Location Phone'],
            customerEmail: row['Customer Email'],
            businessUnit: row['Business Unit'],
            estimateCreatedBy: row['Estimate Created By'],
            creationDate: row['Creation Date'],
            followUpDate: row['Follow Up Date'],
            numberOfFollowUps: row['Number of Follow Ups'],
            estimateAgeDays: row['Estimate Age (Days)'],
            estimateSubtotals: [],
          };
        }

        // Parse the Estimates Subtotal
        let subtotal = row['Estimates Subtotal'];
        if (typeof subtotal === 'string') {
          subtotal = parseFloat(subtotal.replace(/[$,]/g, ''));
        }
        if (!isNaN(subtotal)) {
          grouped[opportunityNumber].estimateSubtotals.push(subtotal);
        }
      });

      // Calculate averages and create output rows
      const outputRows = Object.values(grouped).map((group) => {
        const avgEstimate =
          group.estimateSubtotals.length > 0
            ? group.estimateSubtotals.reduce((a, b) => a + b, 0) / group.estimateSubtotals.length
            : 0;

        return {
          'Opportunity Number': group.opportunityNumber,
          'Customer Name': group.customerName,
          'Location Phone': group.locationPhone,
          'Customer Email': group.customerEmail,
          'Business Unit': group.businessUnit,
          'Average Estimate': Math.round(avgEstimate * 100) / 100,
          'Number of Options': group.estimateSubtotals.length,
          'Estimate Created By': group.estimateCreatedBy,
          'Creation Date': group.creationDate,
          'Follow Up Date': group.followUpDate,
          'Number of Follow Ups': group.numberOfFollowUps,
          'Estimate Age (Days)': group.estimateAgeDays,
        };
      });

      // Sort by Average Estimate descending
      outputRows.sort((a, b) => b['Average Estimate'] - a['Average Estimate']);

      // Calculate summary stats
      const totalOpportunities = outputRows.length;
      const totalRealisticRevenue = outputRows.reduce((sum, row) => sum + row['Average Estimate'], 0);

      // Create CSV
      const csvWorksheet = XLSX.utils.json_to_sheet(outputRows);
      const csvContent = XLSX.utils.sheet_to_csv(csvWorksheet);

      setResult({
        csvContent,
        totalOpportunities,
        totalRealisticRevenue,
        fileName: file.name.replace('.xlsx', '_processed.csv'),
      });
    } catch (err) {
      setError(err.message || 'An error occurred while processing the file');
    } finally {
      setProcessing(false);
    }
  };

  const downloadCsv = () => {
    if (!result) return;

    const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = result.fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <FileSpreadsheet className="h-5 w-5 text-green-400" />
        <h3 className="text-lg font-medium">Unsold Estimate Processor</h3>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Upload a ServiceTitan unsold estimate Excel file to process it into a CSV with one row per
        opportunity, averaging multiple estimate options per customer.
      </p>

      {/* File Upload */}
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            className="hidden"
          />
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          {file ? (
            <p className="text-blue-400">{file.name}</p>
          ) : (
            <p className="text-gray-400">Click to select an Excel file (.xlsx)</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={processFile}
          disabled={!file || processing}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            !file || processing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {processing ? 'Processing...' : 'Process File'}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Summary Stats */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-400 mb-3">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Processing Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Opportunities</p>
                  <p className="text-2xl font-bold">{result.totalOpportunities}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Realistic Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(result.totalRealisticRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadCsv}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Download {result.fileName}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnsoldEstimateProcessor;
