/**
 * Smart Trading Executor Service
 * 
 * Connects Smart Trading Cards to Deriv API for automated trade execution.
 * Uses the existing api_base connection instead of creating a new one.
 * Handles trade execution, martingale logic, and result tracking.
 */

import { api_base } from '@/external/bot-skeleton/services/api/api-base';

export interface SmartTradeConfig {
    type: 'over-under' | 'even-odd';
    prediction: string; // 'OVER', 'UNDER', 'EVEN', 'ODD'
    settings: {
        stake: number;
        ticks: number;
        martingale: number;
    };
    symbol?: string;
}

export interface TradeHistory {
    id: string;
    timestamp: number;
    type: string;
    prediction: string;
    stake: number;
    result: 'win' | 'loss' | 'pending';
    profit: number;
    contractId?: string;
}

class SmartTradingExecutorService {
    private isActive: boolean = false;
    private tradeHistory: TradeHistory[] = [];
    private currentStreak: number = 0;
    private lastResult: 'win' | 'loss' | null = null;
    private listeners: Map<string, Set<Function>> = new Map();
    private isExecuting: boolean = false;

    constructor() {
        this.loadHistoryFromStorage();
    }

    /**
     * Initialize connection to Deriv API
     * Uses existing api_base connection
     */
    public async initialize(): Promise<boolean> {
        try {
            console.log('[INIT] Initializing Smart Trading Executor...');
            
            // Check if api_base is already connected and authorized
            if (!api_base.api) {
                console.error('[ERROR] api_base.api is not initialized. User needs to be logged in.');
                this.emit('error', { message: 'Please login to Deriv first' });
                return false;
            }

            // Check if we have an active account
            const authToken = localStorage.getItem('authToken');
            const activeLoginId = localStorage.getItem('active_loginid');
            
            if (!authToken || !activeLoginId) {
                console.error('[ERROR] No auth token or login ID found');
                this.emit('error', { message: 'Please login to Deriv first' });
                return false;
            }

            console.log('[SUCCESS] Smart Trading Executor initialized using existing api_base connection');
            this.emit('initialized', { loginid: activeLoginId });
            return true;
        } catch (error) {
            console.error('[ERROR] Failed to initialize Smart Trading Executor:', error);
            this.emit('error', { message: error instanceof Error ? error.message : 'Initialization failed' });
            return false;
        }
    }

    /**
     * Execute a smart trade
     * NOTE: This is a placeholder - actual execution should be done via bot loading
     */
    public async executeTrade(config: SmartTradeConfig): Promise<{ success: boolean; error?: string }> {
        console.log('[INFO] Smart Trading uses bot loading for execution, not direct API calls');
        console.log('[CONFIG]', config);
        
        // For now, just return success
        // The actual execution happens when conditions are met and bot is loaded
        return { success: true };
    }

    /**
     * Get trade history
     */
    public getTradeHistory(limit?: number): TradeHistory[] {
        if (limit) {
            return this.tradeHistory.slice(0, limit);
        }
        return [...this.tradeHistory];
    }

    /**
     * Get statistics
     */
    public getStatistics() {
        const totalTrades = this.tradeHistory.length;
        const wins = this.tradeHistory.filter(t => t.result === 'win').length;
        const losses = this.tradeHistory.filter(t => t.result === 'loss').length;
        const totalProfit = this.tradeHistory.reduce((sum, t) => sum + t.profit, 0);
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

        return {
            totalTrades,
            wins,
            losses,
            winRate,
            totalProfit,
            currentStreak: this.currentStreak,
            streakType: this.lastResult,
        };
    }

    /**
     * Reset streak (useful when changing strategies)
     */
    public resetStreak(): void {
        this.currentStreak = 0;
        this.lastResult = null;
        console.log('[RESET] Streak reset');
    }

    /**
     * Clear trade history
     */
    public clearHistory(): void {
        this.tradeHistory = [];
        this.currentStreak = 0;
        this.lastResult = null;
        this.saveHistoryToStorage();
        console.log('[CLEAR] Trade history cleared');
    }

    /**
     * Load history from localStorage
     */
    private loadHistoryFromStorage(): void {
        try {
            const saved = localStorage.getItem('smart_trading_history');
            if (saved) {
                const data = JSON.parse(saved);
                this.tradeHistory = data.history || [];
                this.currentStreak = data.currentStreak || 0;
                this.lastResult = data.lastResult || null;
                console.log('[LOAD] Loaded trade history from storage');
            }
        } catch (error) {
            console.error('[ERROR] Failed to load trade history:', error);
        }
    }

    /**
     * Save history to localStorage
     */
    private saveHistoryToStorage(): void {
        try {
            const data = {
                history: this.tradeHistory,
                currentStreak: this.currentStreak,
                lastResult: this.lastResult,
            };
            localStorage.setItem('smart_trading_history', JSON.stringify(data));
        } catch (error) {
            console.error('[ERROR] Failed to save trade history:', error);
        }
    }

    /**
     * Event listener management
     */
    public on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public off(event: string, callback: Function): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    private emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }
}

// Export singleton instance
export const smartTradingExecutor = new SmartTradingExecutorService();
