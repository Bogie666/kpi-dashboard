# Build: Unsold Estimate Report Processor

## Feature Overview
Add a tool to the KPI dashboard where users can upload a ServiceTitan unsold estimate Excel file and download a processed CSV with one row per opportunity (averaging multiple estimate options per customer).

## UI Requirements
- File upload input accepting .xlsx files
- Process button
- Download link for the resulting CSV
- Display summary stats after processing: total opportunities, total realistic revenue

## Input File Columns (21 total)

| # | Column Name | Notes |
|---|-------------|-------|
| 1 | Estimate Id | |
| 2 | Parent Job Number | |
| 3 | Opportunity Number | **Grouping key** |
| 4 | Customer Name | |
| 5 | Location Phone | |
| 6 | Customer Email | |
| 7 | Business Unit | |
| 8 | Opportunity Status | |
| 9 | Sold On | |
| 10 | Install Job(s) | |
| 11 | Estimates Subtotal | **Calculate average per group** |
| 12 | Estimate Sales Installed | |
| 13 | Estimate Age (Days) | |
| 14 | Follow Up Date | |
| 15 | Number of Follow Ups | |
| 16 | Last Follow Up Date | |
| 17 | Estimate Status | |
| 18 | Recommended | |
| 19 | Sold By | |
| 20 | Creation Date | |
| 21 | Estimate Created By | |

## Processing Logic

Input file has multiple rows per customer (different pricing options). The "Opportunity Number" column (3) is the unique identifier that groups estimate options together.

For each unique Opportunity Number:

1. Calculate the average of "Estimates Subtotal" (column 11)
2. Count the number of rows (estimate options)
3. Pull these fields from the first row in the group (they're identical across the group):
   - Customer Name (column 4)
   - Location Phone (column 5)
   - Customer Email (column 6)
   - Business Unit (column 7)
   - Estimate Created By (column 21)
   - Creation Date (column 20)
   - Follow Up Date (column 14)
   - Number of Follow Ups (column 15)
   - Estimate Age (Days) (column 13)

## Output CSV Columns

| # | Column Name | Source |
|---|-------------|--------|
| 1 | Opportunity Number | Group key |
| 2 | Customer Name | First row in group |
| 3 | Location Phone | First row in group |
| 4 | Customer Email | First row in group |
| 5 | Business Unit | First row in group |
| 6 | Average Estimate | Calculated (2 decimal places) |
| 7 | Number of Options | Count of rows in group |
| 8 | Estimate Created By | First row in group |
| 9 | Creation Date | First row in group |
| 10 | Follow Up Date | First row in group |
| 11 | Number of Follow Ups | First row in group |
| 12 | Estimate Age (Days) | First row in group |

## Sort Order
By Average Estimate descending (largest opportunities first)

## Summary Stats to Display
- Total Opportunities (row count)
- Total Realistic Revenue (sum of Average Estimate column)
