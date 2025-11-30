(async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKey = document.getElementById('saveKey');
  const seedBtn = document.getElementById('seed');
  const refreshBtn = document.getElementById('refresh');
  const listEl = document.getElementById('list');
  const queryEl = document.getElementById('query');
  const maxEl = document.getElementById('max');
  const chartArea = document.getElementById('chartArea');
  const exportVideos = document.getElementById('exportVideos');
  const exportMetrics = document.getElementById('exportMetrics');

  const savedKey = await window.electronAPI.getApiKey();
  apiKeyInput.value = savedKey || '';

  saveKey.onclick = async () => {
    await window.electronAPI.setApiKey(apiKeyInput.value.trim());
    alert('Saved');
  };

  seedBtn.onclick = async () => {
    const q = queryEl.value.trim() || '#shorts';
    const m = Number(maxEl.value) || 10;
    seedBtn.disabled = true;
    const res = await window.electronAPI.seedSearch(q, m);
    seedBtn.disabled = false;
    if (res && res.error) alert('Error: ' + res.error);
    else alert('Search enqueued');
    await loadTop();
  };

  refreshBtn.onclick = loadTop;

  exportVideos.onclick = async () => {
    const r = await window.electronAPI.exportCSV('videos');
    if (r && r.ok) alert('Exported to ' + r.path);
  };
  exportMetrics.onclick = async () => {
    const r = await window.electronAPI.exportCSV('metrics');
    if (r && r.ok) alert('Exported to ' + r.path);
  };

  async function loadTop() {
    listEl.innerHTML = 'Loading...';
    const rows = await window.electronAPI.getTopShorts(50);
    listEl.innerHTML = '';
    for (const r of rows) {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(r.title || r.id)}</strong><div>views: ${r.view_count||0} | likes: ${r.like_count||0} | comments: ${r.comment_count||0}</div>`;
      li.onclick = async () => {
        await loadMetrics(r.id);
      };
      listEl.appendChild(li);
    }
    if (rows.length === 0) listEl.innerHTML = '<i>No shorts yet. Run a seed search.</i>';
  }

  async function loadMetrics(id) {
    chartArea.innerHTML = 'Loading...';
    const res = await window.electronAPI.getVideoMetrics(id);
    if (!res || res.length === 0) {
      chartArea.innerHTML = 'No metrics';
      return;
    }
    const lines = ['snapshot_at,views,likes,comments'];
    for (const s of res) {
      lines.push(`${s.snapshot_at},${s.view_count},${s.like_count},${s.comment_count}`);
    }
    chartArea.innerHTML = `<pre style="max-height:600px; overflow:auto; background:#f7f7f7; padding:10px;">${escapeHtml(lines.join('\n'))}</pre>`;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  await loadTop();
})();
