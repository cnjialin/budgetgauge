import { createClient } from "@supabase/supabase-js";

import { APP_VERSION } from "./app-version.js";
import { BUILD_STAMP } from "./build-stamp.js";

const APP_RELEASE_TAG = APP_VERSION;
const VERSION_INFO_URL = "https://raw.githubusercontent.com/cnjialin/budgetgauge/main/version.json";
const GITHUB_RELEASES_PAGE_URL = "https://github.com/cnjialin/budgetgauge/releases";
const GITHUB_RELEASE_APK_URL_TEMPLATE = "https://github.com/cnjialin/budgetgauge/releases/download/{tag}/app-release.apk";
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";
const SUPABASE_URL_KEY = "budget-gauge-supabase-url";
const SUPABASE_KEY_KEY = "budget-gauge-supabase-key";
const MONTHLY_BUDGET_KEY = "budget-gauge-monthly-limit";
const EMAIL_KEY = "budget-gauge-email";
const PASSWORD_KEY = "budget-gauge-password";
const HISTORY_KEY = "budget-gauge-history";
const CLOUD_HISTORY_KEY = "budget-gauge-cloud-history";
const RELEASE_INFO_CACHE_KEY = "budget-gauge-release-info";

const supabaseUrlInput = document.querySelector("#supabaseUrlInput");
const supabaseKeyInput = document.querySelector("#supabaseKeyInput");
const monthlyBudgetInput = document.querySelector("#monthlyBudgetInput");
const openExpenseModalBtn = document.querySelector("#openExpenseModalBtn");
const toggleGaugeModeBtn = document.querySelector("#toggleGaugeModeBtn");
const openHistoryBtn = document.querySelector("#openHistoryBtn");
const openSettingsBtn = document.querySelector("#openSettingsBtn");
const connectionStatusEl = document.querySelector("#connectionStatus");
const centerLabelEl = document.querySelector(".center-label");
const remainingBudgetEl = document.querySelector("#remainingBudget");
const usageTextEl = document.querySelector("#usageText");
const gaugeReferencePath = document.querySelector("#gaugeReferencePath");
const gaugeValuePath = document.querySelector("#gaugeValuePath");
const gaugeTicks = document.querySelector("#gaugeTicks");
const gaugeBudgetMarker = document.querySelector("#gaugeBudgetMarker");
const expenseModal = document.querySelector("#expenseModal");
const expenseBackdrop = document.querySelector("#expenseBackdrop");
const expenseDateTimeTrigger = document.querySelector("#expenseDateTimeTrigger");
const expenseAmountInput = document.querySelector("#expenseAmountInput");
const expensePurposeInput = document.querySelector("#expensePurposeInput");
const purposeOptions = [...document.querySelectorAll(".purpose-chip")];
const expenseStatus = document.querySelector("#expenseStatus");
const cancelExpenseBtn = document.querySelector("#cancelExpenseBtn");
const confirmExpenseBtn = document.querySelector("#confirmExpenseBtn");
const dateTimePickerModal = document.querySelector("#dateTimePickerModal");
const pickerDisplayYear = document.querySelector("#pickerDisplayYear");
const pickerDisplayDate = document.querySelector("#pickerDisplayDate");
const pickerPrevMonthBtn = document.querySelector("#pickerPrevMonthBtn");
const pickerNextMonthBtn = document.querySelector("#pickerNextMonthBtn");
const pickerMonthLabel = document.querySelector("#pickerMonthLabel");
const pickerCalendarGrid = document.querySelector("#pickerCalendarGrid");
const pickerHourWheel = document.querySelector("#pickerHourWheel");
const pickerMinuteWheel = document.querySelector("#pickerMinuteWheel");
const pickerSecondWheel = document.querySelector("#pickerSecondWheel");
const dateTimeNowBtn = document.querySelector("#dateTimeNowBtn");
const dateTimeCancelBtn = document.querySelector("#dateTimeCancelBtn");
const dateTimeConfirmBtn = document.querySelector("#dateTimeConfirmBtn");
const settingsModal = document.querySelector("#settingsModal");
const settingsBackdrop = document.querySelector("#settingsBackdrop");
const settingsCard = document.querySelector(".settings-card");
const settingsModalTitle = document.querySelector("#settingsModalTitle");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const settingsStatus = document.querySelector("#settingsStatus");
const logoutSettingsBtn = document.querySelector("#logoutSettingsBtn");
const cancelSettingsBtn = document.querySelector("#cancelSettingsBtn");
const saveSettingsBtn = document.querySelector("#saveSettingsBtn");
const historyModal = document.querySelector("#historyModal");
const historyBackdrop = document.querySelector("#historyBackdrop");
const historyPagerViewport = document.querySelector("#historyPagerViewport");
const historyPagerTrack = document.querySelector("#historyPagerTrack");
const historyTodayList = document.querySelector("#historyTodayList");
const historyMonthList = document.querySelector("#historyMonthList");
const closeHistoryBtn = document.querySelector("#closeHistoryBtn");
const historyTodayBtn = document.querySelector("#historyTodayBtn");
const historyMonthBtn = document.querySelector("#historyMonthBtn");
const historyCard = document.querySelector(".history-card");
const historyFilter = document.querySelector(".history-filter");
const debugBuildBadge = document.querySelector("#debugBuildBadge");
const releaseInfoModal = document.querySelector("#releaseInfoModal");
const releaseInfoBackdrop = document.querySelector("#releaseInfoBackdrop");
const closeReleaseInfoBtn = document.querySelector("#closeReleaseInfoBtn");
const currentVersionValue = document.querySelector("#currentVersionValue");
const releaseInfoStatus = document.querySelector("#releaseInfoStatus");
const releaseDownloadChoices = document.querySelector("#releaseDownloadChoices");
const releaseGithubLink = document.querySelector("#releaseGithubLink");
const releaseBaiduLink = document.querySelector("#releaseBaiduLink");

let supabaseUrl = loadText(SUPABASE_URL_KEY) || DEFAULT_SUPABASE_URL;
let supabaseKey = loadText(SUPABASE_KEY_KEY) || DEFAULT_SUPABASE_KEY;
let monthlyBudgetLimit = loadNumber(MONTHLY_BUDGET_KEY, 5000);
let email = loadText(EMAIL_KEY);
let password = loadText(PASSWORD_KEY);
let expenseHistory = loadHistory();
let historyRange = "today";
let monthHistorySummaryCache = null;
let monthHistorySummaryKey = "";
let monthHistorySummaryTaskId = 0;
let expandedMonthDateKey = "";
let historyDetailTransitioning = false;
let monthOverviewMarkupCache = "";
let historyOverviewRestoreTimer = 0;
let historySwipeStartX = 0;
let historySwipeStartY = 0;
let historySwipeCurrentDeltaX = 0;
let isHistorySwipeActive = false;
let selectedPurpose = "";
let currentSession = null;
let displayedRemaining = null;
let remainingAnimationFrame = 0;
let stagedGaugeAnimationFrame = 0;
let hasPlayedInitialGaugeAnimation = false;
let shouldReplayGaugeAnimationOnVisible = false;
let supabase = createSupabaseClient(supabaseUrl, supabaseKey);
let isBudgetOnlySettingsMode = false;
let latestReleaseInfo = null;
let lastTouchY = 0;
let selectedExpenseDateTime = new Date();
let pickerDraftDateTime = new Date();
const timeWheelScrollTimers = new Map();
const GAUGE_CX = 210;
const GAUGE_CY = 210;
const GAUGE_RADIUS = 154;
const GAUGE_START_ANGLE = -135;
const GAUGE_END_ANGLE = 135;

initialize();

