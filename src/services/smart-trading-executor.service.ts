/**
 * Smart Trading Executor Service
 * 
 * Connects Smart Trading Cards to Deriv API for automated trade execution.
 * Handles trade execution, martingale logic, and result tracking.
 */

import { derivAPI, TradeConfig, TradeResult } from '@/utils/deriv-trading-api';

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
     */
    public async initialize(): Promise<boolean> {
        try {
            console.log('🚀 Initializing Smart Trading Executor...');
            
            // Check if we have auth token
            const token = derivAPI.getAuthToken();
            if (!token) {
                console.warn('⚠️ No auth token found. User needs to login first.');
                this.emit('error', { message: 'Please login to Deriv first' });
                return false;
            }

            // Connect to Deriv API
            await derivAPI.connect();
            
            // Authorize
            const accountInfo = await derivAPI.authorize();
            console.log('✅ Smart Trading Executor initialized:', accountInfo);
            
            this.emit('initialized', accountInfo);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Smart Trading Executor:', error);
            this.emit('error', { message: error instanceof Error ? error.message : 'Initialization failed' });
            return false;
        }
    }

    /**
     * Execute a smart trade
     */
    public async executeTrade(config: SmartTradeConfig): Promise<TradeResult> {
        if (this.isExecuting) {
            console.warn('⚠️ Trade already in progress, skipping...');
            return { success: false, error: 'Trade already in progress' };
        }

        this.isExecuting = true;

        try {
            console.log('📊 Executing smart trade:', config);

            // Check if API is ready
            if (!derivAPI.isReady()) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('Failed to initialize Deriv API');
                }
            }

            // Calculate stake with martingale
            const stake = this.calculateStake(config.settings.stake, config.settings.martingale);

            // Convert prediction to Deriv contract type
            const tradeConfig = this.convertToTradeConfig(config, stake);

            // Execute trade
            const result = await derivAPI.executeTrade(tradeConfig);

            // Record trade
            const tradeRecord: TradeHistory = {
                id: result.contractId || `trade-${Date.now()}`,
                timestamp: Date.now(),
                type: config.type,
                prediction: config.prediction,
                stake,
                result: result.success ? (result.profit! > 0 ? 'win' : 'loss') : 'loss',
                profit: result.profit || 0,
                contractId: result.contractId,
            };

            this.addTradeToHistory(tradeRecord);

            // Update streak
            if (tradeRecord.result === 'win') {
                if (this.lastResult === 'win') {
                    this.currentStreak++;
                } else {
                    this.currentStreak = 1;
                }
                this.lastResult = 'win';
            } else {
                if (this.lastResult === 'loss') {
                    this.currentStreak++;
                } else {
                    this.currentStreak = 1;
                }
                this.lastResult = 'loss';
            }

            // Emit trade result
            this.emit('trade-executed', {
                trade: tradeRecord,
                result,
                streak: this.currentStreak,
                streakType: this.lastResult,
            });

            console.log(`${tradeRecord.result === 'win' ? '✅' : '❌'} Trade ${tradeRecord.result}:`, {
                profit: tradeRecord.profit,
                streak: this.currentStreak,
            });

            return result;
        } catch (error) {
            console.error('❌ Trade execution failed:', error);
            
            const errorResult: TradeResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };

            this.emit('trade-error', { error: errorResult.error, config });
            
            return errorResult;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Calculate stake with martingale
     */
    private calculateStake(baseStake: number, martingaleMultiplier: number): number {
        if (this.lastResult === 'loss' && this.currentStreak > 0) {
            // Apply martingale: stake * (multiplier ^ streak)
            return baseStake * Math.pow(martingaleMultiplier, this.currentStreak);
        }
        return baseStake;
    }

    /**
     * Convert smart trade config to Deriv trade config
     */
    private convertToTradeConfig(config: SmartTradeConfig, stake: number): TradeConfig {
        const symbol = config.symbol || 'R_100';
        const duration = config.settings.ticks;

        let tradeType: TradeConfig['tradeType'];
        let prediction: number | undefined;

        switch (config.prediction) {
            case 'EVEN':
                tradeType = 'DIGITEVEN';
                break;
            case 'ODD':
                tradeType = 'DIGITODD';
                break;
            case 'OVER':
                tradeType = 'DIGITOVER';
                prediction = 5; // Default barrier
                break;
            case 'UNDER':
                tradeType = 'DIGITUNDER';
                prediction = 5; // Default barrier
                break;
            default:
                throw new Error(`Unknown prediction type: ${config.prediction}`);
        }

        return {
            market: symbol,
            tradeType,
            stake,
            duration,
            durationType: 't',
            prediction,
        };
    }

    /**
     * Add trade to history
     */
    private addTradeToHistory(trade: TradeHistory): void {
        this.tradeHistory.unshift(trade);
        
        // Keep only last 100 trades
        if (this.tradeHistory.length > 100) {
            this.tradeHistory = this.tradeHistory.slice(0, 100);
        }

        this.saveHistoryToStorage();
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
        console.log('🔄 Streak reset');
    }

    /**
     * Clear trade history
     */
    public clearHistory(): void {
        this.tradeHistory = [];
        this.currentStreak = 0;
        this.lastResult = null;
        this.saveHistoryToStorage();
        console.log('🗑️ Trade history cleared');
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
                console.log('✅ Loaded trade history from storage');
            }
        } catch (error) {
            console.error('Error loading trade history:', error);
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
            console.error('Error saving trade history:', error);
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

    /**
     * Check if executor is ready
     */
    public isReady(): boolean {
        return derivAPI.isReady();
    }

    /**
     * Get account balance
     */
    public async getBalance(): Promise<number> {
        try {
            return await derivAPI.getBalance();
        } catch (error) {
            console.error('Error getting balance:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const smartTradingExecutor = new SmartTradingExecutorService();
