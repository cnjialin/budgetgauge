import { version } from './package.json';

const releasesUrl = 'https://github.com/cnjialin/budgetgauge/releases';
const check = document.querySelector('#checkUpdate');
const download = document.querySelector('#downloadUpdate');
const status = document.querySelector('#updateStatus');
const bridge = window.WaterSensors;
const current = bridge?.getAppVersion?.() || version;
document.querySelector('#appVersionLabel').textContent = `当前版本 ${current}`;
let downloadUrl = '';

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://api.github.com/repos/cnjialin/budgetgauge/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal, cache: 'no-store',
    });
    if (!response.ok) throw new Error('release unavailable');
    const release = await response.json();
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
  } catch {
    status.textContent = '检查失败，请检查网络后重试，也可打开 GitHub';
  } finally {
    clearTimeout(timer);
    check.disabled = false;
  }
});
download.addEventListener('click', () => { if (downloadUrl) openRelease(downloadUrl); });
