#!/usr/bin/env node

/**
 * Helper script to get a Google refresh token for server-side API access
 *
 * Run this script once to generate a refresh token, then add it to your
 * environment variables.
 *
 * Usage: node scripts/get-refresh-token.js
 */

const http = require('http');
const { URL } = require('url');

const CLIENT_ID = '258765065301-numjq7jbet6skklvv50e7jme6tt5ovne.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3456/callback';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage',
].join(' ');

console.log('🔐 Google Refresh Token Generator\n');

// Step 1: Generate authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', SCOPES);
authUrl.searchParams.append('access_type', 'offline');
authUrl.searchParams.append('prompt', 'consent');

console.log('📋 Step 1: Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\n🌐 Starting local server on http://localhost:3456...\n');

// Step 2: Start local server to receive callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error: No authorization code received</h1>');
      return;
    }

    try {
      // Exchange code for tokens
      console.log('✅ Authorization code received!');
      console.log('🔄 Exchanging code for refresh token...\n');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      // Success!
      console.log('✅ Success! Here is your refresh token:\n');
      console.log('━'.repeat(80));
      console.log(tokens.refresh_token);
      console.log('━'.repeat(80));
      console.log('\n📝 Add this to your environment variables:\n');
      console.log('Local (.env.local):');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log('Vercel (Environment Variables):');
      console.log(`Key: GOOGLE_REFRESH_TOKEN`);
      console.log(`Value: ${tokens.refresh_token}\n`);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h1 style="color: green;">✅ Success!</h1>
            <p>Your refresh token has been generated. Check your terminal for the token.</p>
            <p>You can close this window now.</p>
          </body>
        </html>
      `);

      // Close server after successful response
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('❌ Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error: ${error.message}</h1>`);
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3456, () => {
  console.log('Waiting for authorization...\n');
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Cancelled by user');
  server.close();
  process.exit(0);
});
