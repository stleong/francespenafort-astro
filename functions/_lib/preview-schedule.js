export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS3e7eYMC8v7MM35b0XKT_rVKG5jtgX4XQDiwCTMOP_pyPcyWTAA260jKcF3_ecPKGpL_Alc8bCmoPI/pub?output=csv';

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }

  if (quoted) throw new Error('Invalid CSV');
  row.push(field);
  if (row.some(v => v.trim())) rows.push(row);

  const headers = (rows.shift() || [])
    .map(h => h.replace(/^\uFEFF/, '').trim());

  return rows.map(values =>
    Object.fromEntries(headers.map(
      (h, i) => [h, (values[i] || '').trim()]
    ))
  );
}


export function getEligibleSessions(records, now = Date.now()) {
  const counts = new Map();

  for (const record of records) {
    const id = record.session_id;
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }

  return records.filter(r => {
    if (r.display_status !== 'PUBLISHED' ||
        r.registration_status !== 'OPEN') return false;

    if (!r.session_id ||
        !/^[A-Za-z0-9_-]{1,80}$/.test(r.session_id)) return false;

    if (counts.get(r.session_id) !== 1) return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.preview_date) ||
        !/^\d{2}:\d{2}$/.test(r.start_time)) return false;

    if (r.timezone !== 'Asia/Kuala_Lumpur') return false;
    if (!/^\d{9,11}$/.test(r.zoom_meeting_id)) return false;

    const start = Date.parse(
      `${r.preview_date}T${r.start_time}:00+08:00`
    );

    return Number.isFinite(start) && start > now;
  }).sort((a, b) =>
    `${a.preview_date}T${a.start_time}`.localeCompare(
      `${b.preview_date}T${b.start_time}`
    )
  );
}
