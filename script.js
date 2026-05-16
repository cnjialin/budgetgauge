import { createClient } from "@supabase/supabase-js";

import { SunburstChart } from "echarts/charts";
import { GraphicComponent, TooltipComponent } from "echarts/components";
import { init, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

import { BUILD_STAMP } from "./build-stamp.js";
import { version as packageVersion } from "./package.json";

const APP_RELEASE_TAG = `v${packageVersion}`;
const REMOTE_APP_VERSION_URL = "https://raw.githubusercontent.com/cnjialin/budgetgauge/main/package.json";
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
const THEME_KEY = "budget-gauge-theme";
const CUSTOM_CATEGORIES_KEY = "budget-gauge-categories";
const THEMES = new Set(["default", "forest"]);

use([SunburstChart, GraphicComponent, TooltipComponent, CanvasRenderer]);

const gaugePage = document.querySelector(".gauge-page");
const supabaseUrlInput = document.querySelector("#supabaseUrlInput");
const supabaseKeyInput = document.querySelector("#supabaseKeyInput");
const monthlyBudgetInput = document.querySelector("#monthlyBudgetInput");
const openExpenseModalBtn = document.querySelector("#openExpenseModalBtn");
const toggleGaugeModeBtn = document.querySelector("#toggleGaugeModeBtn");
const homeTabBtn = document.querySelector("#homeTabBtn");
const openHistoryBtn = document.querySelector("#openHistoryBtn");
const openStatsBtn = document.querySelector("#openStatsBtn");
const openSunburstTestBtn = document.querySelector("#openSunburstTestBtn");
const openSettingsBtn = document.querySelector("#openSettingsBtn");
const bottomSettingsBtn = document.querySelector("#bottomSettingsBtn");
const clearExpenseAmountBtn = document.querySelector("#clearExpenseAmountBtn");
const connectionStatusEl = document.querySelector("#connectionStatus");
const centerLabelEl = document.querySelector(".center-label");
const remainingBudgetEl = document.querySelector("#remainingBudget");
const usageTextEl = document.querySelector("#usageText");
const quickExpenseAmountInput = document.querySelector("#quickExpenseAmountInput");
const quickExpenseContinueBtn = document.querySelector("#quickExpenseContinueBtn");
const gaugeReferencePath = document.querySelector("#gaugeReferencePath");
const gaugeValuePath = document.querySelector("#gaugeValuePath");
const gaugeTicks = document.querySelector("#gaugeTicks");
const gaugeBudgetMarker = document.querySelector("#gaugeBudgetMarker");
const expenseDateTimeTrigger = document.querySelector("#expenseDateTimeTrigger");
const expenseAmountInput = document.querySelector("#expenseAmountInput");
const recordAmountField = document.querySelector(".record-amount-field");
const expensePurposeInput = document.querySelector("#expensePurposeInput");
const purposeWheel = document.querySelector("#purposeOptions");
const categoryOptions = document.querySelector("#categoryOptions");
const categoryDividers = document.querySelector("#categoryDividers");
const categoryBackBtn = document.querySelector("#categoryBackBtn");
let purposeOptions = [];
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
const statsModal = document.querySelector("#statsModal");
const statsBackdrop = document.querySelector("#statsBackdrop");
const statsCard = document.querySelector(".stats-card");
const expenseSunburstChart = document.querySelector("#expenseSunburstChart");
const statsEmptyState = document.querySelector("#statsEmptyState");
const sunburstTestModal = document.querySelector("#sunburstTestModal");
const sunburstTestBackdrop = document.querySelector("#sunburstTestBackdrop");
const sunburstTestCard = document.querySelector(".sunburst-test-card");
const sunburstTestChartEl = document.querySelector("#sunburstTestChart");
const deleteConfirmModal = document.querySelector("#deleteConfirmModal");
const deleteConfirmBackdrop = document.querySelector("#deleteConfirmBackdrop");
const deleteConfirmKicker = document.querySelector("#deleteConfirmKicker");
const deleteConfirmTitle = document.querySelector("#deleteConfirmTitle");
const deleteConfirmText = document.querySelector("#deleteConfirmText");
const cancelDeleteExpenseBtn = document.querySelector("#cancelDeleteExpenseBtn");
const confirmDeleteExpenseBtn = document.querySelector("#confirmDeleteExpenseBtn");
const categoryAddModal = document.querySelector("#categoryAddModal");
const categoryAddBackdrop = document.querySelector("#categoryAddBackdrop");
const categoryAddInput = document.querySelector("#categoryAddInput");
const categoryAddStatus = document.querySelector("#categoryAddStatus");
const cancelCategoryAddBtn = document.querySelector("#cancelCategoryAddBtn");
const confirmCategoryAddBtn = document.querySelector("#confirmCategoryAddBtn");
const releaseInfoModal = document.querySelector("#releaseInfoModal");
const releaseInfoBackdrop = document.querySelector("#releaseInfoBackdrop");
const closeReleaseInfoBtn = document.querySelector("#closeReleaseInfoBtn");
const currentVersionValue = document.querySelector("#currentVersionValue");
const releaseInfoStatus = document.querySelector("#releaseInfoStatus");
const releaseDownloadChoices = document.querySelector("#releaseDownloadChoices");
const releaseGithubLink = document.querySelector("#releaseGithubLink");
const releaseBaiduLink = document.querySelector("#releaseBaiduLink");
const themeButtons = [...document.querySelectorAll(".theme-option")];
const categorySettingsTree = document.querySelector("#categorySettingsTree");
const addRootCategoryBtn = document.querySelector("#addRootCategoryBtn");
const syncCategoriesBtn = document.querySelector("#syncCategoriesBtn");

let supabaseUrl = loadText(SUPABASE_URL_KEY) || DEFAULT_SUPABASE_URL;
let supabaseKey = loadText(SUPABASE_KEY_KEY) || DEFAULT_SUPABASE_KEY;
let monthlyBudgetLimit = loadNumber(MONTHLY_BUDGET_KEY, 5000);
let email = loadText(EMAIL_KEY);
let password = loadText(PASSWORD_KEY);
let selectedTheme = normalizeTheme(loadText(THEME_KEY));
let expenseCategories = [];
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
let historyDeleteHoldTimer = 0;
let historyDeleteSuppressClick = false;
let pendingDeleteExpenseRecord = null;
let pendingDeleteCategoryPath = null;
let pendingAddCategoryParentPath = null;
let selectedPurpose = "";
let selectedCategoryPath = [];
let currentCategoryNodes = [];
let currentCategoryPath = [];
let currentCategoryDepth = 0;
let categorySettingsOpenKeys = new Set();
let currentSession = null;
let isAuthHydrating = false;
let hasCompletedInitialAuthHydration = false;
let hasStartupExpenseHistory = false;
let displayedRemaining = null;
let remainingAnimationFrame = 0;
let stagedGaugeAnimationFrame = 0;
let gaugeAnimationToken = 0;
let hasPlayedInitialGaugeAnimation = false;
let shouldReplayGaugeAnimationOnVisible = false;
let supabase = createSupabaseClient(supabaseUrl, supabaseKey);
let isBudgetOnlySettingsMode = false;
let activeMainView = "home";
let isExpenseMode = false;
let isQuickExpenseMode = false;
let editingExpenseRecord = null;
let pageTransitionTimer = 0;
let expenseStatsChart = null;
let expenseStatsResizeFrame = 0;
let expenseStatsCenterFrame = 0;
let expenseStatsCurrentTotal = 0;
let expenseStatsChartWidth = 0;
let expenseStatsChartHeight = 0;
let sunburstTestChart = null;
let latestReleaseInfo = null;
let lastTouchY = 0;
let viewportMetricsFrame = 0;
let focusedEditable = null;
let stableViewportWidth = 0;
let stableViewportHeight = 0;
let selectedExpenseDateTime = new Date();
let pickerDraftDateTime = new Date();
const timeWheelScrollTimers = new Map();
const GAUGE_CX = 210;
const GAUGE_CY = 210;
const GAUGE_RADIUS = 154;
const GAUGE_START_ANGLE = -135;
const GAUGE_END_ANGLE = 135;
const CATEGORY_ICON_PATHS = {
  food: `
    <path d="M8 9.5h8v2.2a4 4 0 0 1-8 0Z"></path>
    <path d="M6.5 9.5h11"></path>
    <path d="M9 6.8c.8-.7.8-1.3 0-2"></path>
    <path d="M12 6.8c.8-.7.8-1.3 0-2"></path>
    <path d="M15 6.8c.8-.7.8-1.3 0-2"></path>
    <path d="M10 16h4"></path>
  `,
  transport: `
    <path d="M6.5 15.5h11V9.3c0-1.2-.9-2.2-2.1-2.4A20 20 0 0 0 12 6.6c-1.2 0-2.4.1-3.4.3-1.2.2-2.1 1.2-2.1 2.4Z"></path>
    <path d="M8 15.5 6.8 18"></path>
    <path d="M16 15.5l1.2 2.5"></path>
    <path d="M8.4 10h7.2"></path>
    <circle cx="9" cy="13.1" r=".8"></circle>
    <circle cx="15" cy="13.1" r=".8"></circle>
  `,
  shopping: `
    <path d="M7.2 9.2h9.6l.8 9.1H6.4Z"></path>
    <path d="M9.2 9.2a2.8 2.8 0 0 1 5.6 0"></path>
    <path d="M9.2 12v.1"></path>
    <path d="M14.8 12v.1"></path>
  `,
  home: `
    <path d="M5.5 11.2 12 5.7l6.5 5.5"></path>
    <path d="M7.2 10.5v7.2h9.6v-7.2"></path>
    <path d="M10.5 17.7v-4h3v4"></path>
  `,
  fun: `
    <circle cx="12" cy="12" r="5.8"></circle>
    <circle cx="9.5" cy="10" r=".7"></circle>
    <circle cx="14.5" cy="10" r=".7"></circle>
    <circle cx="10" cy="14.1" r=".7"></circle>
    <circle cx="14" cy="14.1" r=".7"></circle>
    <circle cx="12" cy="12" r=".7"></circle>
  `,
  health: `
    <path d="M12 5.8c1.9-2 5.3-.8 5.3 2.2 0 3.4-5.3 7.3-5.3 7.3S6.7 11.4 6.7 8c0-3 3.4-4.2 5.3-2.2Z"></path>
    <path d="M12 8.1v5"></path>
    <path d="M9.5 10.6h5"></path>
    <path d="M8.2 18.2h7.6"></path>
  `,
  other: `
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <circle cx="15.5" cy="8.5" r="1.5"></circle>
    <circle cx="8.5" cy="15.5" r="1.5"></circle>
    <circle cx="15.5" cy="15.5" r="1.5"></circle>
  `,
};
const EXPENSE_CATEGORIES = [
  {
    id: "food",
    label: "餐饮",
    icon: "food",
    children: [
      { id: "breakfast", label: "早餐", icon: "food" },
      { id: "lunch", label: "午餐", icon: "food", children: [
        { id: "lunch-hotpot", label: "火锅", icon: "food" },
        { id: "lunch-barbeque", label: "烤肉", icon: "food" },
        { id: "lunch-stir-fry", label: "炒菜", icon: "food" },
        { id: "lunch-snack", label: "小吃", icon: "food" },
      ] },
      { id: "dinner", label: "晚餐", icon: "food", children: [
        { id: "dinner-hotpot", label: "火锅", icon: "food" },
        { id: "dinner-barbeque", label: "烤肉", icon: "food" },
        { id: "dinner-stir-fry", label: "炒菜", icon: "food" },
        { id: "dinner-snack", label: "小吃", icon: "food" },
      ] },
      { id: "snack", label: "零食", icon: "food" },
    ],
  },
  {
    id: "transport",
    label: "交通",
    icon: "transport",
    children: [
      { id: "bus", label: "公交", icon: "transport" },
      { id: "subway", label: "地铁", icon: "transport" },
      { id: "taxi", label: "打车", icon: "transport" },
      { id: "train", label: "火车", icon: "transport" },
      { id: "flight", label: "机票", icon: "transport" },
      { id: "transport-other", label: "其他", icon: "other" },
    ],
  },
  {
    id: "shopping",
    label: "购物",
    icon: "shopping",
    children: [
      { id: "daily", label: "日用品", icon: "shopping" },
      { id: "clothes", label: "衣物", icon: "shopping" },
      { id: "digital", label: "数码", icon: "shopping" },
      { id: "skincare", label: "护肤", icon: "shopping" },
      { id: "appliance", label: "家电", icon: "shopping" },
      { id: "shopping-other", label: "其他", icon: "other" },
    ],
  },
  {
    id: "home",
    label: "住房",
    icon: "home",
    children: [
      { id: "rent", label: "房租", icon: "home" },
      { id: "utilities", label: "水电", icon: "home" },
      { id: "property", label: "物业", icon: "home" },
      { id: "repair", label: "维修", icon: "home" },
      { id: "furniture", label: "家具", icon: "home" },
      { id: "home-other", label: "其他", icon: "other" },
    ],
  },
  {
    id: "fun",
    label: "娱乐",
    icon: "fun",
    children: [
      { id: "movie", label: "电影", icon: "fun" },
      { id: "game", label: "游戏", icon: "fun" },
      { id: "membership", label: "会员", icon: "fun" },
      { id: "sport", label: "运动", icon: "fun" },
      { id: "travel", label: "旅行", icon: "fun" },
      { id: "fun-other", label: "其他", icon: "other" },
    ],
  },
  {
    id: "health",
    label: "健康",
    icon: "health",
    children: [
      { id: "medical", label: "医疗", icon: "health" },
      { id: "fitness", label: "健身", icon: "health" },
      { id: "health-other", label: "其他", icon: "other" },
    ],
  },
];
const CATEGORY_START_ANGLE = -90;
const CATEGORY_BUTTON_RADIUS = 31;
const PREVIOUS_STATS_CATEGORY_COLORS = [
  "rgb(56, 131, 110)",
  "rgb(104, 176, 149)",
  "rgb(242, 129, 129)",
  "rgb(249, 154, 130)",
];
const STATS_CATEGORY_COLORS = [
  "rgb(151, 192, 173)",
  "rgb(162,209,166)",
  "rgb(189,223,151)",
  "rgb(228,223,134)",
  "#F2A7A0",
  "#D8D6D2",
];

const SUNBURST_TEST_DATA = [
  {
    name: "餐饮",
    value: 520,
    children: [
      { name: "早餐", value: 80 },
      {
        name: "午餐",
        value: 180,
        children: [
          { name: "火锅", value: 90 },
          { name: "小吃", value: 50 },
          { name: "饮料", value: 40 },
        ],
      },
      { name: "晚餐", value: 210 },
      { name: "零食", value: 50 },
    ],
  },
  {
    name: "购物",
    value: 360,
    children: [
      { name: "衣物", value: 160 },
      { name: "日用品", value: 90 },
      { name: "数码", value: 110 },
    ],
  },
  {
    name: "住房",
    value: 280,
    children: [
      { name: "房租", value: 180 },
      { name: "水电", value: 60 },
      { name: "网络", value: 40 },
    ],
  },
  {
    name: "娱乐",
    value: 210,
    children: [
      { name: "电影", value: 70 },
      { name: "游戏", value: 80 },
      { name: "会员", value: 60 },
    ],
  },
];

expenseCategories = loadExpenseCategories();

initialize();

async function initialize() {
  latestReleaseInfo = null;
  applyTheme(selectedTheme);
  applyReleaseBadgeState(null);
  setupGauge();
  resetCategoryState();
  setHistoryRange(historyRange, false);
  setActiveMainView("home");
  isAuthHydrating = Boolean(supabase);
  updateConnectionStatus();
  setGaugeMode(false);
  disableDataScopeButton();
  setupKeyboardViewport();
  hydrateInitialExpenseHistory();
  playInitialGaugeAnimation();

  openExpenseModalBtn.addEventListener("click", handleGaugeCenterClick);
  remainingBudgetEl.addEventListener("click", handleGaugeCenterClick);
  usageTextEl.addEventListener("click", handleGaugeCenterClick);
  usageTextEl.addEventListener("keydown", handleUsageTextKeydown);
  gaugePage?.addEventListener("click", handleGaugePageClick);
  homeTabBtn.addEventListener("click", openHomeView);
  openHistoryBtn.addEventListener("click", openHistoryModal);
  openStatsBtn.addEventListener("click", openStatsModal);
  openSunburstTestBtn.addEventListener("click", openSunburstTestModal);
  openSettingsBtn.addEventListener("click", toggleReleaseInfoFromTopMenu);
  bottomSettingsBtn.addEventListener("click", () => openSettingsModal());
  connectionStatusEl.addEventListener("click", openConnectionSettingsModal);
  clearExpenseAmountBtn.addEventListener("click", clearExpenseAmount);
  cancelExpenseBtn.addEventListener("click", closeExpenseModal);
  confirmExpenseBtn.addEventListener("click", confirmExpense);
  categoryBackBtn.addEventListener("click", stepCategoryBack);
  cancelSettingsBtn.addEventListener("click", closeSettingsModal);
  logoutSettingsBtn.addEventListener("click", signOutToLocalMode);
  saveSettingsBtn.addEventListener("click", saveSettings);
  settingsBackdrop.addEventListener("click", closeSettingsModal);
  closeHistoryBtn.addEventListener("click", closeHistoryModal);
  historyBackdrop.addEventListener("click", closeHistoryModal);
  statsBackdrop.addEventListener("click", closeStatsModal);
  sunburstTestBackdrop.addEventListener("click", closeSunburstTestModal);
  deleteConfirmBackdrop.addEventListener("click", closeDeleteConfirmModal);
  cancelDeleteExpenseBtn.addEventListener("click", closeDeleteConfirmModal);
  confirmDeleteExpenseBtn.addEventListener("click", confirmPendingDelete);
  categoryAddBackdrop.addEventListener("click", closeCategoryAddModal);
  cancelCategoryAddBtn.addEventListener("click", closeCategoryAddModal);
  confirmCategoryAddBtn.addEventListener("click", confirmPendingAddCategory);
  categoryAddInput.addEventListener("keydown", handleCategoryAddInputKeydown);
  historyTodayBtn.addEventListener("click", () => setHistoryRange("today"));
  historyMonthBtn.addEventListener("click", () => setHistoryRange("month"));
  historyCard.addEventListener("touchstart", handleHistorySwipeStart, { passive: true });
  historyCard.addEventListener("touchmove", handleHistorySwipeMove, { passive: false });
  historyCard.addEventListener("touchend", handleHistorySwipeEnd, { passive: true });
  historyCard.addEventListener("touchcancel", handleHistorySwipeCancel, { passive: true });
  themeButtons.forEach((button) => button.addEventListener("click", () => setTheme(button.dataset.themeValue)));
  addRootCategoryBtn?.addEventListener("click", () => promptAddCategory([]));
  syncCategoriesBtn?.addEventListener("click", syncCategoriesFromMenu);
  categorySettingsTree?.addEventListener("click", handleCategorySettingsClick);
  closeReleaseInfoBtn.addEventListener("click", closeReleaseInfoModal);
  releaseInfoBackdrop.addEventListener("click", closeReleaseInfoModal);
  expenseDateTimeTrigger.addEventListener("click", openDateTimePicker);
  remainingBudgetEl.addEventListener("input", handleQuickExpenseTextInput);
  remainingBudgetEl.addEventListener("keydown", handleQuickExpenseInputKeydown);
  quickExpenseContinueBtn?.addEventListener("click", continueQuickExpenseEntry);
  recordAmountField?.addEventListener("pointerdown", handleRecordAmountPointerDown);
  recordAmountField?.addEventListener("click", handleRecordAmountClick);
  expenseAmountInput.addEventListener("keydown", handleExpenseInputKeydown);
  expensePurposeInput.addEventListener("keydown", handleExpenseInputKeydown);
  expensePurposeInput.addEventListener("input", syncPurposeSelection);
  pickerPrevMonthBtn.addEventListener("click", () => stepDateTimePicker("month", -1));
  pickerNextMonthBtn.addEventListener("click", () => stepDateTimePicker("month", 1));
  dateTimePickerModal.addEventListener("click", handleDateTimePickerBackdropClick);
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

function setupKeyboardViewport() {
  syncViewportMetrics();

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewportMetrics);
    window.visualViewport.addEventListener("scroll", syncViewportMetrics);
  }

  window.addEventListener("resize", syncViewportMetrics);
  document.addEventListener("focusin", handleEditableFocusIn);
  document.addEventListener("focusout", handleEditableFocusOut);
}