async function initialize() {
  latestReleaseInfo = null;
  applyReleaseBadgeState(null);
  setupGauge();
  setHistoryRange(historyRange, false);
  setGaugeMode(false);
  disableDataScopeButton();
  hydrateInitialExpenseHistory();
  playInitialGaugeAnimation();

  openExpenseModalBtn.addEventListener("click", handleGaugeCenterClick);
  openHistoryBtn.addEventListener("click", openHistoryModal);
  openSettingsBtn.addEventListener("click", openSettingsModal);
  connectionStatusEl.addEventListener("click", openConnectionSettingsModal);
  debugBuildBadge.addEventListener("click", handleReleaseBadgeClick);
  cancelExpenseBtn.addEventListener("click", closeExpenseModal);
  confirmExpenseBtn.addEventListener("click", confirmExpense);
  expenseBackdrop.addEventListener("click", closeExpenseModal);
  cancelSettingsBtn.addEventListener("click", closeSettingsModal);
  logoutSettingsBtn.addEventListener("click", signOutToLocalMode);
  saveSettingsBtn.addEventListener("click", saveSettings);
  settingsBackdrop.addEventListener("click", closeSettingsModal);
  closeHistoryBtn.addEventListener("click", closeHistoryModal);
  historyBackdrop.addEventListener("click", closeHistoryModal);
  historyTodayBtn.addEventListener("click", () => setHistoryRange("today"));
  historyMonthBtn.addEventListener("click", () => setHistoryRange("month"));
  historyCard.addEventListener("touchstart", handleHistorySwipeStart, { passive: true });
  historyCard.addEventListener("touchmove", handleHistorySwipeMove, { passive: false });
  historyCard.addEventListener("touchend", handleHistorySwipeEnd, { passive: true });
  historyCard.addEventListener("touchcancel", handleHistorySwipeCancel, { passive: true });
  closeReleaseInfoBtn.addEventListener("click", closeReleaseInfoModal);
  releaseInfoBackdrop.addEventListener("click", closeReleaseInfoModal);
  expenseDateTimeTrigger.addEventListener("click", openDateTimePicker);
  expenseAmountInput.addEventListener("keydown", handleExpenseInputKeydown);
  expensePurposeInput.addEventListener("keydown", handleExpenseInputKeydown);
  expensePurposeInput.addEventListener("input", syncPurposeSelection);
  purposeOptions.forEach((button) => button.addEventListener("click", () => selectPurpose(button.dataset.purpose)));
  pickerPrevMonthBtn.addEventListener("click", () => stepDateTimePicker("month", -1));
  pickerNextMonthBtn.addEventListener("click", () => stepDateTimePicker("month", 1));
  dateTimeNowBtn.addEventListener("click", setPickerToNow);
  dateTimeCancelBtn.addEventListener("click", closeDateTimePicker);
  dateTimeConfirmBtn.addEventListener("click", confirmDateTimePicker);
  bindTimeWheel(pickerHourWheel, 24, "hour");
  bindTimeWheel(pickerMinuteWheel, 60, "minute");
  bindTimeWheel(pickerSecondWheel, 60, "second");
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("visibilitychange", handleDocumentVisibilityChange);
  document.addEventListener("touchstart", handleDocumentTouchStart, { passive: true });
  document.addEventListener("touchmove", handleDocumentTouchMove, { passive: false });

  hydrateSupabaseState();
  checkForAppUpdate();
}

function openExpenseModal() {
  expenseModal.hidden = false;
  const now = new Date();
  selectedExpenseDateTime = now;
  syncDateTimeTriggerLabel();
  closeDateTimePicker();
  expenseAmountInput.value = "";
  expensePurposeInput.value = "";
  expenseStatus.textContent = currentSession ? "" : "当前未连接 Supabase，保存将只写入本地历史";
  selectedPurpose = "";
  updatePurposeChips();
  expenseAmountInput.focus();
}

function closeExpenseModal() {
  closeDateTimePicker();
  expenseModal.hidden = true;
  openExpenseModalBtn.focus();
}

function handleGaugeCenterClick(event) {
  const target = event.target;

  if (target instanceof Element && target.closest("#usageText")) {
    event.preventDefault();
    event.stopPropagation();
    openBudgetSettingsFromGauge();
    return;
  }

  openExpenseModal();
}

function openSettingsModal(mode = "full") {
  isBudgetOnlySettingsMode = mode === "budget";
  settingsModal.hidden = false;
  settingsCard.classList.toggle("budget-only", isBudgetOnlySettingsMode);
  settingsCard.classList.toggle("connection-only", mode === "connection");
  settingsModalTitle.textContent = isBudgetOnlySettingsMode ? "额度设置" : "账户设置";
  supabaseUrlInput.value = supabaseUrl;
  supabaseKeyInput.value = supabaseKey;
  emailInput.value = email;
  passwordInput.value = password;
  monthlyBudgetInput.value = formatOptionalNumberInput(monthlyBudgetLimit);
  settingsStatus.textContent = isBudgetOnlySettingsMode
    ? "设置每月总额度"
    : mode === "connection"
      ? "设置 Supabase 连接信息"
      : currentSession ? "已连接 Supabase" : "默认使用本地模式，如需同步可在这里登录";

  if (isBudgetOnlySettingsMode) {
    monthlyBudgetInput.focus();
    return;
  }

  supabaseUrlInput.focus();
}

function openBudgetSettingsFromGauge() {
  openSettingsModal("budget");
}

function openConnectionSettingsModal() {
  openSettingsModal("connection");
}

function closeSettingsModal() {
  settingsModal.hidden = true;
  settingsCard.classList.remove("budget-only");
  settingsCard.classList.remove("connection-only");
  isBudgetOnlySettingsMode = false;
  openSettingsBtn.focus();
}

async function openHistoryModal() {
  renderHistory();
  historyModal.hidden = false;
  applyHistoryPagerPosition(false);
  closeHistoryBtn.focus();
}

function closeHistoryModal() {
  historyModal.hidden = true;
  handleHistorySwipeCancel();
  openHistoryBtn.focus();
}

function handleHistorySwipeStart(event) {
  if (historyModal.hidden) {
    return;
  }

  const touch = event.changedTouches?.[0];
  if (!touch) {
    return;
  }

  historySwipeStartX = touch.clientX;
  historySwipeStartY = touch.clientY;
  historySwipeCurrentDeltaX = 0;
  isHistorySwipeActive = true;
  historyPagerTrack.classList.add("is-dragging");
  historyFilter?.classList.add("is-dragging");
}

function handleHistorySwipeMove(event) {
  if (!isHistorySwipeActive || historyModal.hidden) {
    return;
  }

  const touch = event.touches?.[0];
  if (!touch) {
    return;
  }

  const deltaX = touch.clientX - historySwipeStartX;
  const deltaY = touch.clientY - historySwipeStartY;

  if (Math.abs(deltaY) > Math.abs(deltaX) * 1.1) {
    return;
  }

  event.preventDefault();
  historySwipeCurrentDeltaX = deltaX;
  applyHistoryPagerPosition(false, deltaX);
}

function handleHistorySwipeEnd() {
  if (!isHistorySwipeActive) {
    return;
  }

  const deltaX = historySwipeCurrentDeltaX;
  const threshold = Math.max(48, (historyPagerViewport?.clientWidth || 0) * 0.16);

  historyPagerTrack.classList.remove("is-dragging");
  historyFilter?.classList.remove("is-dragging");
  isHistorySwipeActive = false;
  historySwipeCurrentDeltaX = 0;

  if (Math.abs(deltaX) >= threshold) {
    if (deltaX < 0 && historyRange !== "month") {
      setHistoryRange("month");
      return;
    }

    if (deltaX > 0 && historyRange !== "today") {
      setHistoryRange("today");
      return;
    }
  }

  applyHistoryPagerPosition(true);
}

function handleHistorySwipeCancel() {
  historyPagerTrack.classList.remove("is-dragging");
  historyFilter?.classList.remove("is-dragging");
  isHistorySwipeActive = false;
  historySwipeCurrentDeltaX = 0;
  applyHistoryPagerPosition(false);
}

