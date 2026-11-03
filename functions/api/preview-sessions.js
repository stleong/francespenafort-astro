import { CSV_URL, parseCSV } from '../_lib/preview-schedule.js';

export async function onRequestGet() {
  try {
    const response = await fetch(CSV_URL, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) throw new Error('Schedule unavailable');

    const records = parseCSV(await response.text());
    const now = Date.now();

    const sessions = records.filter(r => {
      if (r.display_status !== 'PUBLISHED' ||
          r.registration_status !== 'OPEN') return false;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.preview_date) ||
          !/^\d{2}:\d{2}$/.test(r.start_time)) return false;

      if (r.timezone !== 'Asia/Kuala_Lumpur') return false;
      if (!/^\d{9,11}$/.test(r.zoom_meeting_id)) return false;

      const start = Date.parse(
        `${r.preview_date}T${r.start_time}:00+08:00`
      );

      return Number.isFinite(start) && start > now;
    }).map(r => ({
      session_id: r.session_id,
      preview_title: r.preview_title,
      preview_date: r.preview_date,
      start_time: r.start_time,
      timezone: r.timezone,
      duration_minutes: Number(r.duration_minutes),
      description: r.description,
      capacity: Number(r.capacity)
    })).sort((a, b) =>
      `${a.preview_date}T${a.start_time}`.localeCompare(
        `${b.preview_date}T${b.start_time}`
      )
    );

    return Response.json({ success: true, sessions }, {
      headers: { 'Cache-Control': 'public, max-age=60' }
    });
  } catch {
    return Response.json({
      success: false,
      sessions: [],
      message: 'Preview schedule temporarily unavailable.'
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