function syncViewportMetrics() {
  if (viewportMetricsFrame) {
    return;
  }

  viewportMetricsFrame = requestAnimationFrame(() => {
    viewportMetricsFrame = 0;
    if (isQuickExpenseMode) {
      document.documentElement.style.setProperty("--keyboard-inset", "0px");
      document.body.classList.remove("keyboard-open");
      return;
    }

    const viewport = window.visualViewport;
    const viewportWidth = Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth);
    const viewportHeight = Math.max(320, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight));
    const layoutHeight = Math.round(window.innerHeight || viewportHeight);
    const viewportTop = Math.round(viewport?.offsetTop || 0);
    const rawKeyboardInset = Math.max(0, layoutHeight - viewportHeight - viewportTop);
    const hasEditableFocus = Boolean(focusedEditable);
    const viewportWidthChanged = Math.abs(viewportWidth - stableViewportWidth) > 80;

    if (!stableViewportHeight || viewportWidthChanged || !hasEditableFocus) {
      stableViewportWidth = viewportWidth;
      stableViewportHeight = Math.max(320, layoutHeight, viewportHeight);
    }

    const lockedKeyboardInset = hasEditableFocus
      ? Math.max(0, stableViewportHeight - viewportHeight - viewportTop)
      : 0;
    const keyboardInset = Math.max(rawKeyboardInset, lockedKeyboardInset);
    const isKeyboardOpen = keyboardInset > 80;

    document.documentElement.style.setProperty("--app-viewport-height", `${stableViewportHeight}px`);
    document.documentElement.style.setProperty("--keyboard-inset", `${keyboardInset}px`);
    document.body.classList.toggle("keyboard-open", isKeyboardOpen);

    if (focusedEditable) {
      requestAnimationFrame(() => scrollFocusedControlIntoView(focusedEditable));
    }

    scheduleExpenseStatsResize();
  });
}

function handleEditableFocusIn(event) {
  if (!isKeyboardEditable(event.target)) {
    return;
  }

  if (isQuickExpenseMode && event.target === remainingBudgetEl) {
    focusedEditable = null;
    document.documentElement.style.setProperty("--keyboard-inset", "0px");
    document.body.classList.remove("keyboard-open");
    return;
  }

  focusedEditable = event.target;
  stableViewportWidth = Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth);
  stableViewportHeight = Math.max(
    stableViewportHeight,
    320,
    Math.round(window.innerHeight || 0),
    Math.round(window.visualViewport?.height || 0),
    Math.round(document.documentElement.clientHeight || 0),
  );
  document.documentElement.style.setProperty("--app-viewport-height", `${stableViewportHeight}px`);
  syncViewportMetrics();
  window.setTimeout(() => scrollFocusedControlIntoView(focusedEditable), 80);
  window.setTimeout(() => scrollFocusedControlIntoView(focusedEditable), 300);
}

function handleEditableFocusOut(event) {
  if (focusedEditable !== event.target) {
    return;
  }

  window.setTimeout(() => {
    if (!isKeyboardEditable(document.activeElement)) {
      focusedEditable = null;
      syncViewportMetrics();
    }
  }, 80);
}

function isKeyboardEditable(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }

  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(target.type);
}

function isRecordHeaderEditable(target) {
  return Boolean(
    target
      && document.body.dataset.mode === "record"
      && target instanceof HTMLElement
      && target.closest(".record-head-content"),
  );
}

function scrollFocusedControlIntoView(control) {
  if (!control || !document.contains(control)) {
    return;
  }

  if (isRecordHeaderEditable(control)) {
    return;
  }

  const scrollable = control.closest(".settings-card, .expense-card");
  if (!scrollable) {
    return;
  }

  const viewport = window.visualViewport;
  const visualTop = viewport?.offsetTop || 0;
  const visualBottom = visualTop + (viewport?.height || window.innerHeight || document.documentElement.clientHeight);
  const rect = control.getBoundingClientRect();
  const bottomGap = 28;
  const topGap = 18;

  if (rect.bottom > visualBottom - bottomGap) {
    scrollable.scrollTop += rect.bottom - visualBottom + bottomGap;
    return;
  }

  if (rect.top < visualTop + topGap) {
    scrollable.scrollTop -= visualTop + topGap - rect.top;
  }
}