function openReleaseInfoModal() {
  currentVersionValue.textContent = APP_RELEASE_TAG;

  if (latestReleaseInfo?.downloadUrl) {
    releaseInfoStatus.innerHTML = `发现新版本 <strong>${escapeHtml(latestReleaseInfo.tag)}</strong>，前往更新`;
    releaseGithubLink.href = latestReleaseInfo.downloadUrl;
    releaseBaiduLink.href = "https://pan.baidu.com/s/1zKfk8u8o7KXZt4xQrNx8Dg?pwd=6666";
    releaseDownloadChoices.hidden = false;
  } else {
      releaseInfoStatus.textContent = "当前已是最新版本";
    releaseDownloadChoices.hidden = true;
  }

  releaseInfoModal.hidden = false;
}

function closeReleaseInfoModal() {
  releaseInfoModal.hidden = true;
}

async function confirmExpense() {
  const timestamp = serializeTimestamp(selectedExpenseDateTime);
  const amount = sanitizeNumber(expenseAmountInput.value);
  const purposeList = resolvePurposeList();

  if (!timestamp) {
    expenseDateTimeTrigger.focus();
    expenseStatus.textContent = "请填写正确的消费时间。";
    return;
  }

  if (amount <= 0) {
    expenseAmountInput.focus();
    expenseStatus.textContent = "请输入大于 0 的消费金额。";
    return;
  }

  const optimisticRecord = {
    amount,
    purpose: purposeList.join(" "),
    category: purposeList.length ? purposeList : null,
    time: timestamp,
  };

  expenseHistory.unshift(optimisticRecord);
  scheduleMonthHistorySummaryForCurrentData();
  if (!currentSession) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(expenseHistory));
  }

  renderGauge();
  if (!historyModal.hidden) {
    renderHistory();
  }
  expenseStatus.textContent = "";
  closeExpenseModal();

  if (currentSession) {
    const saved = await persistExpenseToSupabase(optimisticRecord, {
      amount,
      type: "expense",
      category: purposeList.length ? purposeList : null,
      time: timestamp,
    });

    if (saved) {
      await refreshExpenses();
      return;
    }

      expenseHistory = expenseHistory.filter((item) => item !== optimisticRecord);
      scheduleMonthHistorySummaryForCurrentData();
      renderGauge();
      if (!historyModal.hidden) {
        renderHistory();
    }
    return;
  }
}

async function saveSettings() {
  supabaseUrl = supabaseUrlInput.value.trim();
  supabaseKey = supabaseKeyInput.value.trim();
  email = emailInput.value.trim();
  password = passwordInput.value;
  const nextMonthlyBudgetLimit = sanitizeNumber(monthlyBudgetInput.value);

  if (isBudgetOnlySettingsMode && nextMonthlyBudgetLimit <= 0) {
    monthlyBudgetInput.focus();
    settingsStatus.textContent = "请输入大于 0 的每月总额度。";
    return;
  }

  monthlyBudgetLimit = nextMonthlyBudgetLimit;

  localStorage.setItem(SUPABASE_URL_KEY, supabaseUrl);
  localStorage.setItem(SUPABASE_KEY_KEY, supabaseKey);
  localStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(PASSWORD_KEY, password);
  localStorage.setItem(MONTHLY_BUDGET_KEY, String(monthlyBudgetLimit));

  if (isBudgetOnlySettingsMode) {
    monthlyBudgetInput.value = formatOptionalNumberInput(monthlyBudgetLimit);
    renderGauge();
    if (!historyModal.hidden) {
      renderHistory();
    }
    settingsStatus.textContent = "额度已保存";
    closeSettingsModal();
    return;
  }

  if (currentSession) {
    try {
      await supabase?.auth.signOut();
    } catch {
      // Ignore sign-out failures while switching config.
    }
  }

  currentSession = null;
  supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  settingsStatus.textContent = "正在保存...";
  const shouldAttemptSignIn = Boolean(supabase && email && password);
  const signedIn = shouldAttemptSignIn ? await signIn(email, password, true) : Boolean(currentSession);

  if (signedIn) {
    await refreshExpenses();
    settingsStatus.textContent = shouldAttemptSignIn ? "保存并登录成功" : "设置已保存，当前保持已登录";
  } else {
    renderGauge();
    settingsStatus.textContent = shouldAttemptSignIn ? "设置已保存，但 Supabase 登录失败" : "已保存到本地，当前为本地模式";
  }

  closeSettingsModal();
}

async function signOutToLocalMode() {
  logoutSettingsBtn.disabled = true;
  settingsStatus.textContent = "正在退出账号...";

  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Even if remote sign-out fails, switch UI back to local mode.
  }

  currentSession = null;
  passwordInput.value = "";
  expenseHistory = loadHistory();
  scheduleMonthHistorySummaryForCurrentData();
  updateConnectionStatus();
  disableDataScopeButton();
  renderGauge();

  if (!historyModal.hidden) {
    renderHistory();
  }

  settingsStatus.textContent = "已退出账号，当前为本地模式";
  logoutSettingsBtn.disabled = false;
  closeSettingsModal();
}

async function hydrateSupabaseState() {
  if (!supabase) {
    currentSession = null;
    expenseHistory = loadHistory();
    scheduleMonthHistorySummaryForCurrentData();
    updateConnectionStatus();
    disableDataScopeButton();
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    currentSession = data.session || null;

    if (currentSession?.user?.email) {
      email = currentSession.user.email;
      localStorage.setItem(EMAIL_KEY, email);
    }

    updateConnectionStatus();
    disableDataScopeButton();

      if (currentSession) {
        await refreshExpenses("month", { animate: true, fromFull: false });
        return;
      }

      expenseHistory = loadHistory();
      scheduleMonthHistorySummaryForCurrentData();
    } catch {
      currentSession = null;
      expenseHistory = loadHistory();
      scheduleMonthHistorySummaryForCurrentData();
      updateConnectionStatus();
      disableDataScopeButton();
    }
}

async function signIn(nextEmail, nextPassword, showStatus = true) {
  if (!supabase) {
    currentSession = null;
    updateConnectionStatus();
    if (showStatus) {
      settingsStatus.textContent = "请先填写 Supabase URL 和 Key。";
    }
    return false;
  }

  if (!nextEmail || !nextPassword) {
    currentSession = null;
    updateConnectionStatus();
    if (showStatus) {
      settingsStatus.textContent = "请输入邮箱和密码。";
    }
    return false;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: nextEmail,
    password: nextPassword,
  });

  if (error) {
    currentSession = null;
    updateConnectionStatus();
    if (showStatus) {
      settingsStatus.textContent = `登录失败：${error.message}`;
    }
    return false;
  }

  currentSession = data.session;
  email = currentSession.user?.email || nextEmail;
  localStorage.setItem(EMAIL_KEY, email);
  updateConnectionStatus();
  disableDataScopeButton();
  if (showStatus) {
    settingsStatus.textContent = "Supabase 登录成功";
  }
  return true;
}

function setGaugeMode(shouldRender = true) {
  centerLabelEl.textContent = "今日剩余";

  if (shouldRender) {
    renderGauge();
  }
}

function disableDataScopeButton() {
  if (!toggleGaugeModeBtn) {
    return;
  }

  toggleGaugeModeBtn.disabled = true;
  toggleGaugeModeBtn.classList.remove("is-active");
  toggleGaugeModeBtn.setAttribute("aria-label", "当前仅显示当前用户数据");
}

