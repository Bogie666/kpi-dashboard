#!/usr/bin/env python3
"""
Test script to demonstrate the revenue rounding fix
Shows the difference between the old (truncating) and new (rounding) approach
"""

def old_method(dollar_value):
    """Old method using safe_int which truncates"""
    return int(float(dollar_value) * 100)

def new_method(dollar_value):
    """New method using round()"""
    return round(float(dollar_value) * 100)

def old_cents_to_dollars(cents):
    """Old method using integer division"""
    return cents // 100

def new_cents_to_dollars(cents):
    """New method using round division"""
    return round(cents / 100)

# Test cases with realistic revenue values
test_values = [
    1234.567,    # $1,234.567
    9999.999,    # $9,999.999
    50000.125,   # $50,000.125
    123456.789,  # $123,456.789
    2500.504,    # $2,500.504
]

print("=" * 80)
print("REVENUE ROUNDING FIX DEMONSTRATION")
print("=" * 80)
print()

print("1. Dollar to Cents Conversion (during sync from ServiceTitan)")
print("-" * 80)
print(f"{'Value ($)':>15} | {'Old (truncate)':>18} | {'New (round)':>18} | {'Difference':>12}")
print("-" * 80)

total_old = 0
total_new = 0

for value in test_values:
    old = old_method(value)
    new = new_method(value)
    diff = new - old
    total_old += old
    total_new += new
    print(f"${value:>13,.3f} | {old:>13,} cents | {new:>13,} cents | {diff:>7,} cents")

print("-" * 80)
print(f"{'TOTAL:':>15} | {total_old:>13,} cents | {total_new:>13,} cents | {total_new - total_old:>7,} cents")
print(f"{'':>15} | ${total_old/100:>11,.2f} | ${total_new/100:>11,.2f} | ${(total_new - total_old)/100:>9,.2f}")
print()

print("2. Cents to Dollars Conversion (during API display)")
print("-" * 80)
print(f"{'Value (cents)':>15} | {'Old (truncate)':>18} | {'New (round)':>18} | {'Difference':>12}")
print("-" * 80)

# Test with cents values
cents_values = [123456789, 987654321, 555555555, 100000001, 999999999]

total_old_dollars = 0
total_new_dollars = 0

for cents in cents_values:
    old = old_cents_to_dollars(cents)
    new = new_cents_to_dollars(cents)
    diff = new - old
    total_old_dollars += old
    total_new_dollars += new
    print(f"{cents:>14,} | ${old:>14,} | ${new:>14,} | ${diff:>10,}")

print("-" * 80)
print(f"{'TOTAL:':>15} | ${total_old_dollars:>14,} | ${total_new_dollars:>14,} | ${total_new_dollars - total_old_dollars:>10,}")
print()

print("=" * 80)
print("SUMMARY")
print("=" * 80)
print()
print("The old method (using int() and //) TRUNCATES decimals:")
print("  - Example: 1234.567 * 100 = 123456.7 → int() → 123456 (loses 0.7 cents)")
print("  - Example: 123456789 cents // 100 → $1,234,567 (loses 89 cents)")
print()
print("The new method (using round()) ROUNDS to nearest integer:")
print("  - Example: 1234.567 * 100 = 123456.7 → round() → 123457 (accurate)")
print("  - Example: 123456789 cents / 100 = 1234567.89 → round() → $1,234,568 (accurate)")
print()
print("Impact: With hundreds of records per month, the old method accumulated")
print("        significant discrepancies (hundreds to thousands of dollars).")
print()
print("=" * 80)