function openExpenseModal(options = {}) {
  stopGaugeAmountAnimation();
  const editRecord = options.editRecord || null;
  const initialAmount = editRecord ? "" : formatOptionalNumberInput(sanitizeNumber(options.initialAmount));
  const shouldCloseQuickAfterRecordMode = isQuickExpenseMode;
  if (!shouldCloseQuickAfterRecordMode) {
    closeQuickExpenseEntry({ render: false, focus: false });
  }
  hidePageView(settingsModal);
  hidePageView(historyModal);
  hidePageView(statsModal);
  hidePageView(sunburstTestModal);
  hidePageView(releaseInfoModal);
  setActiveMainView("home");
  isExpenseMode = true;
  editingExpenseRecord = editRecord;
  document.body.dataset.mode = "record";
  if (shouldCloseQuickAfterRecordMode) {
    closeQuickExpenseEntry({ render: false, focus: false });
  }
  const editDate = editRecord ? new Date(editRecord.time || "") : null;
  selectedExpenseDateTime = editDate && !Number.isNaN(editDate.getTime()) ? editDate : new Date();
  syncDateTimeTriggerLabel();
  closeDateTimePicker();
  expenseAmountInput.value = editRecord ? formatOptionalNumberInput(Number(editRecord.amount || 0)) : initialAmount;
  expensePurposeInput.value = editRecord ? formatCategoryPathInput(getRecordPurposeList(editRecord)) : "";
  expenseStatus.textContent = editRecord
    ? "正在修改这笔消费"
    : currentSession ? "" : "当前未登录，保存将只写入本地历史";
  resetCategoryState();
}

function closeExpenseModal(options = {}) {
  closeDateTimePicker();
  isExpenseMode = false;
  editingExpenseRecord = null;
  if (document.body.dataset.mode === "record") {
    delete document.body.dataset.mode;
  }
  if (options.render !== false) {
    renderGaugeState(false);
  }
  if (options.focus !== false) {
    openExpenseModalBtn.focus();
  }
}

function openQuickExpenseEntry() {
  if (isExpenseMode || activeMainView !== "home") {
    return;
  }

  stopGaugeAmountAnimation();
  isQuickExpenseMode = true;
  document.body.classList.add("quick-expense-mode");
  centerLabelEl.textContent = "消费";
  quickExpenseAmountInput.value = "";
  remainingBudgetEl.textContent = "";
  remainingBudgetEl.contentEditable = "true";
  remainingBudgetEl.inputMode = "decimal";
  remainingBudgetEl.enterKeyHint = "next";
  remainingBudgetEl.setAttribute("role", "textbox");
  remainingBudgetEl.setAttribute("aria-label", "消费金额");
  remainingBudgetEl.dataset.placeholder = "0.00";
  syncQuickExpenseContinueState();
  focusQuickExpenseAmountInput();
}

function closeQuickExpenseEntry(options = {}) {
  if (!isQuickExpenseMode) {
    return;
  }

  isQuickExpenseMode = false;
  document.body.classList.remove("quick-expense-mode");
  quickExpenseAmountInput.value = "";
  remainingBudgetEl.contentEditable = "false";
  remainingBudgetEl.removeAttribute("inputmode");
  remainingBudgetEl.removeAttribute("enterkeyhint");
  remainingBudgetEl.removeAttribute("role");
  remainingBudgetEl.removeAttribute("aria-label");
  remainingBudgetEl.removeAttribute("data-placeholder");
  syncQuickExpenseContinueState();
  remainingBudgetEl.blur();
  centerLabelEl.textContent = "今日剩余";

  if (options.render !== false) {
    renderGaugeState(false);
  }

  if (options.focus) {
    remainingBudgetEl.focus?.();
  }
}

function continueQuickExpenseEntry(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const amount = getQuickExpenseAmount();

  if (amount <= 0) {
    syncQuickExpenseContinueState();
    focusQuickExpenseAmountInput();
    return;
  }

  document.body.classList.add("quick-expense-committing");
  openExpenseModal({ initialAmount: amount });
  requestAnimationFrame(() => {
    document.body.classList.remove("quick-expense-committing");
  });
}

function syncQuickExpenseContinueState() {
  if (!quickExpenseContinueBtn) {
    return;
  }

  quickExpenseContinueBtn.disabled = getQuickExpenseAmount() <= 0;
}

function handleQuickExpenseInputKeydown(event) {
  if (event.key === "Enter") {
    continueQuickExpenseEntry(event);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeQuickExpenseEntry();
  }
}

function focusQuickExpenseAmountInput() {
  remainingBudgetEl.focus({ preventScroll: true });
  moveCaretToEditableEnd(remainingBudgetEl);
}

function getQuickExpenseAmount() {
  return sanitizeNumber(remainingBudgetEl.textContent.replace(/[^\d.]/g, ""));
}

function moveCaretToEditableEnd(element) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function handleQuickExpenseTextInput() {
  if (!isQuickExpenseMode) {
    return;
  }

  const normalized = remainingBudgetEl.textContent
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");

  if (remainingBudgetEl.textContent !== normalized) {
    remainingBudgetEl.textContent = normalized;
    moveCaretToEditableEnd(remainingBudgetEl);
  }

  syncQuickExpenseContinueState();
}

function clearExpenseAmount() {
  expenseAmountInput.value = "";
  focusExpenseAmountInput();
}

function handleRecordAmountPointerDown(event) {
  if (event.pointerType === "mouse" || document.body.dataset.mode !== "record") {
    return;
  }

  focusExpenseAmountInput();
}

function handleRecordAmountClick() {
  if (document.body.dataset.mode !== "record") {
    return;
  }

  focusExpenseAmountInput();
}

function focusExpenseAmountInput() {
  expenseAmountInput.focus({ preventScroll: true });

  const valueLength = expenseAmountInput.value.length;
  try {
    expenseAmountInput.setSelectionRange(valueLength, valueLength);
  } catch {
    // Number inputs do not support text selection in every browser.
  }
}

function handleGaugeCenterClick(event) {
  const target = event.target;

  if (target instanceof Element && target.closest("#usageText")) {
    event.preventDefault();
    event.stopPropagation();
    openBudgetSettingsFromGauge();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openQuickExpenseEntry();
}

function handleUsageTextKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  handleGaugeCenterClick(event);
}

function handleGaugePageClick(event) {
  if (!isQuickExpenseMode) {
    return;
  }

  const target = event.target;

  if (
    target instanceof Element
    && (
      target.closest(".gauge-center")
      || target.closest("#quickExpenseContinueBtn")
      || target.closest(".bottom-nav")
    )
  ) {
    return;
  }

  closeQuickExpenseEntry();
}

function normalizeTheme(value) {
  return THEMES.has(value) ? value : "forest";
}

function applyTheme(theme) {
  selectedTheme = normalizeTheme(theme);
  document.body.dataset.theme = selectedTheme;

  themeButtons.forEach((button) => {
    const isActive = button.dataset.themeValue === selectedTheme;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
}

function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, selectedTheme);
}

function setActiveMainView(nextView) {
  if (nextView !== "home" && isExpenseMode) {
    closeExpenseModal({ focus: false });
  }

  if (nextView !== "home" && isQuickExpenseMode) {
    closeQuickExpenseEntry({ render: false, focus: false });
  }

  activeMainView = nextView;
  document.body.dataset.view = nextView;
  homeTabBtn.classList.toggle("active", nextView === "home");
  openHistoryBtn.classList.toggle("active", nextView === "history");
  openStatsBtn.classList.toggle("active", nextView === "stats");
  openSunburstTestBtn.classList.toggle("active", nextView === "sunburst-test");
  bottomSettingsBtn.classList.toggle("active", nextView === "settings");
  openSettingsBtn.classList.toggle("is-active", nextView === "release");
  homeTabBtn.toggleAttribute("aria-current", nextView === "home");
  openHistoryBtn.toggleAttribute("aria-current", nextView === "history");
  openStatsBtn.toggleAttribute("aria-current", nextView === "stats");
  openSunburstTestBtn.toggleAttribute("aria-current", nextView === "sunburst-test");
  bottomSettingsBtn.toggleAttribute("aria-current", nextView === "settings");
  openSettingsBtn.setAttribute("aria-expanded", String(nextView === "release"));
}

function showPageView(pageEl, { animate = false } = {}) {
  if (pageTransitionTimer) {
    window.clearTimeout(pageTransitionTimer);
    pageTransitionTimer = 0;
  }

  pageEl.hidden = false;
  pageEl.classList.add("is-page-view");
  pageEl.classList.toggle("is-animated", animate);
  pageEl.classList.remove("is-visible");
  pageEl.getBoundingClientRect();
  requestAnimationFrame(() => {
    pageEl.classList.add("is-visible");
  });
}

function hidePageView(pageEl, { animate = false } = {}) {
  if (pageTransitionTimer) {
    window.clearTimeout(pageTransitionTimer);
    pageTransitionTimer = 0;
  }

  pageEl.classList.remove("is-visible");

  const finish = () => {
    pageEl.hidden = true;
    pageEl.classList.remove("is-page-view");
    pageEl.classList.remove("is-animated");
  };

  if (animate && pageEl.classList.contains("is-page-view") && pageEl.classList.contains("is-animated")) {
    pageTransitionTimer = window.setTimeout(() => {
      pageTransitionTimer = 0;
      finish();
    }, 300);
    return;
  }

  finish();
}

function openHomeView() {
  closeQuickExpenseEntry({ render: false, focus: false });
  hidePageView(settingsModal);
  hidePageView(historyModal);
  hidePageView(statsModal);
  hidePageView(sunburstTestModal);
  hidePageView(releaseInfoModal);
  settingsCard.classList.remove("budget-only");
  settingsCard.classList.remove("connection-only");
  isBudgetOnlySettingsMode = false;
  handleHistorySwipeCancel();
  setActiveMainView("home");
  renderGauge();
}

function toggleReleaseInfoFromTopMenu() {
  if (!releaseInfoModal.hidden && activeMainView === "release") {
    closeReleaseInfoModal({ animate: true });
    return;
  }

  openReleaseInfoModal({ animate: true });
}

function openSettingsModal(mode = "full", options = {}) {
  closeQuickExpenseEntry({ render: false, focus: false });
  isBudgetOnlySettingsMode = mode === "budget";
  hidePageView(historyModal);
  hidePageView(statsModal);
  hidePageView(sunburstTestModal);
  hidePageView(releaseInfoModal);
  showPageView(settingsModal, options);
  settingsCard.classList.toggle("budget-only", isBudgetOnlySettingsMode);
  settingsCard.classList.toggle("connection-only", mode === "connection");
  settingsCard.setAttribute("role", "region");
  settingsCard.removeAttribute("aria-modal");
  settingsModalTitle.textContent = isBudgetOnlySettingsMode ? "额度设置" : "账户设置";
  setActiveMainView("settings");
  supabaseUrlInput.value = supabaseUrl;
  supabaseKeyInput.value = supabaseKey;
  emailInput.value = email;
  passwordInput.value = password;
  monthlyBudgetInput.value = formatOptionalNumberInput(monthlyBudgetLimit);
  settingsStatus.textContent = isBudgetOnlySettingsMode
    ? "设置每月总额度"
    : mode === "connection"
      ? "设置 Supabase 连接信息"
      : currentSession ? "已连接 Supabase" : "当前未登录，请在这里登录同步数据";

  if (isBudgetOnlySettingsMode) {
    return;
  }
}

function openBudgetSettingsFromGauge() {
  openSettingsModal("budget");
}

function openConnectionSettingsModal() {
  openSettingsModal("connection");
}

function closeSettingsModal(options = {}) {
  hidePageView(settingsModal, options);
  settingsCard.setAttribute("role", "dialog");
  settingsCard.setAttribute("aria-modal", "true");
  settingsCard.classList.remove("budget-only");
  settingsCard.classList.remove("connection-only");
  isBudgetOnlySettingsMode = false;
  setActiveMainView("home");
  renderGauge();
  openSettingsBtn.focus();
}