async function checkForAppUpdate() {
  try {
    const response = await fetch(`${VERSION_INFO_URL}?t=${Date.now()}`, { cache: "no-store" });

    if (!response.ok) {
      latestReleaseInfo = null;
      clearCachedReleaseInfo();
      applyReleaseBadgeState(null);
      return;
    }

    const release = await response.json();
    const latestTag = String(release?.version || "").trim();

    if (!latestTag) {
      return;
    }

    if (isRemoteReleaseNewer(latestTag, APP_RELEASE_TAG)) {
      latestReleaseInfo = {
        tag: latestTag,
        downloadUrl: buildReleaseApkUrl(latestTag),
      };
      saveCachedReleaseInfo(latestReleaseInfo);
      applyReleaseBadgeState(latestReleaseInfo);
      return;
    }

    latestReleaseInfo = null;
    clearCachedReleaseInfo();
    applyReleaseBadgeState(null);
  } catch {
    latestReleaseInfo = null;
    clearCachedReleaseInfo();
    applyReleaseBadgeState(null);
  }
}

function handleReleaseBadgeClick() {
  openReleaseInfoModal();
}

function normalizeReleaseVersion(tag) {
  return tag
    .trim()
    .replace(/^[vV]/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function applyReleaseBadgeState(releaseInfo) {
  const hasUpdate = Boolean(releaseInfo?.downloadUrl);

  debugBuildBadge.textContent = hasUpdate ? "new" : "beta";
  debugBuildBadge.classList.toggle("is-update", hasUpdate);
  debugBuildBadge.setAttribute("role", "button");
  debugBuildBadge.setAttribute("tabindex", "0");
  debugBuildBadge.setAttribute(
    "aria-label",
    hasUpdate
      ? `发现新版本 ${releaseInfo.tag}，点击查看版本信息`
      : "点击查看当前版本",
  );
}

function loadCachedReleaseInfo() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RELEASE_INFO_CACHE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const tag = String(parsed.tag || "").trim();
    const downloadUrl = String(parsed.downloadUrl || "").trim();
    if (!tag || !downloadUrl || !isRemoteReleaseNewer(tag, APP_RELEASE_TAG)) {
      return null;
    }

    latestReleaseInfo = { tag, downloadUrl };
    return latestReleaseInfo;
  } catch {
    return null;
  }
}

function saveCachedReleaseInfo(releaseInfo) {
  localStorage.setItem(RELEASE_INFO_CACHE_KEY, JSON.stringify(releaseInfo));
}

function clearCachedReleaseInfo() {
  localStorage.removeItem(RELEASE_INFO_CACHE_KEY);
}

function buildReleaseApkUrl(tag) {
  const normalizedTag = String(tag || "").trim().startsWith("v") ? String(tag || "").trim() : `v${String(tag || "").trim()}`;
  return GITHUB_RELEASE_APK_URL_TEMPLATE.replace("{tag}", encodeURIComponent(normalizedTag));
}

function isRemoteReleaseNewer(remoteTag, currentTag) {
  const remote = normalizeReleaseVersion(remoteTag);
  const current = normalizeReleaseVersion(currentTag);
  const length = Math.max(remote.length, current.length);

  for (let index = 0; index < length; index += 1) {
    const remotePart = remote[index] ?? 0;
    const currentPart = current[index] ?? 0;

    if (remotePart > currentPart) {
      return true;
    }

    if (remotePart < currentPart) {
      return false;
    }
  }

  return false;
}

function setHistoryRange(nextRange, rerender = true) {
  if (historyRange === nextRange) {
    historyFilter?.setAttribute("data-active", nextRange);
    applyHistoryPagerPosition(true);
    return;
  }

  historyRange = nextRange;
  historyFilter?.setAttribute("data-active", nextRange);
  historyTodayBtn.classList.toggle("active", nextRange === "today");
  historyTodayBtn.setAttribute("aria-selected", String(nextRange === "today"));
  historyMonthBtn.classList.toggle("active", nextRange === "month");
  historyMonthBtn.setAttribute("aria-selected", String(nextRange === "month"));

  if (rerender && !historyModal.hidden) {
    renderHistory();
  }

  applyHistoryPagerPosition(true);
}

function applyHistoryPagerPosition(animate = true, dragOffset = 0) {
  if (!historyPagerTrack || !historyPagerViewport) {
    return;
  }

  historyPagerTrack.classList.toggle("is-dragging", !animate);
  const width = historyPagerViewport.clientWidth || 1;
  const baseOffset = historyRange === "today" ? 0 : -width;
  const minOffset = -width;
  const maxOffset = 0;
  const offset = Math.max(minOffset, Math.min(maxOffset, baseOffset + dragOffset));
  const progress = Math.max(0, Math.min(1, -offset / width));

  historyPagerTrack.style.transform = `translateX(${offset}px)`;
  historyFilter?.style.setProperty("--history-tab-progress", String(progress));
}

function selectPurpose(purpose) {
  selectedPurpose = purpose;
  expensePurposeInput.value = purpose;
  updatePurposeChips();
}

function syncPurposeSelection() {
  const current = expensePurposeInput.value.trim();
  selectedPurpose = purposeOptions.some((button) => button.dataset.purpose === current) ? current : "";
  updatePurposeChips();
}

function updatePurposeChips() {
  purposeOptions.forEach((button) => {
    button.classList.toggle("active", button.dataset.purpose === selectedPurpose);
  });
}

function resolvePurpose() {
  return expensePurposeInput.value.trim();
}

function resolvePurposeList() {
  const raw = resolvePurpose();
  if (!raw) {
    return [];
  }

  return [...new Set(
    raw
      .split(/[\s,，]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

function handleExpenseInputKeydown(event) {
  if (event.key === "Enter") {
    confirmExpense();
  }
}

function handleDocumentKeydown(event) {
  if (!dateTimePickerModal.hidden && event.key === "Enter") {
    confirmDateTimePicker();
    return;
  }

  if (event.key === "Escape" && !dateTimePickerModal.hidden) {
    closeDateTimePicker();
    return;
  }

  if (event.key === "Escape" && !expenseModal.hidden) {
    closeExpenseModal();
    return;
  }

  if (event.key === "Escape" && !settingsModal.hidden) {
    closeSettingsModal();
    return;
  }

  if (event.key === "Escape" && !historyModal.hidden) {
    closeHistoryModal();
    return;
  }

  if (event.key === "Escape" && !releaseInfoModal.hidden) {
    closeReleaseInfoModal();
  }
}

function handleDocumentVisibilityChange() {
  if (document.hidden) {
    shouldReplayGaugeAnimationOnVisible = true;
    return;
  }

  if (!shouldReplayGaugeAnimationOnVisible) {
    return;
  }

  shouldReplayGaugeAnimationOnVisible = false;
  renderGaugeState(true, true);
}

function handleDocumentTouchStart(event) {
  lastTouchY = event.touches[0]?.clientY ?? 0;
}

function handleDocumentTouchMove(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    event.preventDefault();
    return;
  }

  const scrollable = target.closest(".settings-card, .history-list, .time-wheel-list");
  if (!scrollable) {
    event.preventDefault();
    return;
  }

  const currentTouchY = event.touches[0]?.clientY ?? lastTouchY;
  const deltaY = currentTouchY - lastTouchY;
  lastTouchY = currentTouchY;

  const canScroll = scrollable.scrollHeight > scrollable.clientHeight + 1;
  if (!canScroll) {
    event.preventDefault();
    return;
  }

  const atTop = scrollable.scrollTop <= 0;
  const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;

  if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
    event.preventDefault();
  }
}

function openDateTimePicker() {
  const now = new Date();
  selectedExpenseDateTime = now;
  syncDateTimeTriggerLabel();
  dateTimePickerModal.hidden = false;
  requestAnimationFrame(() => {
    fillDateTimePicker(now);
  });
}

function closeDateTimePicker() {
  dateTimePickerModal.hidden = true;
}

function setPickerToNow() {
  fillDateTimePicker(new Date());
}

function fillDateTimePicker(date) {
  const next = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  pickerDraftDateTime = new Date(next.getTime());
  renderDateTimePicker();
}

function confirmDateTimePicker() {
  selectedExpenseDateTime = new Date(pickerDraftDateTime.getTime());
  syncDateTimeTriggerLabel();
  expenseStatus.textContent = "";
  closeDateTimePicker();
  expenseAmountInput.focus();
}

function bindTimeWheel(container, count, unit) {
  for (let value = 0; value < count; value += 1) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "time-wheel-item";
    item.textContent = String(value).padStart(2, "0");
    item.dataset.value = String(value);
    item.addEventListener("click", () => setTimeWheelValue(unit, value));
    container.appendChild(item);
  }

  container.addEventListener("scroll", () => handleTimeWheelScroll(container, unit));
}

function stepDateTimePicker(unit, delta) {
  const next = new Date(pickerDraftDateTime.getTime());

  if (unit === "year") {
    next.setFullYear(next.getFullYear() + delta);
  } else if (unit === "month") {
    next.setMonth(next.getMonth() + delta);
  } else if (unit === "day") {
    next.setDate(next.getDate() + delta);
  } else if (unit === "hour") {
    next.setHours(next.getHours() + delta);
  } else if (unit === "minute") {
    next.setMinutes(next.getMinutes() + delta);
  } else if (unit === "second") {
    next.setSeconds(next.getSeconds() + delta);
  }

  pickerDraftDateTime = next;
  renderDateTimePicker();
}

function renderDateTimePicker() {
  pickerDisplayYear.textContent = `${pickerDraftDateTime.getFullYear()}年`;
  pickerDisplayDate.textContent = formatPickerHeadline(pickerDraftDateTime);
  pickerMonthLabel.textContent = `${pickerDraftDateTime.getFullYear()}年${pickerDraftDateTime.getMonth() + 1}月`;
  renderCalendarGrid();
  renderTimeWheel(pickerHourWheel, pickerDraftDateTime.getHours());
  renderTimeWheel(pickerMinuteWheel, pickerDraftDateTime.getMinutes());
  renderTimeWheel(pickerSecondWheel, pickerDraftDateTime.getSeconds());
}

function renderCalendarGrid() {
  pickerCalendarGrid.innerHTML = "";

  const viewYear = pickerDraftDateTime.getFullYear();
  const viewMonth = pickerDraftDateTime.getMonth();
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startWeekday + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      button.classList.add("is-outside");
      button.disabled = true;
      button.textContent = "";
      pickerCalendarGrid.appendChild(button);
      continue;
    }

    button.textContent = String(dayNumber);
    if (dayNumber === pickerDraftDateTime.getDate()) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      pickerDraftDateTime = new Date(
        pickerDraftDateTime.getFullYear(),
        pickerDraftDateTime.getMonth(),
        dayNumber,
        pickerDraftDateTime.getHours(),
        pickerDraftDateTime.getMinutes(),
        pickerDraftDateTime.getSeconds(),
        0,
      );
      renderDateTimePicker();
    });

    pickerCalendarGrid.appendChild(button);
  }
}

