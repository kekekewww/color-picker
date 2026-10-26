(() => {
  const defaults = { enabled: true, inline: true, bareHex: false };
  const status = document.getElementById('save-status');
  const controls = Object.keys(defaults).map((key) => document.getElementById(key));
  const updateDescription = () => {
    document.getElementById('enabled-description').textContent = document.getElementById('enabled').checked ? '選取文字時，自動預覽色彩' : '已暫停；開啟後即可繼續預覽';
  };
  async function init() {
    if (!globalThis.chrome?.storage) {
      controls.forEach((control) => { control.disabled = true; });
      status.textContent = '請從 Chrome 工具列開啟擴充功能以調整設定。';
      return;
    }
    try {
      const saved = await chrome.storage.local.get(defaults);
      controls.forEach((control) => { control.checked = saved[control.id]; });
      updateDescription();
    } catch { status.textContent = '無法讀取設定，請重新開啟擴充功能。'; }
    for (const control of controls) control.addEventListener('change', async () => {
      control.disabled = true;
      try {
        await chrome.storage.local.set({ [control.id]: control.checked });
        status.textContent = '';
      } catch {
        control.checked = !control.checked;
        status.textContent = '設定未儲存，請重試。';
      } finally { control.disabled = false; updateDescription(); }
    });
  }
  init();
})();