async function openHistoryModal() {
  closeQuickExpenseEntry({ render: false, focus: false });
  renderHistory();
  hidePageView(settingsModal);
  hidePageView(statsModal);
  hidePageView(sunburstTestModal);
  hidePageView(releaseInfoModal);
  showPageView(historyModal);
  historyCard.setAttribute("role", "region");
  historyCard.removeAttribute("aria-modal");
  setActiveMainView("history");
  applyHistoryPagerPosition(false);
}

function closeHistoryModal() {
  closeDeleteConfirmModal();
  hidePageView(historyModal);
  historyCard.setAttribute("role", "dialog");
  historyCard.setAttribute("aria-modal", "true");
  setActiveMainView("home");
  renderGauge();
  openHistoryBtn.focus();
}

function openStatsModal() {
  closeQuickExpenseEntry({ render: false, focus: false });
  resetExpenseStatsChart();
  hidePageView(settingsModal);
  hidePageView(historyModal);
  hidePageView(sunburstTestModal);
  hidePageView(releaseInfoModal);
  showPageView(statsModal);
  statsCard.setAttribute("role", "region");
  statsCard.removeAttribute("aria-modal");
  setActiveMainView("stats");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (statsModal?.hidden) {
        return;
      }

      renderExpenseStats({ prepareInitialAnimation: true, resizeAfterRender: false });
    });
  });
}

function closeStatsModal() {
  hidePageView(statsModal);
  statsCard.setAttribute("role", "dialog");
  statsCard.setAttribute("aria-modal", "true");
  setActiveMainView("home");
  renderGauge();
  openStatsBtn.focus();
}

function openSunburstTestModal() {
  closeQuickExpenseEntry({ render: false, focus: false });
  hidePageView(settingsModal);
  hidePageView(historyModal);
  hidePageView(statsModal);
  hidePageView(releaseInfoModal);
  showPageView(sunburstTestModal);
  sunburstTestCard.setAttribute("role", "region");
  sunburstTestCard.removeAttribute("aria-modal");
  setActiveMainView("sunburst-test");
  requestAnimationFrame(() => {
    if (sunburstTestModal?.hidden) {
      return;
    }

    renderSunburstTestChart();
  });
}