function syncDateTimeTriggerLabel() {
  expenseDateTimeTrigger.textContent = formatPickerDisplay(selectedExpenseDateTime);
}

function setTimeWheelValue(unit, value) {
  const next = new Date(pickerDraftDateTime.getTime());
  if (unit === "hour") {
    next.setHours(value);
  } else if (unit === "minute") {
    next.setMinutes(value);
  } else if (unit === "second") {
    next.setSeconds(value);
  }

  pickerDraftDateTime = next;
  renderDateTimePicker();
}

function renderTimeWheel(container, currentValue) {
  const items = [...container.querySelectorAll(".time-wheel-item")];
  items.forEach((item) => {
    item.classList.toggle("is-selected", Number(item.dataset.value) === currentValue);
  });

  const selected = items[currentValue];
  if (selected) {
    const targetTop = selected.offsetTop - (container.clientHeight - selected.offsetHeight) / 2;
    container.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "auto",
    });
  }
}

function handleTimeWheelScroll(container, unit) {
  const existingTimer = timeWheelScrollTimers.get(container);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const nextTimer = setTimeout(() => {
    const items = [...container.querySelectorAll(".time-wheel-item")];
    let bestItem = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const shellRect = container.getBoundingClientRect();
    const shellCenter = shellRect.top + shellRect.height / 2;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - shellCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestItem = item;
      }
    });

    if (!bestItem) {
      return;
    }

    const value = Number(bestItem.dataset.value);
    if (unit === "hour" && value !== pickerDraftDateTime.getHours()) {
      setTimeWheelValue(unit, value);
    } else if (unit === "minute" && value !== pickerDraftDateTime.getMinutes()) {
      setTimeWheelValue(unit, value);
    } else if (unit === "second" && value !== pickerDraftDateTime.getSeconds()) {
      setTimeWheelValue(unit, value);
    }
  }, 90);

  timeWheelScrollTimers.set(container, nextTimer);
}

function renderGauge() {
  renderGaugeState(true, false);
}

function playInitialGaugeAnimation() {
  if (hasPlayedInitialGaugeAnimation) {
    renderGaugeState(false);
    return;
  }

  hasPlayedInitialGaugeAnimation = true;
  renderGaugeState(true, true);
}

function renderGaugeState(animate = true, fromFull = false) {
  const budget = getBudgetSnapshot();
  const limit = budget.fixedDailyBudget;
  const referenceValue = budget.todayTotalBudget;
  const remaining = budget.todayRemainingBudget;
  const referenceRatio = limit > 0 ? Math.max(0, Math.min(referenceValue / limit, 1)) : 0;
  const ratio = limit > 0 ? Math.max(0, Math.min(remaining / limit, 1)) : 0;
  const pathLength = Number(gaugeValuePath.dataset.length || 0);
  const isWarning = referenceValue > 0 && remaining / referenceValue < 0.5;

  updateBudgetMarker(limit, referenceValue);

  if (stagedGaugeAnimationFrame) {
    cancelAnimationFrame(stagedGaugeAnimationFrame);
    stagedGaugeAnimationFrame = 0;
  }

  if (limit > 0) {
    usageTextEl.textContent = `今日消费 ${formatCurrency(budget.todaySpent)}`;
  } else {
    usageTextEl.textContent = "请先设置每月总额度";
  }

  usageTextEl.dataset.action = "open-settings";
  usageTextEl.setAttribute("tabindex", "0");
  usageTextEl.setAttribute("role", "button");

  if (fromFull && animate && limit > 0) {
    const previousTransition = gaugeValuePath.style.transition;
    gaugeValuePath.style.transition = "none";
    gaugeReferencePath.style.strokeDasharray = `${pathLength}`;
    gaugeReferencePath.style.strokeDashoffset = `${pathLength * (1 - referenceRatio)}`;
    gaugeValuePath.style.strokeDasharray = `${pathLength}`;
    gaugeValuePath.style.strokeDashoffset = "0";
    gaugeValuePath.classList.toggle("warning", false);
    displayedRemaining = limit;
    remainingBudgetEl.textContent = formatGaugeCurrency(limit);
    remainingBudgetEl.classList.remove("is-animating");
    gaugeReferencePath.getBoundingClientRect();
    gaugeValuePath.getBoundingClientRect();
    remainingBudgetEl.getBoundingClientRect();
    gaugeValuePath.style.transition = previousTransition;
    stagedGaugeAnimationFrame = requestAnimationFrame(() => {
      stagedGaugeAnimationFrame = requestAnimationFrame(() => {
        stagedGaugeAnimationFrame = 0;
        gaugeValuePath.style.strokeDasharray = `${pathLength}`;
        gaugeValuePath.style.strokeDashoffset = `${pathLength * (1 - ratio)}`;
        gaugeValuePath.classList.toggle("warning", isWarning);
        animateRemainingBudget(remaining, true);
      });
    });
    return;
  }

  if (!animate) {
    const previousReferenceTransition = gaugeReferencePath.style.transition;
    const previousTransition = gaugeValuePath.style.transition;
    gaugeReferencePath.style.transition = "none";
    gaugeValuePath.style.transition = "none";
    gaugeReferencePath.style.strokeDasharray = `${pathLength}`;
    gaugeReferencePath.style.strokeDashoffset = `${pathLength * (1 - referenceRatio)}`;
    gaugeValuePath.style.strokeDasharray = `${pathLength}`;
    gaugeValuePath.style.strokeDashoffset = `${pathLength * (1 - ratio)}`;
    gaugeReferencePath.getBoundingClientRect();
    gaugeValuePath.getBoundingClientRect();
    gaugeReferencePath.style.transition = previousReferenceTransition;
    gaugeValuePath.style.transition = previousTransition;
  } else {
    gaugeReferencePath.style.strokeDasharray = `${pathLength}`;
    gaugeReferencePath.style.strokeDashoffset = `${pathLength * (1 - referenceRatio)}`;
    gaugeValuePath.style.strokeDasharray = `${pathLength}`;
    gaugeValuePath.style.strokeDashoffset = `${pathLength * (1 - ratio)}`;
  }
  gaugeValuePath.classList.toggle("warning", isWarning);

  animateRemainingBudget(remaining, animate);
}

