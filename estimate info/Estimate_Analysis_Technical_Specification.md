# Estimate Analysis Dashboard - Technical Specification

## Overview

This document provides complete technical specifications for implementing the Estimate Analysis dashboard. It covers data sources, calculation methodologies, and implementation details for all metrics.

---

## Table of Contents

1. [Data Source & Structure](#1-data-source--structure)
2. [Core Concepts](#2-core-concepts)
3. [KPI Calculations](#3-kpi-calculations)
4. [Tier Selection Analysis](#4-tier-selection-analysis)
5. [Time to Close Analysis](#5-time-to-close-analysis)
6. [Seasonality Analysis](#6-seasonality-analysis)
7. [Realistic Unsold Revenue Calculation](#7-realistic-unsold-revenue-calculation)
8. [Department Mapping](#8-department-mapping)
9. [API Implementation Notes](#9-api-implementation-notes)
10. [Sample Queries](#10-sample-queries)

---

## 1. Data Source & Structure

### ServiceTitan Report: Unsold Estimate Follow-Up

Pull the "Unsold Estimate Follow-Up" report from ServiceTitan with the following columns:

| Column Name | Description | Used For |
|-------------|-------------|----------|
| Opportunity Number | Unique identifier for the sales opportunity | Grouping estimates |
| Opportunity Status | Won, Dismissed, Not Attempted, Unreachable, Contacted | Win/loss tracking |
| Estimate Status | Sold, Open, Dismissed | Identifying winning option |
| Estimates Subtotal | Dollar value of the estimate | Revenue calculations |
| Business Unit | Department classification | Department filtering |
| Estimate Created By | Tech/salesperson name | Performance tracking |
| Creation Date | When estimate was created | Seasonality, time to close |
| Sold On | When opportunity was won | Time to close |
| Number of Follow Ups | Count of follow-up attempts | Follow-up analysis |
| Estimate Age (Days) | Days since creation | Aging analysis |
| Location Phone | Customer phone | Export to follow-up list |
| Customer Email | Customer email | Export to follow-up list |
| Customer Name | Customer name | Export to follow-up list |

### Key Data Relationship

```
One Opportunity → Multiple Estimates (pricing options)

Example:
Opportunity #12345
  ├── Estimate A: $1,200 (Repair)
  ├── Estimate B: $2,500 (Repair + Upgrades)  ← SOLD
  └── Estimate C: $8,500 (Replacement)
```

---

## 2. Core Concepts

### 2.1 Opportunity vs Estimate

- **Estimate**: A single pricing option presented to a customer
- **Opportunity**: A unique sales interaction that may contain 1-N estimates
- **Opportunity Number**: The unique identifier that groups related estimates

### 2.2 Why Group by Opportunity?

When a tech presents 3 options to a customer, that's ONE sales opportunity with THREE estimates. If the customer buys, only ONE estimate becomes "Sold" but the Opportunity Status becomes "Won."

**Critical Rule**: Always aggregate estimates by Opportunity Number before calculating metrics. Otherwise, you'll double/triple count opportunities.

### 2.3 Department Classification

Based on Business Unit field:

| Dashboard Department | ServiceTitan Business Units |
|---------------------|----------------------------|
| Sales | "Service Sales", "LYONS Sales" |
| Demand Calls | "Service Residential", "LYONS Service" |
| Maintenance | "Service Maintenance", "LYONS Maintenance" |
| Plumbing | "Plumbing", "Plumbing Service", "Plumbing Sales" |
| Electrical | "Electrical", "Electrical Service", "Electrical Sales" |
| Tyler | "Tyler Service", "Tyler Maintenance", "Tyler Sales" |

---

## 3. KPI Calculations

### 3.1 Total Opportunities

```javascript
// Group estimates by Opportunity Number, count unique opportunities
const opportunities = groupBy(estimates, 'opportunityNumber');
const totalOpportunities = Object.keys(opportunities).length;
```

### 3.2 Won Opportunities

```javascript
// Count opportunities where Opportunity Status = "Won"
const wonOpportunities = Object.values(opportunities).filter(
  group => group[0].opportunityStatus === 'Won'
).length;
```

### 3.3 Close Rate

```javascript
const closeRate = (wonOpportunities / totalOpportunities) * 100;
// Round to 1 decimal place
const closeRateDisplay = closeRate.toFixed(1);
```

### 3.4 Average Ticket

For each opportunity, calculate the MEAN of all estimate values, then average across all opportunities:

```javascript
// Step 1: Calculate mean estimate per opportunity
const opportunityAverages = Object.values(opportunities).map(group => {
  const estimates = group.map(e => e.estimatesSubtotal);
  return estimates.reduce((a, b) => a + b, 0) / estimates.length;
});

// Step 2: Calculate overall average
const avgTicket = opportunityAverages.reduce((a, b) => a + b, 0) / opportunityAverages.length;
```

### 3.5 Average Options per Opportunity

```javascript
const avgOptions = estimates.length / totalOpportunities;
```

---

## 4. Tier Selection Analysis

### Purpose
Understand which pricing tier customers choose when presented with multiple options.

### Methodology

For each WON opportunity with multiple estimates:

1. Sort estimates by Estimates Subtotal (ascending)
2. Find the SOLD estimate
3. Determine its rank position
4. Classify as Low/Mid/High tier

```javascript
function analyzeTierSelection(wonOpportunities) {
  const tierCounts = { low: 0, mid: 0, high: 0 };
  let multiOptionWins = 0;

  for (const [oppNumber, estimates] of Object.entries(wonOpportunities)) {
    // Skip single-option opportunities
    if (estimates.length <= 1) continue;
    
    // Sort by price ascending
    const sorted = estimates.sort((a, b) => a.estimatesSubtotal - b.estimatesSubtotal);
    
    // Find the sold estimate
    const soldEstimate = sorted.find(e => e.estimateStatus === 'Sold');
    if (!soldEstimate) continue;
    
    // Find its rank (1-indexed)
    const rank = sorted.findIndex(e => e.estimatesSubtotal === soldEstimate.estimatesSubtotal) + 1;
    const numOptions = sorted.length;
    
    // Classify tier
    if (rank === 1) {
      tierCounts.low++;
    } else if (rank === numOptions) {
      tierCounts.high++;
    } else {
      tierCounts.mid++;
    }
    
    multiOptionWins++;
  }

  return {
    low: (tierCounts.low / multiOptionWins * 100).toFixed(1),
    mid: (tierCounts.mid / multiOptionWins * 100).toFixed(1),
    high: (tierCounts.high / multiOptionWins * 100).toFixed(1)
  };
}
```

### Expected Results by Department

| Department | Low Tier | Mid Tier | High Tier |
|------------|----------|----------|-----------|
| Sales | ~45% | ~35% | ~20% |
| Demand Calls | ~65% | ~19% | ~16% |
| Maintenance | ~63% | ~29% | ~8% |

**Key Insight**: Service departments (Demand Calls, Maintenance) heavily favor low tier because options are often structurally different (repair vs replacement), not variations of the same job.

---

## 5. Time to Close Analysis

### Purpose
Understand how quickly opportunities close to optimize follow-up timing.

### Calculation

```javascript
function analyzeTimeToClose(wonOpportunities) {
  const buckets = {
    sameDay: 0,
    within7: 0,
    beyond7: 0
  };
  
  let validCount = 0;

  for (const [oppNumber, estimates] of Object.entries(wonOpportunities)) {
    const creationDate = new Date(estimates[0].creationDate);
    const soldOnDate = new Date(estimates[0].soldOn);
    
    // Calculate days difference
    const daysToClose = Math.floor((soldOnDate - creationDate) / (1000 * 60 * 60 * 24));
    
    // Skip invalid data (negative days or > 365)
    if (daysToClose < 0 || daysToClose > 365) continue;
    
    validCount++;
    
    if (daysToClose === 0) {
      buckets.sameDay++;
    } else if (daysToClose <= 7) {
      buckets.within7++;
    } else {
      buckets.beyond7++;
    }
  }

  return {
    sameDay: (buckets.sameDay / validCount * 100).toFixed(1),
    within7: (buckets.within7 / validCount * 100).toFixed(1),
    beyond7: (buckets.beyond7 / validCount * 100).toFixed(1)
  };
}
```

### Expected Results by Department

| Department | Same Day | 1-7 Days | 8+ Days |
|------------|----------|----------|---------|
| Sales | ~79% | ~16% | ~5% |
| Demand Calls | ~95% | ~4% | ~1% |
| Maintenance | ~92% | ~4% | ~4% |

**Key Insight**: Demand Calls close almost immediately (95% same day). Follow-up window is essentially 24-48 hours.

---

## 6. Seasonality Analysis

### Purpose
Track close rate and average ticket by month to identify trends.

### Calculation

```javascript
function analyzeSeasonality(opportunities) {
  // Group by month
  const byMonth = {};
  
  for (const [oppNumber, estimates] of Object.entries(opportunities)) {
    const creationDate = new Date(estimates[0].creationDate);
    const month = creationDate.getMonth(); // 0-11
    const monthKey = creationDate.toLocaleString('default', { month: 'short' });
    
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { opps: 0, won: 0, totalValue: 0 };
    }
    
    byMonth[monthKey].opps++;
    
    if (estimates[0].opportunityStatus === 'Won') {
      byMonth[monthKey].won++;
    }
    
    // Calculate mean estimate value for this opportunity
    const avgEstimate = estimates.reduce((sum, e) => sum + e.estimatesSubtotal, 0) / estimates.length;
    byMonth[monthKey].totalValue += avgEstimate;
  }

  // Calculate metrics
  return Object.entries(byMonth).map(([month, data]) => ({
    month,
    opps: data.opps,
    won: data.won,
    closeRate: (data.won / data.opps * 100).toFixed(1),
    avgTicket: Math.round(data.totalValue / data.opps)
  }));
}
```

---

## 7. Realistic Unsold Revenue Calculation

### The Problem with Simple Averages

When a tech presents 3 options ($1,200 / $2,500 / $8,500), using the MEAN ($4,067) dramatically overstates the realistic revenue because:

1. Customers rarely choose the highest option
2. Service options are often structurally different (repair vs replacement)
3. Historical data shows strong preference for lower-priced options

### Discovery: Department-Specific Multipliers

Through analysis of actual won revenue vs projected revenue, we discovered:

| Department | Best Method | Multiplier | Accuracy |
|------------|-------------|------------|----------|
| Sales | Weighted Average | N/A | 5.3% error |
| Demand Calls | MIN × 1.70 | 1.70 | 0% error |
| Maintenance | MIN × 1.60 | 1.60 | 0% error |

### Method 1: Weighted Average (Sales Department)

Use historical tier selection percentages to weight the calculation:

```javascript
function calculateWeightedRevenue(opportunities, tierWeights) {
  // tierWeights = { low: 0.456, mid: 0.345, high: 0.199 } for Sales
  
  let totalRevenue = 0;
  
  for (const [oppNumber, estimates] of Object.entries(opportunities)) {
    if (estimates.length === 1) {
      // Single option: use that value
      totalRevenue += estimates[0].estimatesSubtotal;
    } else {
      // Multiple options: apply weighted calculation
      const sorted = estimates.sort((a, b) => a.estimatesSubtotal - b.estimatesSubtotal);
      const low = sorted[0].estimatesSubtotal;
      const high = sorted[sorted.length - 1].estimatesSubtotal;
      const mid = sorted.length > 2 
        ? sorted[Math.floor(sorted.length / 2)].estimatesSubtotal
        : (low + high) / 2;
      
      const weightedValue = (low * tierWeights.low) + 
                           (mid * tierWeights.mid) + 
                           (high * tierWeights.high);
      totalRevenue += weightedValue;
    }
  }
  
  return totalRevenue;
}
```

### Method 2: MIN × Multiplier (Service Departments)

```javascript
function calculateMinMultiplierRevenue(opportunities, multiplier) {
  // multiplier = 1.70 for Demand Calls, 1.60 for Maintenance
  
  let totalRevenue = 0;
  
  for (const [oppNumber, estimates] of Object.entries(opportunities)) {
    const minEstimate = Math.min(...estimates.map(e => e.estimatesSubtotal));
    totalRevenue += minEstimate * multiplier;
  }
  
  return totalRevenue;
}
```

### Complete Implementation

```javascript
function calculateRealisticUnsoldRevenue(opportunities, department) {
  // Filter to unsold opportunities only
  const unsold = Object.entries(opportunities).filter(
    ([_, estimates]) => estimates[0].opportunityStatus !== 'Won'
  );

  const config = {
    sales: { method: 'weighted', weights: { low: 0.456, mid: 0.345, high: 0.199 } },
    demand: { method: 'minMultiplier', multiplier: 1.70 },
    maintenance: { method: 'minMultiplier', multiplier: 1.60 },
    plumbing: { method: 'minMultiplier', multiplier: 1.65 },
    electrical: { method: 'minMultiplier', multiplier: 1.65 },
    tyler: { method: 'minMultiplier', multiplier: 1.65 }
  };

  const deptConfig = config[department];
  
  if (deptConfig.method === 'weighted') {
    return calculateWeightedRevenue(Object.fromEntries(unsold), deptConfig.weights);
  } else {
    return calculateMinMultiplierRevenue(Object.fromEntries(unsold), deptConfig.multiplier);
  }
}
```

### Why This Matters

| Method | Sales Accuracy | Demand Accuracy | Maintenance Accuracy |
|--------|---------------|-----------------|---------------------|
| MEAN (old method) | 11.5% over | 121% over | 129% over |
| Realistic (new) | 5.3% over | 0% | 0% |

**Using MEAN for Maintenance overstates unsold revenue by 129%!**

---

## 8. Department Mapping

### ServiceTitan Business Unit → Dashboard Department

```javascript
const departmentMapping = {
  // Sales
  'Service Sales': 'sales',
  'LYONS Sales': 'sales',
  
  // Demand Calls (Service Residential)
  'Service Residential': 'demand',
  'LYONS Service': 'demand',
  
  // Maintenance (Cool Club)
  'Service Maintenance': 'maintenance',
  'LYONS Maintenance': 'maintenance',
  
  // Plumbing
  'Plumbing': 'plumbing',
  'Plumbing Service': 'plumbing',
  'Plumbing Sales': 'plumbing',
  'Plumbing Maintenance': 'plumbing',
  
  // Electrical
  'Electrical': 'electrical',
  'Electrical Service': 'electrical',
  'Electrical Sales': 'electrical',
  'Electrical Maintenance': 'electrical',
  
  // Tyler
  'Tyler Service': 'tyler',
  'Tyler Maintenance': 'tyler',
  'Tyler Sales': 'tyler'
};

function getDepartment(businessUnit) {
  const normalized = businessUnit.trim();
  return departmentMapping[normalized] || 'other';
}
```

---

## 9. API Implementation Notes

### ServiceTitan API Endpoint

Use the Reporting API to pull estimate data:

```
GET /reporting/v2/tenant/{tenantId}/reports/estimates
```

### Authentication

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'ST-App-Key': appKey,
  'Content-Type': 'application/json'
};
```

### Your ServiceTitan Credentials

- **App ID**: rlaxwjh55wy6t
- **Tenant ID**: 1498628772

### Date Filtering

```javascript
// Filter by creation date for the selected period
const params = {
  createdOnOrAfter: '2025-06-01T00:00:00Z',
  createdBefore: '2026-01-01T00:00:00Z',
  pageSize: 5000
};
```

### Pagination

ServiceTitan returns max 5000 records per page. Implement pagination:

```javascript
async function fetchAllEstimates(startDate, endDate) {
  let allEstimates = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(`${baseUrl}/estimates?page=${page}&pageSize=5000&...`);
    const data = await response.json();
    
    allEstimates = allEstimates.concat(data.data);
    hasMore = data.hasMore;
    page++;
  }
  
  return allEstimates;
}
```

---

## 10. Sample Queries

### Complete Data Processing Pipeline

```javascript
async function processEstimateData(startDate, endDate, department = 'all') {
  // 1. Fetch raw data
  const estimates = await fetchAllEstimates(startDate, endDate);
  
  // 2. Filter by department if specified
  const filtered = department === 'all' 
    ? estimates 
    : estimates.filter(e => getDepartment(e.businessUnit) === department);
  
  // 3. Group by opportunity
  const opportunities = groupBy(filtered, 'opportunityNumber');
  
  // 4. Separate won vs unsold
  const wonOpps = {};
  const unsoldOpps = {};
  
  for (const [oppNum, group] of Object.entries(opportunities)) {
    if (group[0].opportunityStatus === 'Won') {
      wonOpps[oppNum] = group;
    } else {
      unsoldOpps[oppNum] = group;
    }
  }
  
  // 5. Calculate all metrics
  const totalOpportunities = Object.keys(opportunities).length;
  const wonCount = Object.keys(wonOpps).length;
  
  return {
    totalOpportunities,
    won: wonCount,
    closeRate: (wonCount / totalOpportunities * 100).toFixed(1),
    avgTicket: calculateAvgTicket(opportunities),
    avgOptionsPerOpp: (filtered.length / totalOpportunities).toFixed(1),
    realisticUnsold: calculateRealisticUnsoldRevenue(unsoldOpps, department),
    tierSelection: analyzeTierSelection(wonOpps),
    timeToClose: analyzeTimeToClose(wonOpps),
    seasonality: analyzeSeasonality(opportunities)
  };
}
```

### Utility Functions

```javascript
// Group array by key
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

// Calculate average ticket
function calculateAvgTicket(opportunities) {
  const avgPerOpp = Object.values(opportunities).map(group => {
    const total = group.reduce((sum, e) => sum + e.estimatesSubtotal, 0);
    return total / group.length;
  });
  
  return Math.round(avgPerOpp.reduce((a, b) => a + b, 0) / avgPerOpp.length);
}
```

---

## Appendix: Target Values

### Suggested Targets by Department

| Department | Close Rate Target | Avg Ticket Target |
|------------|-------------------|-------------------|
| Sales | 60% | $15,000 |
| Demand Calls | 55% | $2,000 |
| Maintenance | 30% | $2,500 |
| Plumbing | 50% | $1,800 |
| Electrical | 50% | $1,500 |
| Tyler | 50% | $1,200 |

These can be made configurable in the dashboard settings.

---

## Appendix: Validation Checklist

Before deploying, validate calculations by:

1. **Close Rate**: Compare to ServiceTitan's built-in reports
2. **Realistic Revenue**: Test against a month of actual closed revenue
   - Pull won opportunities for a completed month
   - Calculate what the projection would have been using your method
   - Compare to actual closed revenue
   - Should be within 10% error

3. **Tier Selection**: Spot-check 10-20 won opportunities manually
4. **Time to Close**: Verify date math with sample records

---

## Appendix: Error Handling

```javascript
// Handle missing/null values
function safeNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Handle invalid dates
function safeDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

// Skip records with critical missing data
function isValidEstimate(estimate) {
  return (
    estimate.opportunityNumber &&
    estimate.estimatesSubtotal > 0 &&
    estimate.businessUnit &&
    estimate.creationDate
  );
}
```

---

## Summary

The key innovations in this analysis:

1. **Opportunity-based grouping**: Always aggregate by Opportunity Number before calculating
2. **Department-specific multipliers**: Sales uses weighted average, Service departments use MIN × multiplier
3. **Tier selection tracking**: Understanding customer price sensitivity by department
4. **Time to close analysis**: Informing follow-up timing and sequence design

These calculations provide accurate, actionable metrics that avoid the common pitfall of overstating unsold revenue using simple averages.
