"""
Competition-specific ServiceTitan integration
Fetches UV Light sales data for competitions
"""

import requests
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class CompetitionServiceTitanAPI:
    """ServiceTitan API specifically for competition data"""

    def __init__(self):
        self.tenant_id = os.getenv('SERVICETITAN_TENANT_ID')
        self.client_id = os.getenv('SERVICETITAN_CLIENT_ID')
        self.client_secret = os.getenv('SERVICETITAN_CLIENT_SECRET')
        self.base_url = "https://api.servicetitan.io"
        self.api_version = "v2"
        self.access_token = None
        self.token_expiry = None

        # Report configuration
        self.uv_light_report_id = "394027220"  # Marketing category
        self.uv_light_sku = "MUV-7-50DR-12"

    def get_access_token(self) -> str:
        """Get OAuth access token for ServiceTitan API"""

        # Check if we have a valid token
        if self.access_token and self.token_expiry and datetime.now() < self.token_expiry:
            return self.access_token

        # Get new token
        token_url = "https://auth.servicetitan.io/connect/token"

        payload = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        response = requests.post(token_url, data=payload, headers=headers)
        response.raise_for_status()

        token_data = response.json()
        self.access_token = token_data['access_token']

        # Set expiry time (subtract 5 minutes for safety)
        expires_in = token_data.get('expires_in', 3600)
        self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 300)

        return self.access_token

    def get_uv_light_sales(self, from_date: str, to_date: str) -> Dict[str, int]:
        """
        Get UV light sales by technician

        Report: 394027220 (Marketing category)
        Fields in order:
        1. Invoice date
        2. Item code
        3. Item quantity
        4. Sold by technician
        5. Invoice number
        6. Job business unit
        7. Job type

        Args:
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            Dict mapping technician name to UV light count
        """

        token = self.get_access_token()

        # Build report URL based on your example
        # https://go.servicetitan.com/#/new/reports/394027220?DateType=0&From=2025-11-01&To=2025-11-13&AggregatesOnly=false&TimeZone=America%2FChicago

        # ServiceTitan API endpoint for report data
        url = f"{self.base_url}/{self.api_version}/tenant/{self.tenant_id}/report-service/reports/{self.uv_light_report_id}/data"

        params = {
            'DateType': 0,
            'From': from_date,
            'To': to_date,
            'AggregatesOnly': 'false',
            'TimeZone': 'America/Chicago'
        }

        headers = {
            'Authorization': f'Bearer {token}',
            'ST-App-Key': self.client_id,
            'Content-Type': 'application/json'
        }

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        data = response.json()

        # Aggregate by technician
        tech_sales = {}

        # Parse report data
        # The response structure might be:
        # {
        #   "data": [ ... rows ... ],
        #   "columns": [ ... column definitions ... ]
        # }
        # OR
        # { "rows": [ ... ] }
        # OR
        # Just an array [ ... ]

        rows = data.get('data') or data.get('rows') or data

        if not isinstance(rows, list):
            print(f"Unexpected data structure: {data}")
            return {}

        for row in rows:
            # Handle different response formats
            # Could be dict with keys or array of values

            if isinstance(row, dict):
                # Dict format - try different field name variations
                item_code = (
                    row.get('itemCode') or
                    row.get('item_code') or
                    row.get('ItemCode') or
                    row.get('Item Code')
                )

                tech_name = (
                    row.get('soldByTechnician') or
                    row.get('sold_by_technician') or
                    row.get('SoldByTechnician') or
                    row.get('Sold By Technician')
                )

                quantity = (
                    row.get('itemQuantity') or
                    row.get('item_quantity') or
                    row.get('ItemQuantity') or
                    row.get('Item Quantity') or
                    0
                )

            elif isinstance(row, list):
                # Array format - based on field order you provided
                # [Invoice date, item code, item quantity, sold by technician, ...]
                if len(row) >= 4:
                    item_code = row[1]    # Item code
                    quantity = row[2]     # Item quantity
                    tech_name = row[3]    # Sold by technician
                else:
                    continue

            else:
                print(f"Unexpected row format: {row}")
                continue

            # Filter for UV light SKU and aggregate
            if item_code == self.uv_light_sku and tech_name:
                if tech_name not in tech_sales:
                    tech_sales[tech_name] = 0
                tech_sales[tech_name] += int(quantity)

        return tech_sales


# Quick test function
def test_uv_lights():
    """Test UV light data fetching"""
    api = CompetitionServiceTitanAPI()

    try:
        print("Testing UV Light sales fetch...")
        print(f"Report ID: {api.uv_light_report_id}")
        print(f"SKU Filter: {api.uv_light_sku}")
        print()

        from_date = "2025-11-01"
        to_date = "2025-11-13"

        print(f"Date range: {from_date} to {to_date}")
        print()

        sales = api.get_uv_light_sales(from_date, to_date)

        print("Results:")
        print(f"Total technicians: {len(sales)}")
        print(f"Total UV lights sold: {sum(sales.values())}")
        print()

        if sales:
            print("By technician:")
            for tech, count in sorted(sales.items(), key=lambda x: x[1], reverse=True):
                print(f"  {tech}: {count}")
        else:
            print("No sales found")

        return sales

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    test_uv_lights()
