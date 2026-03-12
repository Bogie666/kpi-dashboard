# Estimate Analysis Dashboard - Implementation Specification

## CRITICAL: Dataset Details

**Report**: Estimate Analysis (DFW)
**Date Range**: January 20, 2025 - January 20, 2026
**Total Rows**: 51,116 estimates

---

## 1. EXACT COLUMN NAMES

The dataset has exactly 23 columns. Use these exact names:

```javascript
const columns = [
  'Estimate Id',
  'Parent Job Number',
  'Opportunity Number',
  'Customer Name',
  'Location Phone',
  'Customer Email',
  'Business Unit',
  'Email Sent',
  'Opportunity Status',
  'Sold On',
  'Install Job(s)',
  'Estimates Discount Total',
  'Estimates Subtotal',
  'Estimate Sales Installed',
  'Estimate Age (Days)',
  'Follow Up Date',
  'Number of Follow Ups',
  'Last Follow Up Date',
  'Estimate Status',
  'Recommended',
  'Sold By',
  'Creation Date',
  'Estimate Created By'
];
```

---

## 2. BUSINESS UNIT TO DEPARTMENT MAPPING

**CRITICAL**: Some Business Unit values have TRAILING SPACES. You must trim before mapping.

```javascript
function getDepartment(businessUnit) {
  // CRITICAL: Trim whitespace first
  const bu = (businessUnit || '').toString().trim();
  
  // Sales Department
  if (bu === 'Service Sales' || bu === 'LYONS Sales') {
    return 'sales';
  }
  
  // Demand Calls (Service Residential)
  if (bu === 'Service Residential' || bu === 'LYONS Service') {
    return 'demand';
  }
  
  // Maintenance (Cool Club)
  if (bu === 'Service Maintenance' || bu === 'LYONS Maintenance') {
    return 'maintenance';
  }
  
  // Plumbing
  if (bu === 'Plumbing Service' || bu === 'Plumbing Maintenance') {
    return 'plumbing';
  }
  
  // Electrical
  if (bu === 'Electrical Service' || bu === 'Electrical Maintenance') {
    return 'electrical';
  }
  
  // Tyler
  if (bu === 'Tyler Service' || bu === 'Tyler Maintenance' || bu === 'Tyler Sales Dept.') {
    return 'tyler';
  }
  
  // Everything else goes to 'other' (excluded from main dashboard)
  return 'other';
}
```

**Raw Business Unit values in dataset** (showing trailing spaces with quotes):

| Raw Value | Count | Maps To |
|-----------|-------|---------|
| `'Service Maintenance '` | 20,475 | maintenance |
| `'Service Residential'` | 7,987 | demand |
| `'Plumbing Maintenance '` | 5,133 | plumbing |
| `'Plumbing Service '` | 3,321 | plumbing |
| `'Service Sales '` | 2,686 | sales |
| `'LYONS Maintenance '` | 2,364 | maintenance |
| `'Tyler Maintenance'` | 1,878 | tyler |
| `'Tyler Service '` | 1,750 | tyler |
| `'LYONS Service'` | 1,484 | demand |
| `'Electrical Maintenance'` | 1,460 | electrical |
| `'Electrical Service'` | 790 | electrical |
| `'LYONS Sales '` | 714 | sales |
| `'Tyler Sales Dept.'` | 140 | tyler |
| Commercial*, Service Install, etc. | ~924 | other (excluded) |

---

## 3. OPPORTUNITY STATUS VALUES

```javascript
const OPPORTUNITY_STATUSES = {
  WON: 'Won',           // 21,248 estimates
  NOT_ATTEMPTED: 'Not Attempted',  // 25,197 estimates
  UNREACHABLE: 'Unreachable',      // 2,535 estimates
  DISMISSED: 'Dismissed',          // 2,005 estimates
  CONTACTED: 'Contacted'           // 130 estimates
};
```

**An opportunity is WON when `Opportunity Status === 'Won'`**

---

## 4. ESTIMATE STATUS VALUES

```javascript
const ESTIMATE_STATUSES = {
  OPEN: 'Open',         // 41,757 estimates
  SOLD: 'Sold',         // 9,136 estimates
  DISMISSED: 'Dismissed' // 222 estimates
};
```

**The SOLD estimate is the one the customer chose** (used for tier selection analysis).

---

## 5. CORE CALCULATION: GROUPING BY OPPORTUNITY

**CRITICAL CONCEPT**: Multiple estimates belong to ONE opportunity. Always group first.