function closeSunburstTestModal() {
  hidePageView(sunburstTestModal);
  sunburstTestCard.setAttribute("role", "dialog");
  sunburstTestCard.setAttribute("aria-modal", "true");
  setActiveMainView("home");
  renderGauge();
  openSunburstTestBtn.focus();
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

function openReleaseInfoModal(options = {}) {
  closeQuickExpenseEntry({ render: false, focus: false });
  currentVersionValue.textContent = APP_RELEASE_TAG;
  renderCategorySettings();

  if (latestReleaseInfo?.downloadUrl) {
    releaseInfoStatus.innerHTML = `发现新版本 <strong>${escapeHtml(latestReleaseInfo.tag)}</strong>，前往更新`;
    releaseInfoStatus.classList.add("is-update");
    releaseGithubLink.href = latestReleaseInfo.downloadUrl;
    releaseBaiduLink.href = "https://pan.baidu.com/s/1zKfk8u8o7KXZt4xQrNx8Dg?pwd=6666";
    releaseDownloadChoices.hidden = false;
  } else {
    releaseInfoStatus.textContent = "当前已是最新版本";
    releaseInfoStatus.classList.remove("is-update");
    releaseDownloadChoices.hidden = true;
  }

  hidePageView(settingsModal);
  hidePageView(historyModal);
  hidePageView(statsModal);
  hidePageView(sunburstTestModal);
  showPageView(releaseInfoModal, options);
  releaseInfoModal.classList.add("is-page-view");
  releaseInfoModal.classList.toggle("is-animated", Boolean(options.animate));
  releaseInfoModal.querySelector(".release-info-card")?.setAttribute("role", "region");
  releaseInfoModal.querySelector(".release-info-card")?.removeAttribute("aria-modal");
  setActiveMainView("release");
}

function closeReleaseInfoModal(options = {}) {
  closeCategoryAddModal();
  hidePageView(releaseInfoModal, options);
  releaseInfoModal.querySelector(".release-info-card")?.setAttribute("role", "dialog");
  releaseInfoModal.querySelector(".release-info-card")?.setAttribute("aria-modal", "true");
  setActiveMainView("home");
  renderGauge();
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

  if (editingExpenseRecord) {
    await updateExpenseRecord(editingExpenseRecord, {
      amount,
      purpose: purposeList.join(" "),
      category: purposeList.length ? purposeList : null,
      time: timestamp,
    });
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

  expenseStatus.textContent = "";
  closeExpenseModal({ render: false });
  renderGauge();
  if (!historyModal.hidden) {
    renderHistory();
  }
  refreshStatsIfVisible();

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
    refreshStatsIfVisible();
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
    await refreshExpenseCategories();
    await refreshExpenses();
    settingsStatus.textContent = shouldAttemptSignIn ? "保存并登录成功" : "设置已保存，当前保持已登录";
  } else {
    expenseCategories = loadExpenseCategories();
    resetCategoryState();
    renderGauge();
    settingsStatus.textContent = shouldAttemptSignIn ? "设置已保存，但 Supabase 登录失败" : "已保存，当前未登录";
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
  expenseCategories = loadExpenseCategories();
  resetCategoryState();
  renderCategorySettings();
  expenseHistory = loadHistory();
  scheduleMonthHistorySummaryForCurrentData();
  updateConnectionStatus();
  disableDataScopeButton();
  renderGauge();

  if (!historyModal.hidden) {
    renderHistory();
  }
  refreshStatsIfVisible();

  settingsStatus.textContent = "已退出账号，当前未登录";
  logoutSettingsBtn.disabled = false;
  closeSettingsModal();
}

async function hydrateSupabaseState() {
  isAuthHydrating = Boolean(supabase);
  updateConnectionStatus();

  if (!supabase) {
    currentSession = null;
    isAuthHydrating = false;
    hasCompletedInitialAuthHydration = true;
    expenseCategories = loadExpenseCategories();
    resetCategoryState();
    expenseHistory = loadHistory();
    scheduleMonthHistorySummaryForCurrentData();
    updateConnectionStatus();
    disableDataScopeButton();
    renderGaugeState(false);
    refreshStatsIfVisible();
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    currentSession = data.session || null;

    if (currentSession?.user?.email) {
      email = currentSession.user.email;
      localStorage.setItem(EMAIL_KEY, email);
    }

    disableDataScopeButton();

    if (currentSession) {
      isAuthHydrating = false;
      hasCompletedInitialAuthHydration = true;
      updateConnectionStatus();
      await refreshExpenseCategories();
      await refreshExpenses("month", { animate: true, fromFull: false });
      return;
    }

    isAuthHydrating = false;
    hasCompletedInitialAuthHydration = true;
    expenseCategories = loadExpenseCategories();
    resetCategoryState();
    expenseHistory = loadHistory();
    scheduleMonthHistorySummaryForCurrentData();
    updateConnectionStatus();
    renderGaugeState(false);
    refreshStatsIfVisible();
  } catch {
    currentSession = null;
    isAuthHydrating = false;
    hasCompletedInitialAuthHydration = true;
    expenseCategories = loadExpenseCategories();
    resetCategoryState();
    expenseHistory = loadHistory();
    scheduleMonthHistorySummaryForCurrentData();
    updateConnectionStatus();
    disableDataScopeButton();
    renderGaugeState(false);
    refreshStatsIfVisible();
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
    const response = await fetch(`${REMOTE_APP_VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });

    if (!response.ok) {
      latestReleaseInfo = null;
      clearCachedReleaseInfo();
      applyReleaseBadgeState(null);
      return;
    }

    const latestTag = parseRemotePackageVersion(await response.text());

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

function normalizeReleaseVersion(tag) {
  return tag
    .trim()
    .replace(/^[vV]/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function parseRemotePackageVersion(source) {
  try {
    const parsed = JSON.parse(String(source || ""));
    const version = String(parsed?.version || "").trim();
    return version ? `v${version.replace(/^[vV]/, "")}` : "";
  } catch {
    return "";
  }
}

function applyReleaseBadgeState(releaseInfo) {
  const hasUpdate = Boolean(releaseInfo?.downloadUrl);

  openSettingsBtn.classList.toggle("is-update", hasUpdate);
  openSettingsBtn.setAttribute(
    "aria-label",
    hasUpdate ? `发现新版本 ${releaseInfo.tag}，打开版本信息` : "打开版本信息",
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

function renderCategoryWheel(categories = expenseCategories, options = {}) {
  if (!purposeWheel || !categoryOptions || !categoryDividers) {
    return;
  }

  const shouldAnimate = Boolean(options.animate);
  const normalizedCategories = categories.filter((category) => category?.label);
  const count = normalizedCategories.length;
  currentCategoryNodes = normalizedCategories;
  currentCategoryDepth = currentCategoryPath.length;
  categoryOptions.classList.remove("is-entering");
  categoryDividers.classList.remove("is-entering");
  categoryOptions.innerHTML = "";
  categoryDividers.innerHTML = "";
  purposeOptions = [];

  if (!count) {
    purposeWheel.style.background = "transparent";
    purposeWheel.dataset.activePurpose = "";
    return;
  }

  const step = 360 / count;
  const offset = CATEGORY_START_ANGLE + 90 - step / 2;
  purposeWheel.style.setProperty("--category-step", `${step}deg`);
  purposeWheel.style.setProperty("--category-highlight-start", `${offset}deg`);

  normalizedCategories.forEach((category, index) => {
    const centerAngle = CATEGORY_START_ANGLE + step * index;
    const position = getCategoryPosition(centerAngle, CATEGORY_BUTTON_RADIUS);
    const button = document.createElement("button");
    button.className = "category-segment purpose-chip";
    button.classList.toggle("text-only", currentCategoryDepth > 0);
    button.type = "button";
    button.dataset.purpose = category.label;
    button.dataset.categoryIndex = String(index);
    button.setAttribute("aria-label", category.label);
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.style.setProperty("--category-enter-index", String(index));
    button.innerHTML = getCategoryButtonMarkup(category);
    button.addEventListener("click", () => selectCategoryNode(category, index));
    button.addEventListener("pointerenter", () => previewPurpose(category.label));
    button.addEventListener("pointerleave", resetPurposePreview);
    button.addEventListener("focus", () => previewPurpose(category.label));
    button.addEventListener("blur", resetPurposePreview);
    categoryOptions.appendChild(button);
    purposeOptions.push(button);

    const divider = document.createElement("span");
    divider.className = "category-divider";
    divider.style.transform = `rotate(${CATEGORY_START_ANGLE + step * (index + 0.5) - 90}deg)`;
    divider.style.setProperty("--category-enter-index", String(index));
    categoryDividers.appendChild(divider);
  });

  updatePurposeChips();
  updateCategoryBackState();

  if (shouldAnimate) {
    playCategoryWheelTransition();
  }
}

async function updateExpenseRecord(record, nextRecord) {
  const previousRecord = { ...record };
  Object.assign(record, nextRecord);
  scheduleMonthHistorySummaryForCurrentData();

  if (!currentSession) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(expenseHistory));
  }

  renderGauge();
  renderHistory();
  refreshStatsIfVisible();
  expenseStatus.textContent = "";
  closeExpenseModal();

  if (!currentSession) {
    return;
  }

  const saved = await updateExpenseInSupabase(record, {
    amount: nextRecord.amount,
    type: "expense",
    category: nextRecord.category,
    time: nextRecord.time,
  });

  if (saved) {
    await refreshExpenses();
    return;
  }

  Object.assign(record, previousRecord);
  scheduleMonthHistorySummaryForCurrentData();
  renderGauge();
  renderHistory();
  refreshStatsIfVisible();
}

async function deleteExpenseRecord(record) {
  const previousHistory = [...expenseHistory];
  expenseHistory = expenseHistory.filter((item) => item !== record);
  rebuildMonthHistorySummaryForCurrentData();

  if (!currentSession) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(expenseHistory));
  }

  renderGauge();
  renderHistory();
  refreshStatsIfVisible();

  if (!currentSession) {
    return;
  }

  const deleted = await deleteExpenseFromSupabase(record);
  if (deleted) {
    await refreshExpenses();
    return;
  }

  expenseHistory = previousHistory;
  rebuildMonthHistorySummaryForCurrentData();
  renderGauge();
  renderHistory();
  refreshStatsIfVisible();
}

function playCategoryWheelTransition() {
  categoryOptions.classList.remove("is-entering");
  categoryDividers.classList.remove("is-entering");
  categoryOptions.getBoundingClientRect();
  categoryOptions.classList.add("is-entering");
  categoryDividers.classList.add("is-entering");

  window.setTimeout(() => {
    categoryOptions.classList.remove("is-entering");
    categoryDividers.classList.remove("is-entering");
  }, 360);
}

function renderCategorySettings() {
  if (!categorySettingsTree) {
    return;
  }

  captureCategorySettingsOpenState();
  categorySettingsTree.innerHTML = "";

  if (!expenseCategories.length) {
    const empty = document.createElement("p");
    empty.className = "category-settings-empty";
    empty.textContent = "还没有分类";
    categorySettingsTree.appendChild(empty);
    return;
  }

  categorySettingsTree.appendChild(createCategorySettingsList(expenseCategories, []));
}

function createCategorySettingsList(categories, path) {
  const list = document.createElement("div");
  list.className = "category-settings-list";
  list.dataset.depth = String(path.length);

  categories.forEach((category, index) => {
    const nodePath = [...path, index];
    const item = document.createElement("div");
    item.className = "category-settings-item";

    if (path.length < 2) {
      const details = document.createElement("details");
      details.className = "category-settings-details";
      const openKey = getCategorySettingsOpenKey(category, nodePath);
      details.dataset.openKey = openKey;
      details.open = categorySettingsOpenKeys.has(openKey);
      const summary = document.createElement("summary");
      summary.className = "category-settings-row";
      summary.append(
        createCategorySettingsName(category),
        createCategoryDeleteButton(nodePath, category.label),
      );
      details.appendChild(summary);

      const children = Array.isArray(category.children) ? category.children : [];
      const childrenWrap = document.createElement("div");
      childrenWrap.className = "category-settings-children";
      const childrenInner = document.createElement("div");
      childrenInner.className = "category-settings-children-inner";
      if (children.length) {
        childrenInner.appendChild(createCategorySettingsList(children, nodePath));
      } else {
        const empty = document.createElement("p");
        empty.className = "category-settings-empty";
        empty.textContent = "这一层还没有下级分类";
        childrenInner.appendChild(empty);
      }
      childrenInner.appendChild(createCategoryAddButton(nodePath));
      childrenWrap.appendChild(childrenInner);
      details.appendChild(childrenWrap);
      item.appendChild(details);
    } else {
      const row = document.createElement("div");
      row.className = "category-settings-row leaf";
      row.append(
        createCategorySettingsName(category),
        createCategoryDeleteButton(nodePath, category.label),
      );
      item.appendChild(row);
    }

    list.appendChild(item);
  });

  return list;
}

function captureCategorySettingsOpenState() {
  if (!categorySettingsTree) {
    return;
  }

  categorySettingsOpenKeys = new Set(
    [...categorySettingsTree.querySelectorAll(".category-settings-details[open][data-open-key]")]
      .map((details) => details.dataset.openKey)
      .filter(Boolean),
  );
}

function getCategorySettingsOpenKey(category, path) {
  return category.id || path.map(String).join(".");
}

function createCategorySettingsName(category) {
  const name = document.createElement("span");
  name.className = "category-settings-name";
  name.textContent = category.label;
  return name;
}

function createCategoryDeleteButton(path, label) {
  const button = document.createElement("button");
  button.className = "category-settings-delete";
  button.type = "button";
  button.textContent = "×";
  button.dataset.categoryAction = "delete";
  button.dataset.categoryPath = path.join(".");
  button.setAttribute("aria-label", `删除${label}`);
  return button;
}

function createCategoryAddButton(parentPath) {
  const button = document.createElement("button");
  button.className = "category-settings-add";
  button.type = "button";
  button.textContent = "+";
  button.dataset.categoryAction = "add";
  button.dataset.categoryPath = parentPath.join(".");
  button.setAttribute("aria-label", "添加分类");
  return button;
}

function handleCategorySettingsClick(event) {
  const button = event.target.closest("[data-category-action]");
  if (button) {
    event.preventDefault();
    event.stopPropagation();

    const path = parseCategoryPath(button.dataset.categoryPath);
    if (button.dataset.categoryAction === "add") {
      promptAddCategory(path);
      return;
    }

    if (button.dataset.categoryAction === "delete") {
      confirmDeleteCategoryAtPath(path);
    }
    return;
  }

  const summary = event.target.closest(".category-settings-details > summary");
  if (!summary || !categorySettingsTree?.contains(summary)) {
    return;
  }

  event.preventDefault();
  toggleCategorySettingsDetails(summary.parentElement);
}

function toggleCategorySettingsDetails(details) {
  if (!details || details.classList.contains("is-opening") || details.classList.contains("is-closing")) {
    return;
  }

  const children = details.querySelector(":scope > .category-settings-children");
  if (!children) {
    details.open = !details.open;
    captureCategorySettingsOpenState();
    return;
  }

  if (details.open) {
    children.style.height = `${children.scrollHeight}px`;
    details.classList.add("is-closing");
    children.getBoundingClientRect();
    children.style.height = "0px";
    finishCategorySettingsAnimation(children, () => {
      details.open = false;
      details.classList.remove("is-closing");
      children.style.height = "";
      captureCategorySettingsOpenState();
    });
    return;
  }

  details.open = true;
  details.classList.add("is-opening");
  children.style.height = "0px";
  window.requestAnimationFrame(() => {
    children.style.height = `${children.scrollHeight}px`;
    finishCategorySettingsAnimation(children, () => {
      details.classList.remove("is-opening");
      children.style.height = "";
      captureCategorySettingsOpenState();
    });
  });
}

function finishCategorySettingsAnimation(element, callback) {
  let done = false;
  const finish = () => {
    if (done) {
      return;
    }
    done = true;
    element.removeEventListener("transitionend", handleTransitionEnd);
    callback();
  };
  const handleTransitionEnd = (event) => {
    if (event.target === element && event.propertyName === "height") {
      finish();
    }
  };

  element.addEventListener("transitionend", handleTransitionEnd);
  window.setTimeout(finish, 280);
}

async function syncCategoriesFromMenu() {
  if (!syncCategoriesBtn) {
    return;
  }

  syncCategoriesBtn.disabled = true;
  syncCategoriesBtn.classList.add("is-syncing");
  const previousStatus = releaseInfoStatus.textContent;
  releaseInfoStatus.textContent = currentSession ? "正在同步云端分类..." : "当前未登录，已刷新本地分类";

  try {
    const synced = await refreshExpenseCategories();
    releaseInfoStatus.textContent = currentSession
      ? synced ? "云端分类已同步" : "云端分类同步失败"
      : "当前未登录，已刷新本地分类";
  } finally {
    syncCategoriesBtn.disabled = false;
    syncCategoriesBtn.classList.remove("is-syncing");

    window.setTimeout(() => {
      if (!releaseInfoModal.hidden && releaseInfoStatus.textContent.includes("分类")) {
        releaseInfoStatus.textContent = previousStatus || "当前已是最新版本";
      }
    }, 1800);
  }
}

async function promptAddCategory(parentPath) {
  if (parentPath.length >= 3) {
    return;
  }

  pendingAddCategoryParentPath = [...parentPath];
  categoryAddInput.value = "";
  categoryAddStatus.textContent = "";
  categoryAddModal.hidden = false;
  requestAnimationFrame(() => {
    categoryAddInput.focus({ preventScroll: true });
  });
}

function closeCategoryAddModal() {
  pendingAddCategoryParentPath = null;
  categoryAddModal.hidden = true;
  categoryAddStatus.textContent = "";
}

function handleCategoryAddInputKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmPendingAddCategory();
  }
}

async function confirmPendingAddCategory() {
  const parentPath = pendingAddCategoryParentPath;
  if (!Array.isArray(parentPath)) {
    closeCategoryAddModal();
    return;
  }

  const normalizedLabel = categoryAddInput.value.trim();
  if (!normalizedLabel) {
    categoryAddStatus.textContent = "请输入分类名称。";
    categoryAddInput.focus();
    return;
  }

  const siblings = getMutableCategoryChildren(parentPath);
  if (!siblings || siblings.some((category) => category.label === normalizedLabel)) {
    categoryAddStatus.textContent = "这个分类已经存在。";
    categoryAddInput.focus();
    return;
  }

  const parent = parentPath.length ? getMutableCategoryByPath(parentPath) : null;
  if (parent) {
    categorySettingsOpenKeys.add(getCategorySettingsOpenKey(parent, parentPath));
  }
  const nextCategory = {
    id: createCategoryId(normalizedLabel, siblings),
    label: normalizedLabel,
    icon: parent?.icon || "other",
  };

  if (currentSession) {
    const savedCategory = await persistCategoryToSupabase(nextCategory, parent, siblings.length);
    if (!savedCategory) {
      categoryAddStatus.textContent = "分类添加失败，请稍后重试。";
      return;
    }
    Object.assign(nextCategory, savedCategory);
  }

  siblings.push(nextCategory);
  if (parentPath.length < 2) {
    categorySettingsOpenKeys.add(getCategorySettingsOpenKey(nextCategory, [...parentPath, siblings.length - 1]));
  }
  if (currentSession && !(await syncCategorySortOrderToSupabase())) {
    categoryAddStatus.textContent = "分类排序同步失败，请稍后重试。";
    return;
  }
  saveExpenseCategories();
  renderCategorySettings();
  resetCategoryState();
  closeCategoryAddModal();
}

async function deleteCategoryAtPath(path) {
  const siblings = getMutableCategoryChildren(path.slice(0, -1));
  const index = path[path.length - 1];
  if (!siblings || index < 0 || index >= siblings.length) {
    return;
  }

  const category = siblings[index];
  categorySettingsOpenKeys.delete(getCategorySettingsOpenKey(category, path));
  if (currentSession && !(await deleteCategoryFromSupabase(category))) {
    return;
  }

  siblings.splice(index, 1);
  if (currentSession && !(await syncCategorySortOrderToSupabase())) {
    return;
  }
  saveExpenseCategories();
  renderCategorySettings();
  resetCategoryState();
}

function confirmDeleteCategoryAtPath(path) {
  const category = getMutableCategoryByPath(path);
  if (!category) {
    return;
  }

  const childCount = Array.isArray(category.children) ? category.children.length : 0;
  pendingDeleteCategoryPath = [...path];
  pendingDeleteExpenseRecord = null;
  deleteConfirmKicker.textContent = "Delete Category";
  deleteConfirmTitle.textContent = "删除这个分类？";
  deleteConfirmText.textContent = childCount
    ? `${category.label} · 将同时删除 ${childCount} 个下级分类`
    : category.label;
  deleteConfirmModal.hidden = false;
  confirmDeleteExpenseBtn.focus();
}

function parseCategoryPath(value) {
  if (!value) {
    return [];
  }

  return value.split(".").map((part) => Number(part)).filter(Number.isInteger);
}

function getMutableCategoryChildren(path) {
  if (!path.length) {
    return expenseCategories;
  }

  const parent = getMutableCategoryByPath(path);
  if (!parent) {
    return null;
  }

  if (!Array.isArray(parent.children)) {
    parent.children = [];
  }

  return parent.children;
}

function getMutableCategoryByPath(path) {
  let nodes = expenseCategories;
  let current = null;

  for (const index of path) {
    current = nodes?.[index];
    if (!current) {
      return null;
    }
    nodes = current.children;
  }

  return current;
}

function createCategoryId(label, siblings) {
  const base = normalizeCategoryId(label);
  let id = base;
  let suffix = 2;
  const siblingIds = new Set(siblings.map((category) => category.id));

  while (siblingIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  return id;
}

async function refreshExpenseCategories() {
  const activeUserId = currentSession?.user?.id;
  if (!supabase || !activeUserId) {
    expenseCategories = loadExpenseCategories();
    resetCategoryState();
    renderCategorySettings();
    return false;
  }

  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, parent_id, label, icon, sort_order, created_at, parent_label, path_label")
    .eq("user_id", activeUserId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase category load failed", error);
    settingsStatus.textContent = `分类同步失败：${error.message}`;
    return false;
  }

  if (!Array.isArray(data) || !data.length) {
    const seeded = await seedDefaultCategoriesForUser(activeUserId);
    if (!seeded) {
      return false;
    }
    return refreshExpenseCategories();
  }

  expenseCategories = buildCategoryTreeFromRows(data);
  await syncCategorySortOrderToSupabase();
  resetCategoryState();
  renderCategorySettings();
  return true;
}

async function seedDefaultCategoriesForUser(userId) {
  const sourceCategories = expenseCategories.length ? expenseCategories : EXPENSE_CATEGORIES;
  const rows = flattenCategoriesForInsert(sourceCategories, userId);
  if (!rows.length) {
    return false;
  }

  const { error } = await supabase.from("expense_categories").insert(rows);
  if (error) {
    console.error("Supabase category seed failed", error);
    settingsStatus.textContent = `分类初始化失败：${error.message}`;
    return false;
  }

  return true;
}

function flattenCategoriesForInsert(categories, userId, parentId = null, depth = 0) {
  if (!Array.isArray(categories) || depth >= 3) {
    return [];
  }

  return categories.flatMap((category, index) => {
    const id = createUuid();
    const row = {
      id,
      user_id: userId,
      parent_id: parentId,
      parent_label: null,
      path_label: category.label,
      label: category.label,
      icon: resolveCategoryIcon(category),
      sort_order: index,
    };

    return [
      row,
      ...flattenCategoriesForInsertWithPath(category.children, userId, id, category.label, depth + 1),
    ];
  });
}

function flattenCategoriesForInsertWithPath(categories, userId, parentId, parentPathLabel, depth = 1) {
  if (!Array.isArray(categories) || depth >= 3) {
    return [];
  }

  const parentLabel = parentPathLabel.split("/").map((item) => item.trim()).filter(Boolean).at(-1) || null;

  return categories.flatMap((category, index) => {
    const id = createUuid();
    const pathLabel = `${parentPathLabel} / ${category.label}`;
    const row = {
      id,
      user_id: userId,
      parent_id: parentId,
      parent_label: parentLabel,
      path_label: pathLabel,
      label: category.label,
      icon: resolveCategoryIcon(category),
      sort_order: index,
    };

    return [
      row,
      ...flattenCategoriesForInsertWithPath(category.children, userId, id, pathLabel, depth + 1),
    ];
  });
}

function buildCategoryTreeFromRows(rows) {
  const nodeMap = new Map();
  const roots = [];

  rows.forEach((row) => {
    nodeMap.set(row.id, {
      id: row.id,
      parentId: row.parent_id || null,
      label: row.label,
      icon: resolveCategoryIcon(row),
      sortOrder: Number(row.sort_order || 0),
      children: [],
    });
  });

  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(node);
      return;
    }
    roots.push(node);
  });

  const sortNodes = (nodes) => {
    nodes.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, "zh-CN"));
    nodes.forEach((node) => {
      sortNodes(node.children);
      if (!node.children.length) {
        delete node.children;
      }
      delete node.parentId;
      delete node.sortOrder;
    });
  };

  sortNodes(roots);
  return roots;
}

async function persistCategoryToSupabase(category, parent, sortOrder) {
  const activeUserId = currentSession?.user?.id;
  if (!supabase || !activeUserId) {
    return category;
  }

  const payload = {
    id: createUuid(),
    user_id: activeUserId,
    parent_id: parent?.id || null,
    parent_label: parent?.label || null,
    path_label: buildCategoryPathLabel(parent, category.label),
    label: category.label,
    icon: resolveCategoryIcon(category),
    sort_order: sortOrder,
  };
  const { data, error } = await supabase
    .from("expense_categories")
    .insert(payload)
    .select("id, parent_id, label, icon, sort_order, parent_label, path_label")
    .single();

  if (error || !data) {
    console.error("Supabase category insert failed", error || "empty insert response", category);
    settingsStatus.textContent = error ? `分类添加失败：${error.message}` : "分类添加失败";
    return null;
  }

  return {
    id: data.id,
    label: data.label,
    icon: resolveCategoryIcon(data),
  };
}

function buildCategoryPathLabel(parent, label) {
  if (!parent) {
    return label;
  }

  return `${findCategoryPathLabel(parent.id) || parent.label} / ${label}`;
}

function findCategoryPathLabel(categoryId, categories = expenseCategories, ancestors = []) {
  for (const category of categories) {
    const nextAncestors = [...ancestors, category.label];
    if (category.id === categoryId) {
      return nextAncestors.join(" / ");
    }

    if (Array.isArray(category.children)) {
      const childPath = findCategoryPathLabel(categoryId, category.children, nextAncestors);
      if (childPath) {
        return childPath;
      }
    }
  }

  return "";
}

async function deleteCategoryFromSupabase(category) {
  if (!supabase || !currentSession?.user?.id) {
    return true;
  }

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", category.id)
    .eq("user_id", currentSession.user.id);

  if (error) {
    console.error("Supabase category delete failed", error, category);
    settingsStatus.textContent = `分类删除失败：${error.message}`;
    return false;
  }

  return true;
}

async function syncCategorySortOrderToSupabase() {
  const activeUserId = currentSession?.user?.id;
  if (!supabase || !activeUserId) {
    return true;
  }

  const updates = collectCategoryOrderUpdates(expenseCategories);
  if (!updates.length) {
    return true;
  }

  const updatedAt = new Date().toISOString();
  const results = await Promise.all(updates.map((update) => (
    supabase
      .from("expense_categories")
      .update({
        parent_id: update.parentId,
        parent_label: update.parentLabel,
        path_label: update.pathLabel,
        sort_order: update.sortOrder,
        updated_at: updatedAt,
      })
      .eq("id", update.id)
      .eq("user_id", activeUserId)
  )));

  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("Supabase category order sync failed", failed.error);
    settingsStatus.textContent = `分类排序同步失败：${failed.error.message}`;
    return false;
  }

  return true;
}

function collectCategoryOrderUpdates(categories, parent = null, parentPathLabel = "") {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.flatMap((category, index) => {
    const pathLabel = parentPathLabel ? `${parentPathLabel} / ${category.label}` : category.label;
    const update = {
      id: category.id,
      parentId: parent?.id || null,
      parentLabel: parent?.label || null,
      pathLabel,
      sortOrder: index,
    };

    return [
      update,
      ...collectCategoryOrderUpdates(category.children, category, pathLabel),
    ];
  }).filter((update) => update.id);
}

function createUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => (
    Number(char) ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4
  ).toString(16));
}

function saveExpenseCategories() {
  if (currentSession) {
    return;
  }

  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(expenseCategories));
}

function loadExpenseCategories() {
  const fallback = cloneExpenseCategories(EXPENSE_CATEGORIES);
  const stored = loadText(CUSTOM_CATEGORIES_KEY);
  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeExpenseCategoryTree(parsed);
    return normalized.length ? normalized : fallback;
  } catch {
    return fallback;
  }
}

function cloneExpenseCategories(categories) {
  return categories.map((category) => ({
    ...category,
    children: Array.isArray(category.children) ? cloneExpenseCategories(category.children) : undefined,
  }));
}

function normalizeExpenseCategoryTree(categories, depth = 0) {
  if (!Array.isArray(categories) || depth >= 3) {
    return [];
  }

  return categories
    .map((category) => {
      const label = String(category?.label || "").trim();
      if (!label) {
        return null;
      }

      const normalized = {
        id: String(category?.id || normalizeCategoryId(label)),
        label,
        icon: resolveCategoryIcon(category),
      };
      const children = normalizeExpenseCategoryTree(category.children, depth + 1);
      if (children.length) {
        normalized.children = children;
      }
      return normalized;
    })
    .filter(Boolean);
}

function getCategoryButtonMarkup(category) {
  const label = `<span>${escapeHtml(category.label)}</span>`;
  if (currentCategoryDepth > 0) {
    return label;
  }

  return `
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      ${CATEGORY_ICON_PATHS[resolveCategoryIcon(category)] || CATEGORY_ICON_PATHS.other}
    </svg>
    ${label}
  `;
}

function resolveCategoryIcon(category) {
  const icon = category?.icon;
  if (CATEGORY_ICON_PATHS[icon] && !(icon === "other" && category?.label === "健康")) {
    return icon;
  }

  if (category?.label === "健康") {
    return "health";
  }

  return "other";
}

function getCategoryChildren(category) {
  if (Array.isArray(category.children) && category.children.length) {
    return category.children.filter((child) => child?.label);
  }

  return [];
}

function normalizeCategoryId(label) {
  return String(label || "category").trim().replace(/\s+/g, "-").toLowerCase();
}

function getCategoryPosition(angle, radius) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius,
  };
}

function resetCategoryState() {
  selectedPurpose = "";
  selectedCategoryPath = [];
  currentCategoryPath = [];
  currentCategoryDepth = 0;
  renderCategoryWheel(expenseCategories);
}

function setCategorySelectionFromPath(path) {
  const normalizedPath = Array.isArray(path)
    ? path.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!normalizedPath.length) {
    resetCategoryState();
    return;
  }

  selectedCategoryPath = normalizedPath;
  currentCategoryPath = normalizedPath.slice(0, -1);
  currentCategoryDepth = currentCategoryPath.length;
  selectedPurpose = normalizedPath.at(-1) || "";
  renderCategoryWheel(getCategoryNodesForPath(currentCategoryPath));
  updatePurposeChips();
  updateCategoryBackState();
}

function selectCategoryNode(category) {
  const nextPath = [...currentCategoryPath, category.label];
  selectedCategoryPath = nextPath;
  selectedPurpose = category.label;
  expensePurposeInput.value = formatCategoryPathInput(nextPath);

  const children = getCategoryChildren(category);
  if (children.length && nextPath.length < 3) {
    currentCategoryPath = nextPath;
    currentCategoryDepth = currentCategoryPath.length;
    selectedPurpose = "";
    renderCategoryWheel(children, { animate: true });
    return;
  }

  updatePurposeChips();
}

function syncPurposeSelection() {
  const current = expensePurposeInput.value.trim();
  selectedCategoryPath = [];
  currentCategoryPath = [];
  currentCategoryDepth = 0;
  selectedPurpose = "";
  updatePurposeChips();
}

function formatCategoryPathInput(path) {
  return path.length ? `${path.join("/")}/` : "";
}

function stepCategoryBack() {
  if (!currentCategoryPath.length) {
    return;
  }

  currentCategoryPath = currentCategoryPath.slice(0, -1);
  currentCategoryDepth = currentCategoryPath.length;
  selectedCategoryPath = [...currentCategoryPath];
  selectedPurpose = "";
  expensePurposeInput.value = formatCategoryPathInput(selectedCategoryPath);
  renderCategoryWheel(getCategoryNodesForPath(currentCategoryPath), { animate: true });
}

function getCategoryNodesForPath(path) {
  let nodes = expenseCategories;
  path.forEach((label) => {
    const match = nodes.find((category) => category.label === label);
    nodes = Array.isArray(match?.children) ? match.children : [];
  });
  return nodes;
}

function updateCategoryBackState() {
  if (!categoryBackBtn) {
    return;
  }

  const canGoBack = currentCategoryPath.length > 0;
  categoryBackBtn.classList.toggle("can-go-back", canGoBack);
  categoryBackBtn.disabled = !canGoBack;
  categoryBackBtn.setAttribute("aria-label", canGoBack ? "返回上一级分类" : "当前为一级分类");
}

function getPurposeWheel() {
  return purposeOptions[0]?.closest(".category-wheel") || null;
}

function setPurposeWheelHighlight(purpose) {
  const purposeWheel = getPurposeWheel();
  if (!purposeWheel) {
    return;
  }

  const activeIndex = purposeOptions.findIndex((button) => button.dataset.purpose === purpose);
  if (activeIndex < 0) {
    purposeWheel.style.background = "transparent";
    purposeWheel.dataset.activePurpose = "";
    return;
  }

  const count = Math.max(purposeOptions.length, 1);
  const step = 360 / count;
  const offset = CATEGORY_START_ANGLE + 90 - step / 2;
  const start = activeIndex * step;
  const end = (activeIndex + 1) * step;
  purposeWheel.dataset.activePurpose = purpose;
  purposeWheel.style.background = `conic-gradient(from ${offset}deg, transparent 0deg ${start}deg, var(--category-highlight) ${start}deg ${end}deg, transparent ${end}deg 360deg)`;
}

function previewPurpose(purpose) {
  setPurposeWheelHighlight(purpose);
}

function resetPurposePreview() {
  setPurposeWheelHighlight(selectedPurpose);
}

function updatePurposeChips() {
  setPurposeWheelHighlight(selectedPurpose);

  purposeOptions.forEach((button) => {
    const isActive = button.dataset.purpose === selectedPurpose;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("aria-pressed", String(isActive));
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

  if (raw.includes("/")) {
    return raw
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean);
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

  if (event.key === "Escape" && isExpenseMode) {
    closeExpenseModal();
    return;
  }

  if (event.key === "Escape" && isQuickExpenseMode) {
    closeQuickExpenseEntry();
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

  if (event.key === "Escape" && !statsModal.hidden) {
    closeStatsModal();
    return;
  }

  if (event.key === "Escape" && !sunburstTestModal.hidden) {
    closeSunburstTestModal();
    return;
  }

  if (event.key === "Escape" && !deleteConfirmModal.hidden) {
    closeDeleteConfirmModal();
    return;
  }

  if (event.key === "Escape" && !categoryAddModal.hidden) {
    closeCategoryAddModal();
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

  const scrollable = target.closest(".settings-scroll-body, .settings-card, .expense-card, .history-list, .time-wheel-list");
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
  document.body.classList.add("datetime-picker-open");
  requestAnimationFrame(() => {
    fillDateTimePicker(now);
  });
}

function closeDateTimePicker() {
  dateTimePickerModal.hidden = true;
  document.body.classList.remove("datetime-picker-open");
}

function handleDateTimePickerBackdropClick(event) {
  if (event.target === dateTimePickerModal) {
    closeDateTimePicker();
  }
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
  if (pickerDisplayYear) {
    pickerDisplayYear.textContent = `${pickerDraftDateTime.getFullYear()}年`;
  }
  if (pickerDisplayDate) {
    pickerDisplayDate.textContent = formatPickerHeadline(pickerDraftDateTime);
  }
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
  const calendarCellCount = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  for (let index = 0; index < calendarCellCount; index += 1) {
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

function shouldShowAuthGaugePlaceholder() {
  return (isAuthHydrating && !hasStartupExpenseHistory)
    || (hasCompletedInitialAuthHydration && !currentSession);
}

function renderAuthGaugePlaceholder(pathLength) {
  gaugeReferencePath.style.strokeDasharray = `${pathLength}`;
  gaugeReferencePath.style.strokeDashoffset = "0";
  setGaugeValueProgress(pathLength, 1);
  gaugeValuePath.classList.toggle("warning", false);
  displayedRemaining = 999;
  remainingBudgetEl.textContent = formatGaugeCurrency(999);
  remainingBudgetEl.classList.remove("is-animating");
  usageTextEl.textContent = isAuthHydrating ? "正在恢复登录" : "登录后同步消费数据";
  usageTextEl.dataset.action = "open-settings";
  usageTextEl.setAttribute("tabindex", "0");
  usageTextEl.setAttribute("role", "button");
}

function renderGaugeState(animate = true, fromFull = false) {
  const animationToken = ++gaugeAnimationToken;
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

  if (shouldShowAuthGaugePlaceholder()) {
    renderAuthGaugePlaceholder(pathLength);
    return;
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
    setGaugeValueProgress(pathLength, referenceRatio);
    gaugeValuePath.classList.toggle("warning", false);
    displayedRemaining = referenceValue;
    remainingBudgetEl.textContent = formatGaugeCurrency(referenceValue);
    remainingBudgetEl.classList.remove("is-animating");
    gaugeReferencePath.getBoundingClientRect();
    gaugeValuePath.getBoundingClientRect();
    remainingBudgetEl.getBoundingClientRect();
    gaugeValuePath.style.transition = previousTransition;
    stagedGaugeAnimationFrame = requestAnimationFrame(() => {
      if (animationToken !== gaugeAnimationToken || isExpenseMode || isQuickExpenseMode) {
        stagedGaugeAnimationFrame = 0;
        return;
      }

      stagedGaugeAnimationFrame = requestAnimationFrame(() => {
        if (animationToken !== gaugeAnimationToken || isExpenseMode || isQuickExpenseMode) {
          stagedGaugeAnimationFrame = 0;
          return;
        }

        stagedGaugeAnimationFrame = 0;
        setGaugeValueProgress(pathLength, ratio);
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
    setGaugeValueProgress(pathLength, ratio);
    gaugeReferencePath.getBoundingClientRect();
    gaugeValuePath.getBoundingClientRect();
    gaugeReferencePath.style.transition = previousReferenceTransition;
    gaugeValuePath.style.transition = previousTransition;
  } else {
    gaugeReferencePath.style.strokeDasharray = `${pathLength}`;
    gaugeReferencePath.style.strokeDashoffset = `${pathLength * (1 - referenceRatio)}`;
    setGaugeValueProgress(pathLength, ratio);
  }
  gaugeValuePath.classList.toggle("warning", isWarning);

  animateRemainingBudget(remaining, animate);
}

function setGaugeValueProgress(pathLength, ratio) {
  const normalizedRatio = Math.max(0, Math.min(Number(ratio) || 0, 1));
  gaugeValuePath.style.strokeDasharray = `${pathLength}`;
  gaugeValuePath.style.strokeDashoffset = `${pathLength * (1 - normalizedRatio)}`;
  gaugeValuePath.style.opacity = normalizedRatio > 0 ? "1" : "0";
}

function refreshStatsIfVisible() {
  if (!statsModal?.hidden) {
    renderExpenseStats();
  }
}

function renderSunburstTestChart() {
  if (!sunburstTestChartEl) {
    return;
  }

  if (!sunburstTestChart) {
    sunburstTestChart = init(sunburstTestChartEl);
  }

  sunburstTestChart.resize();
  sunburstTestChart.setOption({
    series: [
      {
        type: "sunburst",
        data: SUNBURST_TEST_DATA,
        radius: ["18%", "92%"],
        nodeClick: "rootToNode",
        label: {
          rotate: 0,
          fontSize: 13,
        },
        levels: [
          {},
          {
            r0: "18%",
            r: "48%",
            label: {
              fontSize: 16,
              fontWeight: "bold",
            },
          },
          {
            r0: "48%",
            r: "70%",
          },
          {
            r0: "70%",
            r: "92%",
          },
        ],
      },
    ],
  });
}

function renderExpenseStats(options = {}) {
  const { prepareInitialAnimation = false, resizeAfterRender = true } = options;

  if (!statsEmptyState || !expenseSunburstChart) {
    return;
  }

  const { data, total } = buildExpenseSunburstData();
  const coloredData = applyStatsColorsToSunburstData(data);
  expenseStatsCurrentTotal = total;
  statsEmptyState.hidden = total > 0;
  expenseSunburstChart.hidden = total <= 0;

  if (total <= 0) {
    expenseStatsChart?.clear();
    return;
  }

  const chart = getExpenseStatsChart();
  if (prepareInitialAnimation) {
    chart.clear();
    resizeExpenseStatsChart({ force: true });
  }

  chart.setOption({
    backgroundColor: "transparent",
    animationDuration: prepareInitialAnimation ? 1000 : undefined,
    tooltip: {
      show: false,
    },
    graphic: [
      {
        id: "expenseStatsTotalValue",
        type: "text",
        left: "center",
        top: "45%",
        silent: true,
        style: {
          text: formatCurrency(total),
          fill: "#303842",
          opacity: prepareInitialAnimation ? 0 : 1,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 24,
          textAlign: "center",
        },
      },
      {
        id: "expenseStatsTotalLabel",
        type: "text",
        left: "center",
        top: "55%",
        silent: true,
        style: {
          text: "总消费",
          fill: "#8a929c",
          opacity: prepareInitialAnimation ? 0 : 1,
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 18,
          textAlign: "center",
        },
      },
    ],
    series: [
      {
        type: "sunburst",
        data: coloredData,
        radius: [0, "100%"],
        center: ["50%", "50%"],
        nodeClick: "rootToNode",
        sort: (left, right) => Number(right.value || 0) - Number(left.value || 0),
        emphasis: {
          disabled: true,
          focus: "none",
        },
        blur: {
          itemStyle: {
            opacity: 1,
          },
          label: {
            opacity: 1,
          },
        },
        label: {
          color: "#303842",
          fontSize: 12,
          minAngle: 12,
          rotate: 0,
          overflow: "truncate",
        },
        itemStyle: {
          borderColor: "rgba(255, 255, 255, 0.88)",
          borderWidth: 2,
        },
        levels: [
          {
            radius: [0, "50%"],
            itemStyle: {
              color: "rgba(255, 255, 255, 0)",
              borderWidth: 0,
            },
            label: {
              show: false,
            },
          },
          {
            radius: ["50%", "75%"],
            label: {
              rotate: 0,
              fontSize: 13,
              fontWeight: 700,
            },
          },
          {
            radius: ["75%", "87.5%"],
            label: {
              rotate: 0,
              fontSize: 12,
            },
          },
          {
            radius: ["87.5%", "100%"],
            label: {
              rotate: 0,
              fontSize: 11,
            },
          },
        ],
      },
    ],
  }, true);

  if (resizeAfterRender) {
    scheduleExpenseStatsResize();
  }

  if (prepareInitialAnimation) {
    requestAnimationFrame(() => {
      if (!expenseStatsChart || statsModal?.hidden) {
        return;
      }

      updateExpenseStatsCenterGraphic({ opacity: 1 });
    });
  }
}

function getExpenseStatsCenterInfo() {
  const seriesModel = expenseStatsChart?.getModel?.().getSeriesByIndex(0);
  const viewRoot = seriesModel?.getViewRoot?.();

  if (viewRoot?.depth > 0) {
    return {
      amount: Number(viewRoot.getValue?.() ?? 0) || 0,
      label: viewRoot.name || "当前分类",
    };
  }

  return {
    amount: expenseStatsCurrentTotal,
    label: "总消费",
  };
}

function updateExpenseStatsCenterGraphic({ opacity = 1 } = {}) {
  if (!expenseStatsChart) {
    return;
  }

  const { amount, label } = getExpenseStatsCenterInfo();
  updateExpenseStatsTextElement("expenseStatsTotalValue", {
    text: formatCurrency(amount),
    opacity,
  });
  updateExpenseStatsTextElement("expenseStatsTotalLabel", {
    text: label,
    opacity,
  });
  expenseStatsChart.getZr().refresh();
}

function updateExpenseStatsTextElement(id, style) {
  const element = findExpenseStatsGraphicElement(id);
  if (!element) {
    return;
  }

  element.attr({
    style: {
      ...element.style,
      ...style,
    },
  });
  element.dirty();
}

function findExpenseStatsGraphicElement(id) {
  let match = null;
  expenseStatsChart?.getZr().storage.traverse((element) => {
    if (element.id === id) {
      match = element;
    }
  });
  return match;
}

function scheduleExpenseStatsCenterUpdate() {
  if (expenseStatsCenterFrame) {
    return;
  }

  expenseStatsCenterFrame = requestAnimationFrame(() => {
    expenseStatsCenterFrame = 0;
    if (!statsModal?.hidden) {
      updateExpenseStatsCenterGraphic();
    }
  });
}

function buildExpenseSunburstData() {
  const rootChildren = [];
  const rootIndex = new Map();
  let total = 0;

  expenseHistory
    .filter((item) => isInCurrentLocalMonth(item.time))
    .forEach((item) => {
      const amount = Number(item.amount || 0);
      if (amount <= 0) {
        return;
      }

      const path = getRecordPurposeList(item).slice(0, 3);
      if (!path.length) {
        path.push("未分类");
      }

      total += amount;
      let siblings = rootChildren;
      let indexes = rootIndex;

      path.forEach((rawName) => {
        const name = String(rawName || "").trim() || "未分类";
        let node = indexes.get(name);
        if (!node) {
          node = { name, value: 0, children: [], _index: new Map() };
          indexes.set(name, node);
          siblings.push(node);
        }

        node.value += amount;
        siblings = node.children;
        indexes = node._index;
      });
    });

  return {
    total,
    data: rootChildren.map(cleanExpenseStatsNode),
  };
}

function cleanExpenseStatsNode(node) {
  const children = node.children.map(cleanExpenseStatsNode);
  const cleanNode = {
    name: node.name,
    value: Math.round(Number(node.value || 0) * 100) / 100,
  };

  if (children.length) {
    cleanNode.children = children;
  }

  return cleanNode;
}

function applyStatsColorsToSunburstData(data) {
  return data.map((node, index) => {
    const color = STATS_CATEGORY_COLORS[index % STATS_CATEGORY_COLORS.length];
    return applySunburstNodeColor(node, color, 0);
  });
}

function applySunburstNodeColor(node, color, depth) {
  const depthColor = lightenColor(color, Math.min(Math.max(depth, 0), 2) * 0.16);
  const nextNode = {
    ...node,
    itemStyle: {
      ...(node.itemStyle || {}),
      color: depthColor,
    },
  };

  if (node.children?.length) {
    nextNode.children = node.children.map((child) => applySunburstNodeColor(child, color, depth + 1));
  }

  return nextNode;
}

function lightenColor(color, amount) {
  const channels = parseColorChannels(color);
  if (!channels) {
    return color;
  }

  const [red, green, blue] = channels.map((channel) => Math.round(channel + (255 - channel) * amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

function parseColorChannels(color) {
  const value = String(color || "").trim();
  const rgbMatch = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgbMatch) {
    return rgbMatch.slice(1).map((channel) => Number(channel));
  }

  const hexMatch = value.match(/^#([0-9a-f]{6})$/i);
  if (!hexMatch) {
    return null;
  }

  const hex = hexMatch[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function getExpenseStatsChart() {
  if (!expenseStatsChart) {
    expenseStatsChart = init(expenseSunburstChart);
    expenseStatsChart.on("sunburstRootToNode", scheduleExpenseStatsCenterUpdate);
    expenseStatsChart.on("click", scheduleExpenseStatsCenterUpdate);
  }

  return expenseStatsChart;
}

function resetExpenseStatsChart() {
  if (expenseStatsCenterFrame) {
    cancelAnimationFrame(expenseStatsCenterFrame);
    expenseStatsCenterFrame = 0;
  }

  if (!expenseStatsChart) {
    return;
  }

  expenseStatsChart.dispose();
  expenseStatsChart = null;
  expenseStatsChartWidth = 0;
  expenseStatsChartHeight = 0;
}

function scheduleExpenseStatsResize() {
  if (!expenseStatsChart || expenseStatsResizeFrame) {
    return;
  }

  expenseStatsResizeFrame = requestAnimationFrame(() => {
    expenseStatsResizeFrame = 0;
    if (!statsModal?.hidden) {
      resizeExpenseStatsChart();
    }
  });
}

function resizeExpenseStatsChart({ force = false } = {}) {
  if (!expenseStatsChart || !expenseSunburstChart) {
    return;
  }

  const rect = expenseSunburstChart.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (!width || !height) {
    return;
  }

  if (
    !force
    && Math.abs(width - expenseStatsChartWidth) < 1
    && Math.abs(height - expenseStatsChartHeight) < 1
  ) {
    return;
  }

  expenseStatsChartWidth = width;
  expenseStatsChartHeight = height;
  expenseStatsChart.resize();
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
      ${getHistoryEditButtonMarkup(item)}
    `;
    bindExpenseEditButton(row, item);
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
    const summary = getMonthHistorySummary(monthItems);
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

function getMonthHistorySummary(monthItems) {
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

  return Array.from(grouped.values()).sort((left, right) => right.dateKey.localeCompare(left.dateKey));
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

function rebuildMonthHistorySummaryForCurrentData() {
  const monthItems = expenseHistory.filter((item) => isInCurrentLocalMonth(item.time));
  monthHistorySummaryKey = monthItems
    .map((item) => `${item.time || ""}|${Number(item.amount || 0)}`)
    .join("~");
  monthHistorySummaryCache = getMonthHistorySummary(monthItems);
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

  entries.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-day-detail-row";
    row.innerHTML = `
      <span class="history-day-detail-time">${escapeHtml(formatHistoryClock(item.time || ""))}</span>
      <span class="history-day-detail-purpose">${escapeHtml(getPurposeLabel(item))}</span>
      <strong class="history-day-detail-amount">${formatCurrency(Number(item.amount || 0))}</strong>
      ${getHistoryEditButtonMarkup(item)}
    `;
    bindExpenseEditButton(row, item);
    details.appendChild(row);
  });

  return details;
}

function getHistoryEditButtonMarkup(item) {
  return `
    <button class="history-edit-btn" type="button" aria-label="修改消费：${escapeHtml(getPurposeLabel(item))} ${escapeHtml(formatCurrency(Number(item.amount || 0)))}">
      ${getHistoryEditIconMarkup()}
    </button>
  `;
}

function getHistoryEditIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
      <path d="m15 5 4 4"></path>
    </svg>
  `;
}

function getHistoryDeleteIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="m19 6-.8 14H5.8L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    </svg>
  `;
}

function bindExpenseEditButton(row, item) {
  const button = row.querySelector(".history-edit-btn");
  if (!button) {
    return;
  }

  button.addEventListener("pointerdown", (event) => {
    if (event.button && event.button !== 0) {
      return;
    }

    clearHistoryDeleteHoldTimer();
    historyDeleteHoldTimer = window.setTimeout(() => {
      historyDeleteHoldTimer = 0;
      historyDeleteSuppressClick = true;
      setHistoryButtonDeleteMode(button, item);
    }, 620);
  });
  button.addEventListener("pointerup", clearHistoryDeleteHoldTimer);
  button.addEventListener("pointerleave", clearHistoryDeleteHoldTimer);
  button.addEventListener("pointercancel", clearHistoryDeleteHoldTimer);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    clearHistoryDeleteHoldTimer();

    if (historyDeleteSuppressClick) {
      historyDeleteSuppressClick = false;
      return;
    }

    if (button.dataset.action === "delete") {
      confirmDeleteExpenseRecord(item);
      return;
    }

    openExpenseEditor(item);
  });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (button.dataset.action === "delete") {
        confirmDeleteExpenseRecord(item);
      } else {
        openExpenseEditor(item);
      }
    }
  });
}

