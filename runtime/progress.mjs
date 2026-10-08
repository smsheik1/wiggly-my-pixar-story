import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const escape = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Writes progress.json + a self-contained, auto-refreshing progress.html next to a render.
 * Agents surface progress.html inline (e.g. <agent-embed url="file://…/progress.html" height="260">)
 * while the render runs; it works from file:// with no server.
 */
export async function writeProgress(dir, { status, seconds = 0, totalSeconds = 60, stage = '', output = '', error = '', ...extra }) {
  const percent = Math.max(0, Math.min(100, Math.round((seconds / totalSeconds) * 100)));
  const data = { status, stage, seconds, totalSeconds, percent, output, error, ...extra, updatedAt: new Date().toISOString() };
  await writeFile(join(dir, 'progress.json'), JSON.stringify(data, null, 2));
  const done = status === 'ready-for-review' || status === 'failed';
  const color = status === 'failed' ? '#ff6b6b' : status === 'ready-for-review' ? '#5ee38b' : '#ffb238';
  await writeFile(join(dir, 'progress.html'), `<!doctype html>
<html><head><meta charset="utf-8">${done ? '' : '<meta http-equiv="refresh" content="2">'}<title>My Pixar Story render · ${percent}%</title>
<style>body{margin:0;background:#0d1117;color:#e6edf3;font:14px/1.4 system-ui,sans-serif}main{padding:16px 20px}
h1{font-size:15px;margin:0 0 10px;letter-spacing:.04em}.bar{height:14px;border-radius:7px;background:#21262d;overflow:hidden}
.fill{height:100%;width:${percent}%;background:${color};transition:width .5s}.row{display:flex;justify-content:space-between;margin-top:8px;color:#8b949e}
.status{color:${color};font-weight:600}code{color:#e6edf3;word-break:break-all}</style></head>
<body><main><h1>MY PIXAR STORY · OFFICIAL RENDER</h1><div class="bar"><div class="fill"></div></div>
<div class="row"><span class="status">${escape(status)}${stage ? ` · ${escape(stage)}` : ''}</span><span>${seconds.toFixed(1)} / ${totalSeconds}s · ${percent}%</span></div>
${output ? `<p>Output: <code>${escape(output)}</code></p>` : ''}${error ? `<p class="status">${escape(error)}</p>` : ''}
<p style="color:#8b949e">Updated ${escape(data.updatedAt)}${done ? '' : ' · refreshes every 2s'}</p></main></body></html>
`);
  return data;
}