```javascript
function groupByOpportunity(estimates) {
  const opportunities = {};
  
  for (const estimate of estimates) {
    const oppNum = estimate['Opportunity Number'];
    
    // Skip if no opportunity number
    if (!oppNum) continue;
    
    if (!opportunities[oppNum]) {
      opportunities[oppNum] = [];
    }
    opportunities[oppNum].push(estimate);
  }
  
  return opportunities;
}
```

**Example**:
```
Opportunity #12345 contains:
  - Estimate A: $1,200
  - Estimate B: $2,500
  - Estimate C: $8,500

This is 1 opportunity with 3 estimates (3 pricing options).
```

---

## 6. KPI CALCULATIONS

### 6.1 Total Opportunities

```javascript
function calculateTotalOpportunities(estimates) {
  const opportunities = groupByOpportunity(estimates);
  return Object.keys(opportunities).length;
}
```

### 6.2 Won Opportunities

```javascript
function calculateWonOpportunities(estimates) {
  const opportunities = groupByOpportunity(estimates);
  
  let wonCount = 0;
  for (const oppNum in opportunities) {
    // Check the first estimate's Opportunity Status (all estimates in an opportunity have the same status)
    const status = opportunities[oppNum][0]['Opportunity Status'];
    if (status === 'Won') {
      wonCount++;
    }
  }
  
  return wonCount;
}
```

### 6.3 Close Rate

```javascript
function calculateCloseRate(estimates) {
  const total = calculateTotalOpportunities(estimates);
  const won = calculateWonOpportunities(estimates);
  
  if (total === 0) return 0;
  
  const rate = (won / total) * 100;
  return Math.round(rate * 10) / 10; // Round to 1 decimal
}
```

### 6.4 Average Ticket

For each opportunity, calculate the MEAN of all its estimate values, then average those means.

```javascript
function calculateAvgTicket(estimates) {
  const opportunities = groupByOpportunity(estimates);
  
  const opportunityAverages = [];
  
  for (const oppNum in opportunities) {
    const oppEstimates = opportunities[oppNum];
    
    // Calculate mean of all estimates in this opportunity
    const sum = oppEstimates.reduce((total, est) => {
      return total + (parseFloat(est['Estimates Subtotal']) || 0);
    }, 0);
    
    const mean = sum / oppEstimates.length;
    opportunityAverages.push(mean);
  }
  
  // Average of all opportunity averages
  const totalAvg = opportunityAverages.reduce((a, b) => a + b, 0) / opportunityAverages.length;
  
  return Math.round(totalAvg);
}
```

### 6.5 Average Options per Opportunity

```javascript
function calculateAvgOptions(estimates) {
  const opportunities = groupByOpportunity(estimates);
  const totalOpps = Object.keys(opportunities).length;
  const totalEstimates = estimates.length;
  
  if (totalOpps === 0) return 0;
  
  const avg = totalEstimates / totalOpps;
  return Math.round(avg * 10) / 10; // Round to 1 decimal
}
```

---

## 7. REALISTIC UNSOLD REVENUE CALCULATION

### 7.1 Department-Specific Multipliers

| Department | Multiplier | Reason |
|------------|------------|--------|
| Sales | 1.70 | Higher tier selection rates |
| Demand Calls | 1.70 | Urgent repairs, some upsells |
| Maintenance | 1.60 | Mostly pick lowest tier |
| Plumbing | 1.65 | Average of service depts |
| Electrical | 1.65 | Average of service depts |
| Tyler | 1.65 | Average of service depts |

### 7.2 Calculation Method

For UNSOLD opportunities only, sum the MINIMUM estimate and multiply by department multiplier.

```javascript
function calculateRealisticUnsold(estimates, department) {
  const opportunities = groupByOpportunity(estimates);
  
  const multipliers = {
    sales: 1.70,
    demand: 1.70,
    maintenance: 1.60,
    plumbing: 1.65,
    electrical: 1.65,
    tyler: 1.65
  };
  
  const multiplier = multipliers[department] || 1.65;
  
  let minSum = 0;
  
  for (const oppNum in opportunities) {
    const oppEstimates = opportunities[oppNum];
    const status = oppEstimates[0]['Opportunity Status'];
    
    // Only count UNSOLD opportunities (not Won)
    if (status === 'Won') continue;
    
    // Find minimum estimate value
    const minEstimate = Math.min(...oppEstimates.map(est => 
      parseFloat(est['Estimates Subtotal']) || 0
    ));
    
    minSum += minEstimate;
  }
  
  return Math.round(minSum * multiplier);
}
```

### 7.3 For "All Departments" Combined

