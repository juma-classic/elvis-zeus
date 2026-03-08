type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    DCIRCLES: 2,
    CHART: 3,
    TUTORIAL: 4,
    PATEL_SIGNALS: 5,
    PATEL_SIGNAL_CENTER: 6,
    ANALYSIS_TOOL: 7,
    SIGNALS: 8,
    ADVANCED_ALGO: 9,
    FREE_BOTS: 10,
    PREMIUM_BOTS: 11,
    SIGNAL_SAVVY: 12,
    FAST_LANE: 13,
    ELVIS_ZONE: 14,
    TICKSHARK: 15,
    COPY_TRADING: 16,
    ACCUMULATOR: 17,
    DIGIT_HACKER: 18,
    X_SIGNALS: 19,
    TRACK_SIGNALS: 20,
    TRACK_ANALYZER: 21,
    TRACK_CALCULATOR: 22,
    DIGIT_ANALYSIS: 23,
    HACKS_ANALYSIS: 24,
    DTRADER: 25,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-dcircles',
    'id-charts',
    'id-tutorials',
    'id-patel-signals',
    'id-patel-signal-center',
    'id-analysis-tool',
    'id-signals',
    'id-advanced-algo',
    'id-free-bots',
    'id-premium-bots',
    'id-signal-savvy',
    'id-fast-lane',
    'id-elvis-zone',
    'id-tickshark',
    'id-copy-trading',
    'id-accumulator',
    'id-digit-hacker',
    'id-track-signals',
    'id-track-analyzer',
    'id-track-calculator',
    'id-digit-analysis',
    'id-hacks-analysis',
    'id-dtrader',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