function clearHistoryDeleteHoldTimer() {
  if (!historyDeleteHoldTimer) {
    return;
  }

  window.clearTimeout(historyDeleteHoldTimer);
  historyDeleteHoldTimer = 0;
}

function setHistoryButtonDeleteMode(button, item) {
  document.querySelectorAll(".history-edit-btn.is-delete-mode").forEach((existingButton) => {
    if (existingButton !== button) {
      resetHistoryButtonMode(existingButton);
    }
  });

  button.classList.add("is-delete-mode");
  button.dataset.action = "delete";
  button.setAttribute("aria-label", `删除消费：${getPurposeLabel(item)} ${formatCurrency(Number(item.amount || 0))}`);
  button.innerHTML = getHistoryDeleteIconMarkup();
}

function resetHistoryButtonMode(button) {
  button.classList.remove("is-delete-mode");
  delete button.dataset.action;
  button.setAttribute("aria-label", "修改消费");
  button.innerHTML = getHistoryEditIconMarkup();
}

async function confirmDeleteExpenseRecord(item) {
  if (!item) {
    return;
  }

  pendingDeleteExpenseRecord = item;
  pendingDeleteCategoryPath = null;
  deleteConfirmKicker.textContent = "Delete Expense";
  deleteConfirmTitle.textContent = "删除这笔消费？";
  deleteConfirmText.textContent = `${formatCurrency(Number(item.amount || 0))} · ${getPurposeLabel(item)}`;
  deleteConfirmModal.hidden = false;
  confirmDeleteExpenseBtn.focus();
}