Apply each department's multiplier separately, then sum:

```javascript
function calculateRealisticUnsoldAllDepts(allEstimates) {
  const departments = ['sales', 'demand', 'maintenance', 'plumbing', 'electrical', 'tyler'];
  
  let total = 0;
  
  for (const dept of departments) {
    // Filter estimates to this department
    const deptEstimates = allEstimates.filter(est => 
      getDepartment(est['Business Unit']) === dept
    );
    
    total += calculateRealisticUnsold(deptEstimates, dept);
  }
  
  return total;
}
```

---

## 8. TIER SELECTION ANALYSIS

Analyze which pricing tier customers choose when they have multiple options.

### 8.1 Algorithm

```javascript
function calculateTierSelection(estimates) {
  const opportunities = groupByOpportunity(estimates);
  
  const tierCounts = { low: 0, mid: 0, high: 0 };
  let multiOptionWins = 0;
  
  for (const oppNum in opportunities) {
    const oppEstimates = opportunities[oppNum];
    
    // Only analyze WON opportunities
    if (oppEstimates[0]['Opportunity Status'] !== 'Won') continue;
    
    // Only analyze multi-option opportunities
    if (oppEstimates.length <= 1) continue;
    
    // Sort by price ascending
    const sorted = [...oppEstimates].sort((a, b) => 
      parseFloat(a['Estimates Subtotal']) - parseFloat(b['Estimates Subtotal'])
    );
    
    // Find the SOLD estimate
    const soldEstimate = sorted.find(est => est['Estimate Status'] === 'Sold');
    if (!soldEstimate) continue;
    
    const soldAmount = parseFloat(soldEstimate['Estimates Subtotal']);
    
    // Skip if minimum is 0 or negative
    if (parseFloat(sorted[0]['Estimates Subtotal']) <= 0) continue;
    
    // Find rank of sold estimate (1 = cheapest)
    const rank = sorted.findIndex(est => 
      parseFloat(est['Estimates Subtotal']) === soldAmount
    ) + 1;
    
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
  
  // Calculate percentages
  if (multiOptionWins === 0) {
    return { low: 0, mid: 0, high: 0 };
  }
  
  return {
    low: Math.round((tierCounts.low / multiOptionWins) * 1000) / 10,
    mid: Math.round((tierCounts.mid / multiOptionWins) * 1000) / 10,
    high: Math.round((tierCounts.high / multiOptionWins) * 1000) / 10
  };
}
```

---

## 9. TIME TO CLOSE ANALYSIS

Calculate how many days between Creation Date and Sold On date.

```javascript
function calculateTimeToClose(estimates) {
  const opportunities = groupByOpportunity(estimates);
  
  const buckets = { sameDay: 0, within7: 0, beyond7: 0 };
  let validCount = 0;
  
  for (const oppNum in opportunities) {
    const oppEstimates = opportunities[oppNum];
    
    // Only analyze WON opportunities
    if (oppEstimates[0]['Opportunity Status'] !== 'Won') continue;
    
    const creationDate = new Date(oppEstimates[0]['Creation Date']);
    const soldOnDate = new Date(oppEstimates[0]['Sold On']);
    
    // Skip invalid dates
    if (isNaN(creationDate.getTime()) || isNaN(soldOnDate.getTime())) continue;
    
    // Calculate days difference
    const diffTime = soldOnDate.getTime() - creationDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Skip invalid ranges (negative or > 365)
    if (diffDays < 0 || diffDays > 365) continue;
    
    validCount++;
    
    if (diffDays === 0) {
      buckets.sameDay++;
    } else if (diffDays <= 7) {
      buckets.within7++;
    } else {
      buckets.beyond7++;
    }
  }
  
  if (validCount === 0) {
    return { sameDay: 0, within7: 0, beyond7: 0 };
  }
  
  return {
    sameDay: Math.round((buckets.sameDay / validCount) * 1000) / 10,
    within7: Math.round((buckets.within7 / validCount) * 1000) / 10,
    beyond7: Math.round((buckets.beyond7 / validCount) * 1000) / 10
  };
}
```

---

## 10. SEASONALITY ANALYSIS

Group by month and calculate metrics.