function renderHistory() {
  renderTodayHistory();
  renderMonthHistory();
}

function renderTodayHistory() {
  const list = expenseHistory.filter((item) => isInCurrentLocalDay(item.time));

  if (!list.length) {
    historyTodayList.innerHTML = `<div class="history-empty">今天还没有消费记录。</div>`;
    return;
  }

  historyTodayList.innerHTML = "";
  list.forEach((item) => {
    const row = document.createElement("article");
    row.className = "history-item";
    row.innerHTML = `
      <div class="history-meta">
        <strong>${formatCurrency(Number(item.amount || 0))}</strong>
        <div class="history-purpose">${escapeHtml(getPurposeLabel(item))}</div>
        <time>${escapeHtml(formatHistoryTimestamp(item.time || ""))}</time>
      </div>
    `;
    historyTodayList.appendChild(row);
  });
}

function renderMonthHistory() {
  if (!monthHistorySummaryCache?.length) {
    historyMonthList.innerHTML = `<div class="history-empty">本月还没有消费记录。</div>`;
    monthOverviewMarkupCache = historyMonthList.innerHTML;
    return;
  }

  renderMonthSummaryRows(monthHistorySummaryCache);
}

function scheduleMonthHistorySummary(monthItems, summaryKey) {
  monthHistorySummaryTaskId += 1;
  const taskId = monthHistorySummaryTaskId;

  const compute = () => {
    const grouped = new Map();

    monthItems.forEach((item) => {
      const dateKey = formatHistoryDateOnly(item.time || "");
      if (!dateKey) {
        return;
      }

      const current = grouped.get(dateKey) || { dateKey, total: 0, count: 0 };
      current.total += Number(item.amount || 0);
      current.count += 1;
      grouped.set(dateKey, current);
    });

    const summary = Array.from(grouped.values()).sort((left, right) => right.dateKey.localeCompare(left.dateKey));
    monthHistorySummaryKey = summaryKey;
    monthHistorySummaryCache = summary;

    if (taskId !== monthHistorySummaryTaskId) {
      return;
    }

    renderMonthSummaryRows(summary);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(compute, { timeout: 240 });
    return;
  }

  window.setTimeout(compute, 0);
}

function scheduleMonthHistorySummaryForCurrentData() {
  const monthItems = expenseHistory.filter((item) => isInCurrentLocalMonth(item.time));
  const nextKey = monthItems
    .map((item) => `${item.time || ""}|${Number(item.amount || 0)}`)
    .join("~");

  if (monthHistorySummaryKey === nextKey) {
    return;
  }

  if (!monthItems.length) {
    monthHistorySummaryKey = nextKey;
    monthHistorySummaryCache = [];
    return;
  }

  scheduleMonthHistorySummary(monthItems, nextKey);
}

function renderMonthSummaryRows(summary) {
  if (!expandedMonthDateKey) {
    renderMonthOverviewRows(summary);
    monthOverviewMarkupCache = historyMonthList.innerHTML;
    return;
  }

  historyMonthList.innerHTML = "";
  const dailyBudgetLimit = Math.max(getBudgetSnapshot().fixedDailyBudget, 0);

  let expandedRow = null;
  const orderedSummary = expandedMonthDateKey
    ? [
        ...summary.filter((item) => item.dateKey === expandedMonthDateKey),
        ...summary.filter((item) => item.dateKey !== expandedMonthDateKey),
      ]
    : summary;

  orderedSummary.forEach((item) => {
    const ratio = dailyBudgetLimit > 0 ? Math.max(0, Math.min(item.total / dailyBudgetLimit, 1)) : 0;
    const row = document.createElement("article");
    row.className = "history-item history-item-month";
    if (expandedMonthDateKey === item.dateKey) {
      row.classList.add("is-expanded");
      expandedRow = row;
    } else if (expandedMonthDateKey) {
      row.classList.add("is-collapsed-sibling");
    }
    row.tabIndex = 0;
    row.dataset.dateKey = item.dateKey;
    row.innerHTML = `
      <time class="history-day-label">${escapeHtml(formatHistoryMonthDay(item.dateKey))}</time>
      <div class="history-bar-track" aria-hidden="true">
        <div class="history-bar-value" style="width: ${Math.round(ratio * 1000) / 10}%"></div>
      </div>
      <strong class="history-day-amount">${formatCurrency(item.total)}</strong>
    `;
    row.addEventListener("click", () => {
      toggleMonthDayDetails(item.dateKey);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMonthDayDetails(item.dateKey);
      }
    });
    historyMonthList.appendChild(row);

    if (expandedMonthDateKey === item.dateKey) {
      historyMonthList.appendChild(buildMonthDayDetails(item.dateKey));
    }
  });

  if (expandedRow) {
    requestAnimationFrame(() => {
      historyMonthList.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
}

function renderMonthOverviewRows(summary) {
  historyMonthList.innerHTML = "";
  const dailyBudgetLimit = Math.max(getBudgetSnapshot().fixedDailyBudget, 0);

  summary.forEach((item) => {
    const ratio = dailyBudgetLimit > 0 ? Math.max(0, Math.min(item.total / dailyBudgetLimit, 1)) : 0;
    const row = document.createElement("article");
    row.className = "history-item history-item-month";
    row.tabIndex = 0;
    row.dataset.dateKey = item.dateKey;
    row.innerHTML = `
      <time class="history-day-label">${escapeHtml(formatHistoryMonthDay(item.dateKey))}</time>
      <div class="history-bar-track" aria-hidden="true">
        <div class="history-bar-value" style="width: ${Math.round(ratio * 1000) / 10}%"></div>
      </div>
      <strong class="history-day-amount">${formatCurrency(item.total)}</strong>
    `;
    row.addEventListener("click", () => {
      toggleMonthDayDetails(item.dateKey);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMonthDayDetails(item.dateKey);
      }
    });
    historyMonthList.appendChild(row);
  });
}

async function toggleMonthDayDetails(dateKey) {
  if (historyDetailTransitioning) {
    return;
  }

  const nextExpandedDateKey = expandedMonthDateKey === dateKey ? "" : dateKey;
  if (nextExpandedDateKey) {
    const sourceRow = historyMonthList.querySelector(`[data-date-key="${dateKey}"]`);

    if (!(sourceRow instanceof HTMLElement)) {
      expandedMonthDateKey = nextExpandedDateKey;
      renderMonthHistory();
      return;
    }

    historyDetailTransitioning = true;
    const sourceRect = sourceRow.getBoundingClientRect();

    expandedMonthDateKey = nextExpandedDateKey;
    renderMonthHistory();

    await waitForAnimationFrame();

    const targetRow = historyMonthList.querySelector(`[data-date-key="${dateKey}"]`);

    if (!(targetRow instanceof HTMLElement)) {
      historyDetailTransitioning = false;
      return;
    }

    animateHistoryMonthRowFlip(targetRow, sourceRect);
    historyDetailTransitioning = false;
    return;
  }

  expandedMonthDateKey = "";
  if (monthOverviewMarkupCache) {
    historyMonthList.innerHTML = monthOverviewMarkupCache;
    bindMonthOverviewInteractions();
    requestAnimationFrame(() => {
      const restoredRow = historyMonthList.querySelector(`[data-date-key="${dateKey}"]`);
      if (restoredRow instanceof HTMLElement) {
        historyMonthList.scrollTop = Math.max(restoredRow.offsetTop, 0);
      }
    });
  } else {
    renderMonthHistory();
  }
  playHistoryOverviewRestoreAnimation();
}

function buildMonthDayDetails(dateKey) {
  const details = document.createElement("div");
  details.className = "history-day-details";
  details.dataset.dateKey = dateKey;
  const entries = expenseHistory
    .filter((item) => formatHistoryDateOnly(item.time || "") === dateKey)
    .sort((left, right) => new Date(right.time || 0).getTime() - new Date(left.time || 0).getTime());

  if (!entries.length) {
    details.innerHTML = `<div class="history-day-detail-empty">没有更详细的消费记录。</div>`;
    return details;
  }

  details.innerHTML = entries
    .map((item) => `
      <div class="history-day-detail-row">
        <span class="history-day-detail-time">${escapeHtml(formatHistoryClock(item.time || ""))}</span>
        <span class="history-day-detail-purpose">${escapeHtml(getPurposeLabel(item))}</span>
        <strong class="history-day-detail-amount">${formatCurrency(Number(item.amount || 0))}</strong>
      </div>
    `)
    .join("");

  return details;
}

function createHistoryMonthRowClone(sourceRow, sourceRect) {
  const clone = sourceRow.cloneNode(true);
  clone.classList.add("history-month-row-clone");
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  return clone;
}

function bindMonthOverviewInteractions() {
  const rows = historyMonthList.querySelectorAll(".history-item-month[data-date-key]");
  rows.forEach((row) => {
    const dateKey = row.getAttribute("data-date-key");
    if (!dateKey) {
      return;
    }

    row.addEventListener("click", () => {
      toggleMonthDayDetails(dateKey);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMonthDayDetails(dateKey);
      }
    });
  });
}

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function getExpandedHistoryTargetRect(targetRow) {
  const viewportRect = historyPagerViewport.getBoundingClientRect();
  const rowRect = targetRow.getBoundingClientRect();
  return {
    left: rowRect.left,
    top: viewportRect.top,
    width: rowRect.width,
    height: rowRect.height,
  };
}