function closeDeleteConfirmModal() {
  pendingDeleteExpenseRecord = null;
  pendingDeleteCategoryPath = null;
  deleteConfirmModal.hidden = true;
}

async function confirmPendingDelete() {
  const record = pendingDeleteExpenseRecord;
  const categoryPath = pendingDeleteCategoryPath;
  if (!record) {
    closeDeleteConfirmModal();
    if (Array.isArray(categoryPath)) {
      await deleteCategoryAtPath(categoryPath);
    }
    return;
  }

  closeDeleteConfirmModal();
  await deleteExpenseRecord(record);
}

function openExpenseEditor(item) {
  if (!item) {
    return;
  }

  openExpenseModal({ editRecord: item });
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
  const outer = toCartesian(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS + 8, angle);
  const inner = toCartesian(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS - 8, angle);

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
  refreshStatsIfVisible();
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

async function updateExpenseInSupabase(record, payload) {
  if (!supabase || !record?.id) {
    return false;
  }

  let query = supabase
    .from("money")
    .update(payload)
    .eq("id", record.id);

  const activeUserId = currentSession?.user?.id;
  if (activeUserId) {
    query = query.eq("user_id", activeUserId);
  }

  const { error } = await query;

  if (error) {
    console.error("Supabase expense update failed", error, record);
    return false;
  }

  return true;
}

async function deleteExpenseFromSupabase(record) {
  if (!supabase || !record?.id) {
    return false;
  }

  let query = supabase
    .from("money")
    .delete()
    .eq("id", record.id);

  const activeUserId = currentSession?.user?.id;
  if (activeUserId) {
    query = query.eq("user_id", activeUserId);
  }

  const { error } = await query;

  if (error) {
    console.error("Supabase expense delete failed", error, record);
    return false;
  }

  return true;
}

function stopGaugeAmountAnimation() {
  gaugeAnimationToken += 1;

  if (stagedGaugeAnimationFrame) {
    cancelAnimationFrame(stagedGaugeAnimationFrame);
    stagedGaugeAnimationFrame = 0;
  }

  if (remainingAnimationFrame) {
    cancelAnimationFrame(remainingAnimationFrame);
    remainingAnimationFrame = 0;
  }

  remainingBudgetEl.classList.remove("is-animating");
}

function animateRemainingBudget(targetValue, animate = true) {
  const nextValue = Number.isFinite(targetValue) ? targetValue : 0;

  stopGaugeAmountAnimation();
  const animationToken = gaugeAnimationToken;

  if (isExpenseMode || isQuickExpenseMode) {
    return;
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
    if (animationToken !== gaugeAnimationToken || isExpenseMode || isQuickExpenseMode) {
      remainingAnimationFrame = 0;
      remainingBudgetEl.classList.remove("is-animating");
      return;
    }

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
    const isThreshold = Math.abs(ratio - 0.5) < 0.0001;
    const outer = toCartesian(cx, cy, radius - 14, angle);
    const inner = toCartesian(cx, cy, radius - 20, angle);
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const tickClass = ["minor"];

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
  hasStartupExpenseHistory = false;

  if (supabase) {
    const cachedCloudHistory = loadCloudHistory();
    if (cachedCloudHistory.length) {
      expenseHistory = cachedCloudHistory;
      hasStartupExpenseHistory = true;
      scheduleMonthHistorySummaryForCurrentData();
      return;
    }
  }

  expenseHistory = loadHistory();
  hasStartupExpenseHistory = expenseHistory.length > 0;
  scheduleMonthHistorySummaryForCurrentData();
}

function getPurposeLabel(item) {
  if (Array.isArray(item.category) && item.category.length) {
    return item.category.join(" / ");
  }

  return item.purpose || "未分类";
}

function getRecordPurposeList(item) {
  if (Array.isArray(item?.category) && item.category.length) {
    return item.category.map((value) => String(value || "").trim()).filter(Boolean);
  }

  const purpose = String(item?.purpose || "").trim();
  if (!purpose) {
    return [];
  }

  if (purpose.includes("/")) {
    return purpose.split("/").map((value) => value.trim()).filter(Boolean);
  }

  return purpose.split(/[\s,，]+/).map((value) => value.trim()).filter(Boolean);
}

function updateConnectionStatus() {
  if (isAuthHydrating) {
    connectionStatusEl.textContent = "登录中";
    connectionStatusEl.classList.remove("connected");
    return;
  }

  if (currentSession) {
    connectionStatusEl.textContent = "已连接";
    connectionStatusEl.classList.add("connected");
    return;
  }

  connectionStatusEl.textContent = "未登录";
  connectionStatusEl.classList.remove("connected");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Math.max(0, Number(value) || 0));
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
