// src/app/api/google/locations/route.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.accessToken) {
      console.error('❌ No access token in session')
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        requiresAuth: true
      }, { status: 401 })
    }

    console.log('🔍 Fetching all Google Business Profile locations...')

    // Step 1: Get all accounts
    const accountsUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
    const accountsResponse = await fetch(accountsUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text()
      console.error('❌ Failed to fetch accounts:', errorText)
      return NextResponse.json({
        success: false,
        error: `Failed to fetch accounts: ${accountsResponse.status}`
      }, { status: accountsResponse.status })
    }

    const accountsData = await accountsResponse.json()
    console.log(`✅ Found ${accountsData.accounts?.length || 0} accounts`)

    const allLocations: Array<{
      accountId: string;
      locationId: string;
      title: string;
      storeCode: string | null;
      address: string | null;
      phoneNumber: string | null;
      websiteUri: string | null;
      accountName: string;
      fullLocationName: string;
    }> = []

    // Step 2: Get locations for each account
    if (accountsData.accounts) {
      for (const account of accountsData.accounts) {
        try {
          const accountName = account.name
          const accountId = accountName.split('/')[1]

          console.log(`📍 Fetching locations for account: ${account.accountName || accountId}`)

          const readMask = 'name,title,storeCode,websiteUri,phoneNumbers,storefrontAddress'
          const locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=${readMask}`

          const locationsResponse = await fetch(locationsUrl, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (locationsResponse.ok) {
            const locationsData = await locationsResponse.json()

            if (locationsData.locations) {
              const formattedLocations = locationsData.locations.map((location: {
                name?: string;
                title?: string;
                storeCode?: string;
                storefrontAddress?: Record<string, unknown>;
                phoneNumbers?: Array<string>;
                websiteUri?: string;
              }) => {
                const locationId = location.name ? location.name.split('/').pop() : 'unknown'

                return {
                  accountId,
                  locationId,
                  title: location.title || 'Unnamed Location',
                  storeCode: location.storeCode || null,
                  address: formatAddress(location.storefrontAddress),
                  phoneNumber: (location.phoneNumbers && location.phoneNumbers.length > 0) ? location.phoneNumbers[0] : null,
                  websiteUri: location.websiteUri || null,
                  accountName: account.accountName || 'Unknown Account',
                  fullLocationName: location.name
                }
              })

              allLocations.push(...formattedLocations)
              console.log(`✅ Added ${formattedLocations.length} locations from account ${accountId}`)
            }
          } else {
            console.error(`❌ Failed to fetch locations for account ${accountId}`)
          }
        } catch (error) {
          console.error(`💥 Error processing account:`, error)
        }
      }
    }

    console.log(`📊 Total locations found: ${allLocations.length}`)

    return NextResponse.json({
      success: true,
      locations: allLocations,
      totalCount: allLocations.length,
      message: `Found ${allLocations.length} business location${allLocations.length !== 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('💥 Error in locations API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to format address
function formatAddress(address: Record<string, unknown> | null | undefined): string | null {
  if (!address) return null

  const parts: string[] = []
  if (Array.isArray(address.addressLines)) parts.push(...address.addressLines as string[])
  if (typeof address.locality === 'string') parts.push(address.locality)
  if (typeof address.administrativeArea === 'string') parts.push(address.administrativeArea)
  if (typeof address.postalCode === 'string') parts.push(address.postalCode)

  return parts.length > 0 ? parts.join(', ') : null
}