function animateHistoryMonthRowFlip(targetRow, sourceRect) {
  const targetRect = getExpandedHistoryTargetRect(targetRow);
  const deltaX = sourceRect.left - targetRect.left;
  const deltaY = sourceRect.top - targetRect.top;

  targetRow.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  targetRow.style.transition = "none";

  requestAnimationFrame(() => {
    targetRow.style.transition = "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
    targetRow.style.transform = "translate(0, 0)";

    window.setTimeout(() => {
      targetRow.style.transition = "";
      targetRow.style.transform = "";
    }, 300);
  });
}

function playHistoryOverviewRestoreAnimation() {
  if (historyOverviewRestoreTimer) {
    window.clearTimeout(historyOverviewRestoreTimer);
    historyOverviewRestoreTimer = 0;
  }

  historyMonthList.classList.remove("is-restoring-overview");
  requestAnimationFrame(() => {
    historyMonthList.classList.add("is-restoring-overview");
    historyOverviewRestoreTimer = window.setTimeout(() => {
      historyMonthList.classList.remove("is-restoring-overview");
      historyOverviewRestoreTimer = 0;
    }, 240);
  });
}

function getTodaySpent() {
  return expenseHistory.reduce((sum, item) => isInCurrentLocalDay(item.time) ? sum + Number(item.amount || 0) : sum, 0);
}

function getBudgetSnapshot() {
  const now = new Date();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDaysInMonth = totalDaysInMonth - now.getDate() + 1;
  const spentBeforeToday = getSpentBeforeTodayInCurrentMonth();
  const fixedDailyBudget = totalDaysInMonth > 0 ? monthlyBudgetLimit / totalDaysInMonth : 0;
  const monthRemainingBudget = Math.max(monthlyBudgetLimit - spentBeforeToday, 0);
  const rawTodayTotalBudget = remainingDaysInMonth > 0 ? monthRemainingBudget / remainingDaysInMonth : 0;
  const todayTotalBudget = fixedDailyBudget > 0
    ? Math.min(fixedDailyBudget, rawTodayTotalBudget)
    : rawTodayTotalBudget;
  const todaySpent = getTodaySpent();
  const todayRemainingBudget = Math.max(todayTotalBudget - todaySpent, 0);

  return {
    fixedDailyBudget,
    monthRemainingBudget,
    rawTodayTotalBudget,
    todayTotalBudget,
    todayRemainingBudget,
    todaySpent,
    spentBeforeToday,
  };
}

function updateBudgetMarker(limit, referenceValue) {
  if (!limit || referenceValue <= 0) {
    gaugeBudgetMarker.style.opacity = "0";
    gaugeBudgetMarker.setAttribute("x1", "0");
    gaugeBudgetMarker.setAttribute("y1", "0");
    gaugeBudgetMarker.setAttribute("x2", "0");
    gaugeBudgetMarker.setAttribute("y2", "0");
    return;
  }

  const ratio = Math.max(0, Math.min(referenceValue / limit, 1));
  const sweep = normalizeSweep(GAUGE_START_ANGLE, GAUGE_END_ANGLE);
  const angle = GAUGE_START_ANGLE + sweep * ratio;
  const outer = toCartesian(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS + 12, angle);
  const inner = toCartesian(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS - 12, angle);

  gaugeBudgetMarker.style.opacity = "1";
  gaugeBudgetMarker.setAttribute("x1", outer.x);
  gaugeBudgetMarker.setAttribute("y1", outer.y);
  gaugeBudgetMarker.setAttribute("x2", inner.x);
  gaugeBudgetMarker.setAttribute("y2", inner.y);
}

function getSpentBeforeTodayInCurrentMonth() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return expenseHistory.reduce((sum, item) => {
    if (!item.time) {
      return sum;
    }

    const date = new Date(item.time);
    if (Number.isNaN(date.getTime())) {
      return sum;
    }

    const isCurrentMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    const isBeforeToday = date < startOfToday;
    return isCurrentMonth && isBeforeToday ? sum + Number(item.amount || 0) : sum;
  }, 0);
}

async function refreshExpenses(range = "month", renderOptions = { animate: false, fromFull: false }) {
  if (!supabase) {
    expenseHistory = loadHistory();
    scheduleMonthHistorySummaryForCurrentData();
    currentSession = null;
    updateConnectionStatus();
    playInitialGaugeAnimation();
    return;
  }

  const activeUserId = currentSession?.user?.id;
  if (!activeUserId) {
    expenseHistory = loadHistory();
    scheduleMonthHistorySummaryForCurrentData();
    currentSession = null;
    updateConnectionStatus();
    playInitialGaugeAnimation();
    return;
  }

  let query = supabase
    .from("money")
    .select("id, amount, type, category, time")
    .eq("type", "expense")
    .order("time", { ascending: false });

  query = query.eq("user_id", activeUserId);

  if (range === "month") {
    const { start, end } = getMonthRange();
    query = query.gte("time", start).lt("time", end);
  }

  const { data, error } = await query;

  if (error) {
    settingsStatus.textContent = `同步失败：${error.message}`;
    return;
  }

  expenseHistory = Array.isArray(data) ? data : [];
  scheduleMonthHistorySummaryForCurrentData();
  localStorage.setItem(CLOUD_HISTORY_KEY, JSON.stringify(expenseHistory));
  updateConnectionStatus();
  renderGaugeState(renderOptions.animate, renderOptions.fromFull);
  if (!historyModal.hidden) {
    renderHistory();
  }
}

