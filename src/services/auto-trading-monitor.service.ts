/**
 * Auto Trading Monitor Service
 * Continuously monitors market conditions and auto-stops/starts bot
 * Works independently of which page the user is on
 */

import { marketAnalyzer, AnalysisResult } from './market-analyzer.service';

class AutoTradingMonitorService {
    private isMonitoring = false;
    private lastCheckTime = 0;
    private checkInterval = 500; // Check every 500ms to avoid excessive checks

    /**
     * Start monitoring auto trading conditions
     */
    public startMonitoring(): void {
        if (this.isMonitoring) return;

        console.log('[AUTO TRADING MONITOR] Starting condition monitoring');
        this.isMonitoring = true;

        // Listen to market analysis events
        marketAnalyzer.on('analysis', this.handleAnalysis.bind(this));
    }

    /**
     * Stop monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) return;

        console.log('[AUTO TRADING MONITOR] Stopping condition monitoring');
        this.isMonitoring = false;
        marketAnalyzer.off('analysis', this.handleAnalysis.bind(this));
    }

    /**
     * Handle market analysis results
     */
    private handleAnalysis(result: AnalysisResult): void {
        // Throttle checks to avoid excessive processing
        const now = Date.now();
        if (now - this.lastCheckTime < this.checkInterval) {
            return;
        }
        this.lastCheckTime = now;

        // Load current settings from localStorage
        const settings = this.loadSettings();
        if (!settings || !settings.overUnderActive) {
            return;
        }

        // Only check Over/Under conditions
        if (result.strategyType !== 'over-under') {
            return;
        }

        this.checkOverUnderCondition(result, settings);
    }

    /**
     * Load settings from localStorage
     */
    private loadSettings(): any {
        try {
            const saved = localStorage.getItem('smart_trading_settings');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('[AUTO TRADING MONITOR] Error loading settings:', error);
            return null;
        }
    }

    /**
     * Check Over/Under trading conditions
     */
    private checkOverUnderCondition(result: AnalysisResult, settings: any): void {
        const condition = settings.overUnderCondition;
        if (!condition) return;

        // Get probability from result
        const overProbFromResult = parseFloat(result.data.overProbability);
        const underProbFromResult = parseFloat(result.data.underProbability);
        const prob = condition.targetValue === 'Over' ? overProbFromResult : underProbFromResult;

        // Check if condition is met
        let mainConditionMet = false;
        switch (condition.comparison) {
            case '>':
                mainConditionMet = prob > condition.threshold;
                break;
            case '>=':
                mainConditionMet = prob >= condition.threshold;
                break;
            case '<':
                mainConditionMet = prob < condition.threshold;
                break;
            case '<=':
                mainConditionMet = prob <= condition.threshold;
                break;
            case '=':
                mainConditionMet = Math.abs(prob - condition.threshold) < 0.1;
                break;
        }

        console.log('[AUTO TRADING MONITOR] Condition check:', {
            probability: prob.toFixed(2),
            threshold: condition.threshold,
            comparison: condition.comparison,
            conditionMet: mainConditionMet,
            autoMode: settings.overUnderAutoMode,
        });

        // Handle condition not met - click Auto Stop button
        if (!mainConditionMet) {
            console.log('[AUTO TRADING MONITOR] Conditions NOT met - clicking Auto Stop');
            this.clickAutoStopButton();
            return;
        }

        // Conditions met - ensure bot is running
        console.log('[AUTO TRADING MONITOR] Conditions MET - bot should be running');
    }

    /**
     * Click the Auto Stop button programmatically
     */
    private clickAutoStopButton(): void {
        // Try to find and click the Auto Stop button
        const autoStopButton = document.querySelector(
            '.control-btn[title="Automatically pause when conditions are bad"]'
        ) as HTMLButtonElement;

        if (autoStopButton) {
            console.log('[AUTO TRADING MONITOR] Clicking Auto Stop button');
            autoStopButton.click();
        } else {
            // Fallback: directly stop the bot
            console.log('[AUTO TRADING MONITOR] Auto Stop button not found, stopping bot directly');
            const stopButton = document.getElementById('db-animation__stop-button');
            if (stopButton && !stopButton.hasAttribute('disabled')) {
                stopButton.click();
                console.log('[AUTO TRADING MONITOR] Bot stopped directly');
            }
        }
    }
}

// Export singleton instance
export const autoTradingMonitor = new AutoTradingMonitorService();
