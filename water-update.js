import { version } from './package.json';

const releasesUrl = 'https://github.com/cnjialin/budgetgauge/releases';
const check = document.querySelector('#checkUpdate');
const download = document.querySelector('#downloadUpdate');
const status = document.querySelector('#updateStatus');
const bridge = window.WaterSensors;
const current = bridge?.getAppVersion?.() || version;
document.querySelector('#appVersionLabel').textContent = `当前版本 ${current}`;
let downloadUrl = '';
let requestSequence = 0;

function readLatestRelease() {
  if (bridge?.checkLatestRelease) {
    return new Promise((resolve, reject) => {
      const requestId = String(++requestSequence);
      const cleanup = () => { clearTimeout(timer); window.removeEventListener('waterrelease', receive); };
      const receive = event => {
        if (event.detail?.requestId !== requestId) return;
        cleanup();
        if (event.detail.error) reject(new Error(event.detail.error));
        else resolve(event.detail.release);
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error('连接超时')); }, 40000);
      window.addEventListener('waterrelease', receive);
      try { bridge.checkLatestRelease(requestId); } catch { cleanup(); reject(new Error('无法启动更新检查')); }
    });
  }
  return readWebRelease();
}
async function readWebRelease() {
  let lastError;
  for (const url of ['https://api.github.com/repos/cnjialin/budgetgauge/releases/latest',
    'https://raw.githubusercontent.com/cnjialin/budgetgauge/main/public/water-release.json']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`服务器响应 ${response.status}`);
      return await response.json();
    } catch (error) { lastError = error; } finally { clearTimeout(timer); }
  }
  throw new Error(lastError?.name === 'AbortError' ? '连接超时' : '无法连接 GitHub');
}

function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] || 0)] : null;
}
function isNewer(remote, installed) {
  for (let i = 0; i < 3; i++) {
    if (remote[i] !== installed[i]) return remote[i] > installed[i];
  }
  return false;
}
function openRelease(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://github.com' || !parsed.pathname.startsWith('/cnjialin/budgetgauge/releases/')) return;
  if (bridge?.openReleaseUrl) {
    if (!bridge.openReleaseUrl(url)) status.textContent = '无法打开浏览器，请安装浏览器后重试';
  } else window.open(url, '_blank', 'noopener,noreferrer');
}
document.querySelector('#releasePageLink').addEventListener('click', event => {
  if (!bridge?.openReleaseUrl) return;
  event.preventDefault();
  if (!bridge.openReleaseUrl(releasesUrl)) status.textContent = '无法打开浏览器，请安装浏览器后重试';
});
check.addEventListener('click', async () => {
  if (check.disabled) return;
  check.disabled = true;
  download.hidden = true;
  downloadUrl = '';
  status.textContent = '正在检查…';
  try {
    const release = await readLatestRelease();
    const remote = parseVersion(release.tag_name);
    const installed = parseVersion(current);
    if (!remote || !installed || release.draft || release.prerelease) throw new Error('invalid release');
    if (!isNewer(remote, installed)) {
      status.textContent = '当前已是最新版本';
      return;
    }
    // Keep the standalone Water package separate from the legacy app APK.
    const asset = release.assets?.find(item => item.name === 'water-demo.apk' && item.state === 'uploaded');
    if (!asset || !/^https:\/\/github\.com\/cnjialin\/budgetgauge\/releases\/download\//.test(asset.browser_download_url)) {
      status.textContent = '新版安装包暂未就绪，请稍后重试或查看 GitHub';
      return;
    }
    downloadUrl = asset.browser_download_url;
    status.textContent = `发现新版本 ${release.tag_name}，是否下载更新？`;
    download.hidden = false;
  } catch (error) {
    status.textContent = `检查失败：${error.message || '网络不可用'}，可重试或打开 GitHub`;
  } finally {
    check.disabled = false;
  }
});
download.addEventListener('click', () => { if (downloadUrl) openRelease(downloadUrl); });
