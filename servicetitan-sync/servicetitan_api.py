"""
ServiceTitan API Integration for Competition Tracking
Fetches UV Light sales and Sold Flips data
"""

import requests
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class ServiceTitanAPI:
    def __init__(self):
        self.tenant_id = os.getenv('SERVICETITAN_TENANT_ID')
        self.client_id = os.getenv('SERVICETITAN_CLIENT_ID')
        self.client_secret = os.getenv('SERVICETITAN_CLIENT_SECRET')
        self.base_url = "https://api.servicetitan.io"
        self.api_version = "v2"
        self.access_token = None
        self.token_expiry = None

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

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make authenticated request to ServiceTitan API"""

        token = self.get_access_token()

        url = f"{self.base_url}/{self.api_version}/{endpoint}"

        headers = {
            'Authorization': f'Bearer {token}',
            'ST-App-Key': self.client_id,
            'Content-Type': 'application/json'
        }

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        return response.json()

    def get_report_data(self, report_id: str, from_date: str, to_date: str,
                       date_type: int = 0, timezone: str = "America/Chicago") -> List[Dict]:
        """
        Get report data from ServiceTitan

        Args:
            report_id: ServiceTitan report ID (e.g., "394027220")
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            date_type: Date filter type (default: 0)
            timezone: Timezone for the report

        Returns:
            List of report rows
        """

        endpoint = f"tenant/{self.tenant_id}/report-service/reports/{report_id}/data"

        params = {
            'DateType': date_type,
            'From': from_date,
            'To': to_date,
            'AggregatesOnly': 'false',
            'TimeZone': timezone
        }

        return self._make_request(endpoint, params)

    def get_uv_light_sales(self, from_date: str, to_date: str,
                          sku: str = "MUV-7-50DR-12") -> Dict[str, int]:
        """
        Get UV light sales by technician for competition period

        Report ID: 394027220
        Fields: Invoice date, item code, item quantity, sold by technician,
                invoice number, job business unit, job type

        Args:
            from_date: Competition start date (YYYY-MM-DD)
            to_date: Competition end date (YYYY-MM-DD)
            sku: UV light part number (default: MUV-7-50DR-12)

        Returns:
            Dict mapping technician name to UV light count
            Example: {"Mike Johnson": 15, "Sarah Williams": 12, ...}
        """

        report_id = "394027220"

        try:
            report_data = self.get_report_data(report_id, from_date, to_date)

            # Aggregate by technician
            tech_sales = {}

            # Parse report data
            # Expected structure based on your fields:
            # [
            #   {
            #     "invoiceDate": "2025-11-05",
            #     "itemCode": "MUV-7-50DR-12",
            #     "itemQuantity": 2,
            #     "soldByTechnician": "Mike Johnson",
            #     "invoiceNumber": "INV-12345",
            #     "jobBusinessUnit": "HVAC",
            #     "jobType": "Service"
            #   },
            #   ...
            # ]

            if 'data' in report_data:
                rows = report_data['data']
            else:
                rows = report_data

            for row in rows:
                # Get field values - adjust field names based on actual API response
                item_code = row.get('itemCode') or row.get('item_code') or row.get('ItemCode')
                tech_name = row.get('soldByTechnician') or row.get('sold_by_technician') or row.get('SoldByTechnician')
                quantity = row.get('itemQuantity') or row.get('item_quantity') or row.get('ItemQuantity', 0)

                # Filter for UV light SKU
                if item_code == sku and tech_name:
                    if tech_name not in tech_sales:
                        tech_sales[tech_name] = 0
                    tech_sales[tech_name] += int(quantity)

            return tech_sales

        except Exception as e:
            print(f"Error fetching UV light sales: {e}")
            raise

    def get_sold_flips(self, from_date: str, to_date: str) -> Dict[str, int]:
        """
        Get sold flips by technician for competition period

        NOTE: This will be implemented once you provide the report ID and structure

        Args:
            from_date: Competition start date (YYYY-MM-DD)
            to_date: Competition end date (YYYY-MM-DD)

        Returns:
            Dict mapping technician name to sold flips count
            Example: {"Mike Johnson": 8, "Sarah Williams": 6, ...}
        """

        # TODO: Implement when report details are provided
        # Expected fields: technician name, opportunity/job status, conversion indicator

        raise NotImplementedError(
            "Sold Flips report not yet configured. "
            "Waiting for report ID and field structure."
        )

    def get_competition_data(self, from_date: str, to_date: str) -> Dict[str, Dict]:
        """
        Get all competition metrics for the specified period

        Args:
            from_date: Competition start date (YYYY-MM-DD)
            to_date: Competition end date (YYYY-MM-DD)

        Returns:
            Dict mapping technician name to their metrics
            Example: {
                "Mike Johnson": {
                    "uvLights": 15,
                    "soldFlips": 8,
                    "reviews": 0  # Reviews come from Google API
                },
                ...
            }
        """

        # Get UV light sales
        uv_sales = self.get_uv_light_sales(from_date, to_date)

        # Get sold flips (when implemented)
        try:
            sold_flips = self.get_sold_flips(from_date, to_date)
        except NotImplementedError:
            print("Sold flips not yet configured, using zeros")
            sold_flips = {}

        # Combine data
        all_techs = set(list(uv_sales.keys()) + list(sold_flips.keys()))

        competition_data = {}
        for tech in all_techs:
            competition_data[tech] = {
                'uvLights': uv_sales.get(tech, 0),
                'soldFlips': sold_flips.get(tech, 0),
                'reviews': 0  # Will be populated from Google API
            }

        return competition_data


# Singleton instance
_api_instance = None

def get_servicetitan_api() -> ServiceTitanAPI:
    """Get or create ServiceTitan API instance"""
    global _api_instance
    if _api_instance is None:
        _api_instance = ServiceTitanAPI()
    return _api_instance
