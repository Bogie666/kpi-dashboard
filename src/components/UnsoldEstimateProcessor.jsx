"use client";

import React, { useState } from 'react';
import { Download, FileSpreadsheet, AlertCircle, CheckCircle, Calendar, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const ADMIN_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api';

const UnsoldEstimateProcessor = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fetching, setFetching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Set default dates to current month
  React.useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchAndProcess = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setFetching(true);
    setProcessing(false);
    setError(null);
    setResult(null);

    try {
      // Fetch data from admin-api
      const response = await fetch(`${ADMIN_API}/unsold-estimates/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data from ServiceTitan');
      }

      const fetchedData = await response.json();

      if (!fetchedData.data || fetchedData.data.length === 0) {
        throw new Error('No unsold estimates found for the selected date range');
      }

      setFetching(false);
      setProcessing(true);

      // Process the fetched data
      const jsonData = fetchedData.data;

      // Group by Opportunity Number
      const grouped = {};
      jsonData.forEach((row) => {
        const opportunityNumber = row.opportunity_number;
        if (!opportunityNumber) return;

        if (!grouped[opportunityNumber]) {
          grouped[opportunityNumber] = {
            opportunityNumber,
            customerName: row.customer_name,
            locationPhone: row.location_phone,
            customerEmail: row.customer_email,
            businessUnit: row.business_unit,
            emailSent: row.email_sent,
            estimateCreatedBy: row.estimate_created_by,
            creationDate: row.creation_date,
            followUpDate: row.follow_up_date,
            numberOfFollowUps: row.number_of_follow_ups,
            estimateAgeDays: row.estimate_age_days,
            estimateSubtotals: [],
            discountTotals: [],
          };
        }

        // Parse the Estimates Subtotal (stored as cents)
        const subtotalCents = row.estimates_subtotal_cents || 0;
        const subtotal = subtotalCents / 100;
        if (!isNaN(subtotal)) {
          grouped[opportunityNumber].estimateSubtotals.push(subtotal);
        }

        // Parse the Discount Total (stored as cents)
        const discountCents = row.estimates_discount_total_cents || 0;
        const discount = discountCents / 100;
        if (!isNaN(discount)) {
          grouped[opportunityNumber].discountTotals.push(discount);
        }
      });

      // Calculate averages and create output rows
      const outputRows = Object.values(grouped).map((group) => {
        const avgEstimate =
          group.estimateSubtotals.length > 0
            ? group.estimateSubtotals.reduce((a, b) => a + b, 0) / group.estimateSubtotals.length
            : 0;

        const avgDiscount =
          group.discountTotals.length > 0
            ? group.discountTotals.reduce((a, b) => a + b, 0) / group.discountTotals.length
            : 0;

        return {
          'Opportunity Number': group.opportunityNumber,
          'Customer Name': group.customerName,
          'Location Phone': group.locationPhone,
          'Customer Email': group.customerEmail,
          'Business Unit': group.businessUnit,
          'Email Sent': group.emailSent,
          'Average Estimate': Math.round(avgEstimate * 100) / 100,
          'Average Discount': Math.round(avgDiscount * 100) / 100,
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

      // Create XLSX workbook
      const worksheet = XLSX.utils.json_to_sheet(outputRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Unsold Estimates');

      // Generate filename with date range
      const fileName = `unsold_estimates_${startDate}_to_${endDate}.xlsx`;

      setResult({
        workbook,
        totalOpportunities,
        totalRealisticRevenue,
        totalEstimates: jsonData.length,
        fileName,
      });
    } catch (err) {
      setError(err.message || 'An error occurred while fetching or processing the data');
    } finally {
      setFetching(false);
      setProcessing(false);
    }
  };

  const downloadXlsx = () => {
    if (!result) return;

    XLSX.writeFile(result.workbook, result.fileName);
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
        Select a date range to fetch unsold estimates from ServiceTitan. The data will be processed
        into a spreadsheet with one row per opportunity, averaging multiple estimate options per customer.
      </p>

      {/* Date Range Selection */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Fetch Button */}
        <button
          onClick={fetchAndProcess}
          disabled={!startDate || !endDate || fetching || processing}
          className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            !startDate || !endDate || fetching || processing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {fetching || processing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>{fetching ? 'Fetching from ServiceTitan...' : 'Processing data...'}</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              <span>Fetch & Process</span>
            </>
          )}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Opportunities</p>
                  <p className="text-2xl font-bold">{result.totalOpportunities}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Estimates</p>
                  <p className="text-2xl font-bold text-blue-400">{result.totalEstimates}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Potential Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(result.totalRealisticRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadXlsx}
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
