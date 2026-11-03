import {
  CSV_URL,
  parseCSV,
  getEligibleSessions
} from '../_lib/preview-schedule.js';

function reply(message, status = 400, success = false) {
  return Response.json(
    { success, message },
    {
      status,
      headers: { 'Cache-Control': 'no-store' }
    }
  );
}

export async function onRequestPost({ request, env }) {
  if (env.REGISTRATION_ENABLED !== 'true') {
    return reply('Registration is not yet available.', 503);
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return reply('JSON required.', 415);
  }

  let data;
  try {
    if (Number(request.headers.get('content-length')) > 8192) {
      return reply('Request too large.', 413);
    }

    const body = await request.text();

    if (new TextEncoder().encode(body).length > 8192) {
      return reply('Request too large.', 413);
    }

    data = JSON.parse(body);
  } catch {
    return reply('Invalid registration data.');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return reply('Invalid registration data.');
  }

  const {
    session_id,
    first_name,
    last_name,
    email,
    phone,
    privacy_consent
  } = data;

  const valid = (value, max) =>
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= max;

  if (
    !valid(session_id, 80) ||
    !valid(first_name, 100) ||
    !valid(last_name, 100) ||
    !valid(email, 254) ||
    !valid(phone, 30) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    privacy_consent !== true
  ) {
    return reply('Please check your registration details.');
  }

  try {
    // Find the correct meeting from Google Sheets.
    const sheetResponse = await fetch(CSV_URL, {
      signal: AbortSignal.timeout(10000)
    });

    if (!sheetResponse.ok) {
      return reply('Schedule temporarily unavailable.', 503);
    }

    const sessions = getEligibleSessions(
      parseCSV(await sheetResponse.text())
    );

    const session = sessions.find(
      item => item.session_id === session_id.trim()
    );

    if (!session) {
      return reply('This session is no longer available.', 404);
    }

    // Request Zoom Server-to-Server OAuth token.
    const credentials = [
      env.ZOOM_CLIENT_ID,
      env.ZOOM_CLIENT_SECRET
    ];

    if (!env.ZOOM_ACCOUNT_ID || credentials.some(v => !v)) {
      return reply('Registration service not configured.', 503);
    }

    const basic = btoa(credentials.join(':'));

    const tokenUrl = new URL('https://zoom.us/oauth/token');
    tokenUrl.searchParams.set('grant_type', 'account_credentials');
    tokenUrl.searchParams.set('account_id', env.ZOOM_ACCOUNT_ID);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!tokenResponse.ok) {
      return reply('Zoom connection temporarily unavailable.', 503);
    }

    const token = await tokenResponse.json();

    if (!token.access_token) {
      return reply('Zoom authentication failed.', 503);
    }

    // Register participant with Zoom.
    const zoomResponse = await fetch(
      `https://api.zoom.us/v2/meetings/${session.zoom_meeting_id}/registrants`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          email: email.trim(),
          phone: phone.trim()
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!zoomResponse.ok) {
      if (zoomResponse.status === 429) {
        return reply('Too many requests. Please try again shortly.', 429);
      }

      return reply('Zoom could not complete the registration.', 502);
    }

    return reply(
      'Registration successful. Please check your email for Zoom joining instructions.',
      200,
      true
    );

  } catch {
    return reply(
      'Registration service temporarily unavailable. If you already submitted, check your email before trying again.',
      503
    );
  }
}
