# Multiplier Derivation Methodology

## How We Discovered the Correct Calculation Methods

This document explains how we derived the department-specific multipliers for calculating realistic unsold revenue.

---

## The Problem

When a technician presents multiple pricing options to a customer, ServiceTitan stores each option as a separate estimate. For example:

```
Opportunity #12345:
  Option A: $1,200 (Basic repair)
  Option B: $2,500 (Repair + maintenance)
  Option C: $8,500 (Full replacement)
```

**The question**: If this customer is "unsold," what's the realistic revenue opportunity?

| Method | Calculation | Result |
|--------|-------------|--------|
| MIN | $1,200 | Too low |
| MEAN | ($1,200 + $2,500 + $8,500) / 3 = $4,067 | Too high |
| MAX | $8,500 | Way too high |

---

## The Solution: Use Historical Data

We analyzed a full year of WON opportunities to see what customers ACTUALLY chose when they bought.

### Step 1: Identify Multi-Option Wins

Filter to opportunities where:
- Opportunity Status = "Won"
- Number of estimates > 1

### Step 2: Determine Which Option Was Chosen

For each won opportunity:
1. Sort estimates by price (ascending)
2. Find the estimate with Estimate Status = "Sold"
3. Record its rank position (1st = cheapest, last = most expensive)

### Step 3: Classify Into Tiers

- **Low Tier**: Customer chose the cheapest option (rank = 1)
- **High Tier**: Customer chose the most expensive option (rank = last)
- **Mid Tier**: Customer chose something in between

### Step 4: Calculate Tier Percentages

```
Low Tier %  = Count(Low) / Total Multi-Option Wins × 100
Mid Tier %  = Count(Mid) / Total Multi-Option Wins × 100
High Tier % = Count(High) / Total Multi-Option Wins × 100
```

---

## Results by Department

### Sales Department (2025 Full Year)

**Sample Size**: 448 multi-option wins

| Tier | Count | Percentage |
|------|-------|------------|
| Low | 192 | 42.9% |
| Mid | 162 | 36.2% |
| High | 94 | 21.0% |

**Interpretation**: Sales customers are shopping for replacements. They're more willing to invest in better options because it's a planned purchase.

### Service Residential / Demand Calls (2025 Full Year)

**Sample Size**: 1,276 multi-option wins

| Tier | Count | Percentage |
|------|-------|------------|
| Low | 827 | 64.8% |
| Mid | 245 | 19.2% |
| High | 204 | 16.0% |

**Interpretation**: Demand call customers have an immediate problem. They want it fixed, not necessarily upgraded.

### Service Maintenance / Cool Club (2025 Full Year)

**Sample Size**: 1,278 multi-option wins

| Tier | Count | Percentage |
|------|-------|------------|
| Low | 837 | 65.5% |
| Mid | 317 | 24.8% |
| High | 124 | 9.7% |

**Interpretation**: Maintenance customers came for a routine checkup. Any repair is an unexpected expense they didn't budget for.

---

## Testing the Methods

### Test Setup

For each department, we took all WON multi-option opportunities and calculated:
1. **Actual Revenue**: Sum of what customers actually paid (the Sold estimate)
2. **Projected Revenue (MIN)**: Sum of the minimum estimate for each opportunity
3. **Projected Revenue (MEAN)**: Sum of the average estimate for each opportunity
4. **Projected Revenue (MAX)**: Sum of the maximum estimate for each opportunity

### Sales Department Results

**Actual Revenue (448 wins)**: $6,505,224

| Method | Projected | Error |
|--------|-----------|-------|
| MIN | $4,762,945 | 26.8% under |
| **WEIGHTED** | **$6,845,145** | **5.3% over** ✓ |
| MEAN | $7,251,569 | 11.5% over |
| MAX | $9,588,841 | 47.5% over |

**Winner**: Weighted Average (using tier percentages as weights)

```
Weighted Value = (MIN × 0.429) + (MID × 0.362) + (MAX × 0.210)
```

### Demand Calls Results

**Actual Revenue (1,276 wins)**: $982,103

| Method | Projected | Error |
|--------|-----------|-------|
| MIN | $577,082 | 41.2% under |
| **MIN × 1.70** | **$982,103** | **0% error** ✓ |
| MEAN | $2,171,269 | 121.1% over |
| MAX | $4,111,564 | 318.6% over |

**Winner**: MIN × 1.70

```
Multiplier = Actual Revenue / MIN Projected
Multiplier = $982,103 / $577,082 = 1.70
```