async function persistExpenseToSupabase(optimisticRecord, payload) {
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.from("money").insert(payload).select();

  if (error || !data || !data.length) {
    console.error("Supabase expense insert failed", error || "empty insert response", optimisticRecord);
    return false;
  }

  return true;
}

function animateRemainingBudget(targetValue, animate = true) {
  const nextValue = Number.isFinite(targetValue) ? targetValue : 0;

  if (remainingAnimationFrame) {
    cancelAnimationFrame(remainingAnimationFrame);
    remainingAnimationFrame = 0;
  }

  if (displayedRemaining === null) {
    displayedRemaining = nextValue;
      remainingBudgetEl.textContent = formatGaugeCurrency(nextValue);
    remainingBudgetEl.classList.remove("is-animating");
    return;
  }

  if (!animate) {
    displayedRemaining = nextValue;
    remainingBudgetEl.textContent = formatGaugeCurrency(nextValue);
    remainingBudgetEl.classList.remove("is-animating");
    return;
  }

  const startValue = displayedRemaining;
  const delta = nextValue - startValue;
  const distance = Math.abs(delta);

  if (Math.abs(delta) < 0.01) {
    displayedRemaining = nextValue;
      remainingBudgetEl.textContent = formatGaugeCurrency(nextValue);
    remainingBudgetEl.classList.remove("is-animating");
    return;
  }

  const finalAmount = Math.min(0.03, distance);
  const slowBandAmount = Math.max(Math.min(distance, 1) - finalAmount, 0);
  const fastBandAmount = Math.max(distance - 1, 0);
  const finalDuration = finalAmount > 0 ? 300 : 0;
  const slowDuration = slowBandAmount > 0 ? Math.max(220, slowBandAmount * 360) : 0;
  const fastDuration = fastBandAmount > 0 ? Math.min(420, Math.max(120, fastBandAmount * 20)) : 0;
  const duration = fastDuration + slowDuration + finalDuration;
  const startedAt = performance.now();
  remainingBudgetEl.classList.add("is-animating");

  const step = (now) => {
    const elapsed = Math.min(now - startedAt, duration);
    const traveled = getTraveledAmount(elapsed, {
      distance,
      fastBandAmount,
      slowBandAmount,
      finalAmount,
      fastDuration,
      slowDuration,
      finalDuration,
    });
    const currentValue = startValue + Math.sign(delta) * traveled;

    displayedRemaining = currentValue;
    remainingBudgetEl.textContent = formatGaugeCurrency(currentValue);

    if (elapsed < duration) {
      remainingAnimationFrame = requestAnimationFrame(step);
      return;
    }

    displayedRemaining = nextValue;
    remainingBudgetEl.textContent = formatGaugeCurrency(nextValue);
    remainingBudgetEl.classList.remove("is-animating");
    remainingAnimationFrame = 0;
  };

  remainingAnimationFrame = requestAnimationFrame(step);
}

function getTraveledAmount(elapsed, config) {
  const {
    distance,
    fastBandAmount,
    slowBandAmount,
    finalAmount,
    fastDuration,
    slowDuration,
    finalDuration,
  } = config;

  if (elapsed <= 0 || distance <= 0) {
    return 0;
  }

  let traveled = 0;
  let remainingTime = elapsed;

  if (fastBandAmount > 0 && fastDuration > 0) {
    const time = Math.min(remainingTime, fastDuration);
    traveled += fastBandAmount * (time / fastDuration);
    remainingTime -= time;
  }

  if (remainingTime > 0 && slowBandAmount > 0 && slowDuration > 0) {
    const time = Math.min(remainingTime, slowDuration);
    traveled += slowBandAmount * (time / slowDuration);
    remainingTime -= time;
  }

  if (remainingTime > 0 && finalAmount > 0 && finalDuration > 0) {
    const time = Math.min(remainingTime, finalDuration);
    traveled += finalAmount * (time / finalDuration);
  }

  return Math.min(traveled, distance);
}

function setupGauge() {
  const pathData = buildArcPath(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS, GAUGE_START_ANGLE, GAUGE_END_ANGLE, 180);

  gaugeReferencePath.setAttribute("d", pathData);
  gaugeValuePath.setAttribute("d", pathData);
  gaugeValuePath.dataset.length = String(gaugeValuePath.getTotalLength());

  drawTicks(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS, GAUGE_START_ANGLE, GAUGE_END_ANGLE, 37);
}

function buildArcPath(cx, cy, radius, startAngle, endAngle, steps) {
  const points = [];
  const sweep = normalizeSweep(startAngle, endAngle);

  for (let index = 0; index <= steps; index += 1) {
    const angle = startAngle + (sweep * index) / steps;
    points.push(toCartesian(cx, cy, radius, angle));
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function drawTicks(cx, cy, radius, startAngle, endAngle, tickCount) {
  gaugeTicks.innerHTML = "";
  const sweep = normalizeSweep(startAngle, endAngle);

  for (let index = 0; index < tickCount; index += 1) {
    const ratio = index / (tickCount - 1);
    const angle = startAngle + sweep * ratio;
    const isMajor = index % 4 === 0;
    const isThreshold = Math.abs(ratio - 0.5) < 0.0001;
    const outer = toCartesian(cx, cy, radius - 16, angle);
    const inner = toCartesian(cx, cy, radius - (isMajor ? 34 : 26), angle);
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const tickClass = [isMajor ? "major" : "minor"];

    if (isThreshold) {
      tickClass.push("threshold");
    }

    tick.setAttribute("class", tickClass.join(" "));
    tick.setAttribute("x1", outer.x);
    tick.setAttribute("y1", outer.y);
    tick.setAttribute("x2", inner.x);
    tick.setAttribute("y2", inner.y);
    gaugeTicks.appendChild(tick);
  }
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function normalizeSweep(startAngle, endAngle) {
  const raw = endAngle - startAngle;
  return raw >= 0 ? raw : 360 + raw;
}

function toCartesian(cx, cy, radius, angleInDegrees) {
  const radians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians),
  };
}

function sanitizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function loadNumber(key, fallback) {
  const parsed = Number(localStorage.getItem(key));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function loadText(key) {
  return localStorage.getItem(key) || "";
}

function formatOptionalNumberInput(value) {
  return Number.isFinite(value) && value > 0 ? String(value) : "";
}

function createSupabaseClient(url, key) {
  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadCloudHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOUD_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hydrateInitialExpenseHistory() {
  if (supabase) {
    const cachedCloudHistory = loadCloudHistory();
    if (cachedCloudHistory.length) {
      expenseHistory = cachedCloudHistory;
      scheduleMonthHistorySummaryForCurrentData();
      return;
    }
  }

  expenseHistory = loadHistory();
  scheduleMonthHistorySummaryForCurrentData();
}

function getPurposeLabel(item) {
  if (Array.isArray(item.category) && item.category.length) {
    return item.category.join(" / ");
  }

  return item.purpose || "未分类";
}

function updateConnectionStatus() {
  if (currentSession) {
    connectionStatusEl.textContent = "SUPABASE已连接";
    connectionStatusEl.classList.add("connected");
    return;
  }

  connectionStatusEl.textContent = "本地模式";
  connectionStatusEl.classList.remove("connected");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatGaugeCurrency(amount) {
  return formatCurrency(amount).replace(/^([^\d-]+)/, "$1 ");
}

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function formatPickerDisplay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "选择消费时间";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatPickerHeadline(date) {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getMonth() + 1}月${date.getDate()}日${weekdays[date.getDay()]}`;
}

function serializeTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function formatHistoryTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatHistoryDateOnly(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHistoryMonthDay(value) {
  if (!value) {
    return "";
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return value;
  }

  return `${match[2]}-${match[3]}`;
}

function formatHistoryClock(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function currentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isInCurrentLocalDay(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isInCurrentLocalMonth(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth();
}


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