```javascript
function calculateSeasonality(estimates) {
  const opportunities = groupByOpportunity(estimates);
  
  // Group opportunities by month
  const byMonth = {};
  
  for (const oppNum in opportunities) {
    const oppEstimates = opportunities[oppNum];
    const creationDate = new Date(oppEstimates[0]['Creation Date']);
    
    if (isNaN(creationDate.getTime())) continue;
    
    const month = creationDate.getMonth() + 1; // 1-12
    
    if (!byMonth[month]) {
      byMonth[month] = { opps: 0, won: 0, totalValue: 0 };
    }
    
    byMonth[month].opps++;
    
    if (oppEstimates[0]['Opportunity Status'] === 'Won') {
      byMonth[month].won++;
    }
    
    // Calculate mean estimate for this opportunity
    const sum = oppEstimates.reduce((total, est) => 
      total + (parseFloat(est['Estimates Subtotal']) || 0), 0
    );
    byMonth[month].totalValue += sum / oppEstimates.length;
  }
  
  // Convert to array with calculated metrics
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const result = [];
  for (let m = 1; m <= 12; m++) {
    const data = byMonth[m] || { opps: 0, won: 0, totalValue: 0 };
    result.push({
      month: monthNames[m],
      opps: data.opps,
      won: data.won,
      closeRate: data.opps > 0 ? Math.round((data.won / data.opps) * 1000) / 10 : 0,
      avgTicket: data.opps > 0 ? Math.round(data.totalValue / data.opps) : 0
    });
  }
  
  return result;
}
```

---

## 11. EXPECTED OUTPUT VALUES (for validation)

### 11.1 All Departments Combined

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 16,274 |
| Won | 7,071 |
| Close Rate | 43.4% |
| Avg Ticket | $3,335 |
| Avg Options/Opp | 3.1 |
| Realistic Unsold Revenue | $28,160,408 |
| Tier Selection - Low | 60.8% |
| Tier Selection - Mid | 23.6% |
| Tier Selection - High | 15.6% |
| Time to Close - Same Day | 90.3% |
| Time to Close - 1-7 Days | 5.8% |
| Time to Close - 8+ Days | 3.9% |

### 11.2 Sales Department

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 1,272 |
| Won | 727 |
| Close Rate | 57.2% |
| Avg Ticket | $15,385 |
| Avg Options/Opp | 2.7 |
| Realistic Unsold Revenue | $10,679,194 |
| Tier Selection - Low | 43.8% |
| Tier Selection - Mid | 35.3% |
| Tier Selection - High | 20.9% |
| Time to Close - Same Day | 78.2% |
| Time to Close - 1-7 Days | 16.1% |
| Time to Close - 8+ Days | 5.8% |

### 11.3 Demand Calls (Service Residential)

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 3,737 |
| Won | 2,237 |
| Close Rate | 59.9% |
| Avg Ticket | $2,050 |
| Avg Options/Opp | 2.5 |
| Realistic Unsold Revenue | $3,336,185 |
| Tier Selection - Low | 63.0% |
| Tier Selection - Mid | 18.4% |
| Tier Selection - High | 18.7% |
| Time to Close - Same Day | 93.0% |
| Time to Close - 1-7 Days | 5.0% |
| Time to Close - 8+ Days | 2.0% |

### 11.4 Maintenance (Cool Club)

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 6,876 |
| Won | 1,836 |
| Close Rate | 26.7% |
| Avg Ticket | $2,616 |
| Avg Options/Opp | 3.3 |
| Realistic Unsold Revenue | $9,589,297 |
| Tier Selection - Low | 66.4% |
| Tier Selection - Mid | 24.4% |
| Tier Selection - High | 9.3% |
| Time to Close - Same Day | 90.2% |
| Time to Close - 1-7 Days | 4.7% |
| Time to Close - 8+ Days | 5.2% |

### 11.5 Plumbing

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 2,194 |
| Won | 1,274 |
| Close Rate | 58.1% |
| Avg Ticket | $1,918 |
| Avg Options/Opp | 3.9 |
| Realistic Unsold Revenue | $1,241,699 |
| Tier Selection - Low | 58.2% |
| Tier Selection - Mid | 27.7% |
| Tier Selection - High | 14.1% |
| Time to Close - Same Day | 93.0% |
| Time to Close - 1-7 Days | 3.0% |
| Time to Close - 8+ Days | 4.0% |

### 11.6 Electrical

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 745 |
| Won | 325 |
| Close Rate | 43.6% |
| Avg Ticket | $2,149 |
| Avg Options/Opp | 3.0 |
| Realistic Unsold Revenue | $1,027,096 |
| Tier Selection - Low | 57.3% |
| Tier Selection - Mid | 22.5% |
| Tier Selection - High | 20.2% |
| Time to Close - Same Day | 93.6% |
| Time to Close - 1-7 Days | 2.2% |
| Time to Close - 8+ Days | 4.2% |