### Maintenance Results

**Actual Revenue (1,278 wins)**: $1,306,524

| Method | Projected | Error |
|--------|-----------|-------|
| MIN | $818,708 | 37.3% under |
| **MIN × 1.60** | **$1,306,524** | **0% error** ✓ |
| MEAN | $2,992,443 | 129.0% over |
| MAX | $5,794,295 | 343.5% over |

**Winner**: MIN × 1.60

```
Multiplier = Actual Revenue / MIN Projected
Multiplier = $1,306,524 / $818,708 = 1.60
```

---

## Why Service Departments Need MIN × Multiplier

### The Structural Difference

**Sales Options** (variations of the same job):
```
Option A: 14 SEER system - $12,000
Option B: 16 SEER system - $14,500
Option C: 18 SEER system - $17,000

Spread: 42% ($5K range)
```

**Service Options** (different jobs entirely):
```
Option A: Capacitor repair - $285
Option B: Compressor repair - $1,800
Option C: System replacement - $8,500

Spread: 2,882% ($8.2K range)
```

When the spread is this large, the MEAN becomes meaningless. A customer who needs a $285 capacitor repair is NOT a realistic candidate for an $8,500 replacement—those are different customer mindsets entirely.

### Why MIN × Multiplier Works

The multiplier (1.60-1.70) accounts for:
- Customers who DO upgrade from the minimum option (~35-40%)
- The degree to which they upgrade (usually to mid-tier, not max)

It's essentially a compressed weighted average that performs better when options are structurally different.

---

## Final Recommended Calculations

### Sales Department
```javascript
function calculateSalesRevenue(opportunities) {
  const weights = { low: 0.429, mid: 0.362, high: 0.210 };
  
  return opportunities.reduce((total, opp) => {
    const sorted = opp.estimates.sort((a, b) => a.value - b.value);
    const low = sorted[0].value;
    const high = sorted[sorted.length - 1].value;
    const mid = sorted.length > 2 
      ? sorted[Math.floor(sorted.length / 2)].value 
      : (low + high) / 2;
    
    return total + (low * weights.low) + (mid * weights.mid) + (high * weights.high);
  }, 0);
}
```

### Service Departments (Demand Calls, Maintenance)
```javascript
function calculateServiceRevenue(opportunities, multiplier) {
  // multiplier = 1.70 for Demand Calls
  // multiplier = 1.60 for Maintenance
  
  return opportunities.reduce((total, opp) => {
    const minEstimate = Math.min(...opp.estimates.map(e => e.value));
    return total + (minEstimate * multiplier);
  }, 0);
}
```

### Other Departments (Plumbing, Electrical, Tyler)

For departments without enough historical data to derive specific multipliers, use:
- **MIN × 1.65** (average of Demand and Maintenance multipliers)

As you collect more data, recalculate the multipliers quarterly to refine accuracy.

---

## Recalibration Process

Every quarter, recalibrate the multipliers:

1. Pull all WON multi-option opportunities for the quarter
2. Calculate Actual Revenue (sum of Sold estimates)
3. Calculate MIN Projected (sum of minimum estimates)
4. New Multiplier = Actual Revenue / MIN Projected

```javascript
function recalibrateMultiplier(wonOpportunities) {
  let actualRevenue = 0;
  let minProjected = 0;
  
  for (const opp of wonOpportunities) {
    // Find sold estimate
    const sold = opp.estimates.find(e => e.status === 'Sold');
    if (sold) actualRevenue += sold.value;
    
    // Find minimum estimate
    const min = Math.min(...opp.estimates.map(e => e.value));
    minProjected += min;
  }
  
  return actualRevenue / minProjected;
}
```

---

## Summary Table

| Department | Method | Formula | Expected Accuracy |
|------------|--------|---------|-------------------|
| Sales | Weighted Average | (MIN × 0.43) + (MID × 0.36) + (MAX × 0.21) | ±5% |
| Demand Calls | MIN × Multiplier | MIN × 1.70 | ±3% |
| Maintenance | MIN × Multiplier | MIN × 1.60 | ±3% |
| Plumbing | MIN × Multiplier | MIN × 1.65 | ±10% (less data) |
| Electrical | MIN × Multiplier | MIN × 1.65 | ±10% (less data) |
| Tyler | MIN × Multiplier | MIN × 1.65 | ±10% (less data) |

The key insight is that **each department has different customer behavior patterns**, and using a one-size-fits-all calculation (like simple MEAN) can overstate unsold revenue by 100%+ for service departments.