### 11.7 Tyler

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 1,453 |
| Won | 675 |
| Close Rate | 46.5% |
| Avg Ticket | $2,239 |
| Avg Options/Opp | 2.6 |
| Realistic Unsold Revenue | $2,286,936 |
| Tier Selection - Low | 58.7% |
| Tier Selection - Mid | 17.8% |
| Tier Selection - High | 23.5% |
| Time to Close - Same Day | 88.4% |
| Time to Close - 1-7 Days | 7.5% |
| Time to Close - 8+ Days | 4.1% |

---

## 12. SEASONALITY EXPECTED VALUES (All Departments)

| Month | Opps | Won | Close Rate | Avg Ticket |
|-------|------|-----|------------|------------|
| Jan | 1,297 | 410 | 31.6% | $3,417 |
| Feb | 983 | 391 | 39.8% | $2,948 |
| Mar | 1,337 | 598 | 44.7% | $2,875 |
| Apr | 1,501 | 667 | 44.4% | $2,841 |
| May | 1,335 | 610 | 45.7% | $3,065 |
| Jun | 1,413 | 724 | 51.2% | $3,275 |
| Jul | 1,430 | 754 | 52.7% | $3,416 |
| Aug | 1,415 | 726 | 51.3% | $3,356 |
| Sep | 1,362 | 632 | 46.4% | $3,815 |
| Oct | 1,575 | 620 | 39.4% | $3,418 |
| Nov | 1,228 | 455 | 37.1% | $3,746 |
| Dec | 1,398 | 484 | 34.6% | $3,796 |

---

## 13. COMMON MISTAKES TO AVOID

1. **Not trimming Business Unit values** - Many have trailing spaces
2. **Counting estimates instead of opportunities** - Always group by Opportunity Number first
3. **Using wrong status field** - `Opportunity Status` for win/loss, `Estimate Status` for finding sold option
4. **Not filtering by department before calculating** - Each department needs its own multiplier
5. **Using MEAN instead of MIN × multiplier** - MEAN overstates service departments by 100%+
6. **Including 'other' departments in totals** - Exclude Commercial, Service Install, etc.

---

## 14. COMPLETE IMPLEMENTATION FUNCTION

```javascript
function calculateDepartmentMetrics(allEstimates, department) {
  // Filter to department (or all main departments)
  let filteredEstimates;
  
  if (department === 'all') {
    const mainDepts = ['sales', 'demand', 'maintenance', 'plumbing', 'electrical', 'tyler'];
    filteredEstimates = allEstimates.filter(est => 
      mainDepts.includes(getDepartment(est['Business Unit']))
    );
  } else {
    filteredEstimates = allEstimates.filter(est => 
      getDepartment(est['Business Unit']) === department
    );
  }
  
  // Calculate all metrics
  const totalOpportunities = calculateTotalOpportunities(filteredEstimates);
  const won = calculateWonOpportunities(filteredEstimates);
  const closeRate = calculateCloseRate(filteredEstimates);
  const avgTicket = calculateAvgTicket(filteredEstimates);
  const avgOptions = calculateAvgOptions(filteredEstimates);
  
  const realisticUnsold = department === 'all' 
    ? calculateRealisticUnsoldAllDepts(filteredEstimates)
    : calculateRealisticUnsold(filteredEstimates, department);
  
  const tierSelection = calculateTierSelection(filteredEstimates);
  const timeToClose = calculateTimeToClose(filteredEstimates);
  const seasonality = calculateSeasonality(filteredEstimates);
  
  return {
    totalOpportunities,
    won,
    closeRate,
    avgTicket,
    avgOptions,
    realisticUnsold,
    tierSelection,
    timeToClose,
    seasonality
  };
}
```

---

## 15. TESTING CHECKLIST

Run these checks to validate your implementation:

- [ ] Sales Total Opportunities = 1,272
- [ ] Sales Won = 727
- [ ] Sales Close Rate = 57.2%
- [ ] Demand Total Opportunities = 3,737
- [ ] Maintenance Total Opportunities = 6,876
- [ ] Maintenance Close Rate = 26.7%
- [ ] All Departments Total = 16,274
- [ ] All Departments Close Rate = 43.4%
- [ ] Sales Tier Low = 43.8%
- [ ] Maintenance Tier Low = 66.4%
- [ ] Sales Same Day Close = 78.2%
- [ ] Demand Same Day Close = 93.0%

If any of these don't match, check:
1. Business Unit trimming
2. Opportunity grouping
3. Status field usage
4. Department filtering
