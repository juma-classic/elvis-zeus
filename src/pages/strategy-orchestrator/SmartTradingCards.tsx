import React, { useState, useEffect } from 'react';
import { marketAnalyzer, AnalysisResult } from '@/services/market-analyzer.service';
import { smartTradingExecutor, SmartTradeConfig, TradeHistory } from '@/services/smart-trading-executor.service';
import { 
    CheckIcon, 
    CrossIcon, 
    ClockIcon, 
    ArrowUpIcon, 
    ArrowDownIcon,
    ChartIcon,
    CogwheelIcon,
    BoltIcon
} from './MechanicalIcons';
import './SmartTradingCards.scss';

interface TradingCondition {
    enabled: boolean;
    lastNTicks: number;
    targetValue: string;
    comparison: string;
    threshold: number;
}

interface TradingSettings {
    stake: number;
    ticks: number;
    martingale: number;
}

const SmartTradingCards: React.FC = () => {
    // Over/Under state
    const [overUnderBarrier, setOverUnderBarrier] = useState(5);
    const [overProb, setOverProb] = useState(0);
    const [underProb, setUnderProb] = useState(0);
    const [overUnderCondition, setOverUnderCondition] = useState<TradingCondition>({
        enabled: false,
        lastNTicks: 3,
        targetValue: 'Over',
        comparison: '>',
        threshold: 55,
    });
    const [overUnderSettings, setOverUnderSettings] = useState<TradingSettings>({
        stake: 0.5,
        ticks: 1,
        martingale: 1,
    });
    const [overUnderActive, setOverUnderActive] = useState(false);

    // Even/Odd state
    const [evenProb, setEvenProb] = useState(0);
    const [oddProb, setOddProb] = useState(0);
    const [lastDigitsPattern, setLastDigitsPattern] = useState<string[]>([]);
    const [currentStreak, setCurrentStreak] = useState({ count: 0, type: '' });
    const [evenOddCondition, setEvenOddCondition] = useState<TradingCondition>({
        enabled: false,
        lastNTicks: 3,
        targetValue: 'Even',
        comparison: '>=',
        threshold: 55,
    });
    const [evenOddSettings, setEvenOddSettings] = useState<TradingSettings>({
        stake: 0.5,
        ticks: 1,
        martingale: 1,
    });
    const [evenOddActive, setEvenOddActive] = useState(false);

    // Recent trades state
    const [recentTrades, setRecentTrades] = useState<TradeHistory[]>([]);

    useEffect(() => {
        // Listen to market analyzer analysis results
        const handleAnalysis = (result: AnalysisResult) => {
            if (result.strategyType === 'over-under') {
                setOverProb(parseFloat(result.data.overProbability));
                setUnderProb(parseFloat(result.data.underProbability));
                
                // Check trading condition
                if (overUnderActive && overUnderCondition.enabled) {
                    checkOverUnderCondition(result);
                }
            } else if (result.strategyType === 'even-odd') {
                setEvenProb(parseFloat(result.data.evenProbability));
                setOddProb(parseFloat(result.data.oddProbability));
                setLastDigitsPattern(result.data.evenOddPattern || []);
                setCurrentStreak({
                    count: result.data.streak || 0,
                    type: result.data.streakType || '',
                });
                
                // Check trading condition
                if (evenOddActive && evenOddCondition.enabled) {
                    checkEvenOddCondition(result);
                }
            }
        };

        // Listen to trade execution events
        const handleTradeExecuted = () => {
            // Update recent trades list
            const trades = smartTradingExecutor.getTradeHistory(5);
            setRecentTrades(trades);
        };

        marketAnalyzer.on('analysis', handleAnalysis);
        smartTradingExecutor.on('trade-executed', handleTradeExecuted);

        // Load initial trade history
        setRecentTrades(smartTradingExecutor.getTradeHistory(5));

        return () => {
            marketAnalyzer.off('analysis', handleAnalysis);
            smartTradingExecutor.off('trade-executed', handleTradeExecuted);
        };
    }, [overUnderActive, overUnderCondition, evenOddActive, evenOddCondition]);

    const checkOverUnderCondition = (result: AnalysisResult) => {
        const prob = overUnderCondition.targetValue === 'Over' ? overProb : underProb;
        
        // Check main probability condition
        let mainConditionMet = false;
        switch (overUnderCondition.comparison) {
            case '>':
                mainConditionMet = prob > overUnderCondition.threshold;
                break;
            case '>=':
                mainConditionMet = prob >= overUnderCondition.threshold;
                break;
            case '<':
                mainConditionMet = prob < overUnderCondition.threshold;
                break;
            case '<=':
                mainConditionMet = prob <= overUnderCondition.threshold;
                break;
            case '=':
                mainConditionMet = Math.abs(prob - overUnderCondition.threshold) < 0.1;
                break;
        }

        console.log('[CONDITION] Checking Over/Under conditions:', {
            probability: prob,
            threshold: overUnderCondition.threshold,
            comparison: overUnderCondition.comparison,
            mainConditionMet,
            lastNTicksEnabled: overUnderCondition.enabled
        });

        // If main condition is not met, don't proceed
        if (!mainConditionMet) {
            console.log('[CONDITION] Main probability condition NOT met');
            return;
        }

        console.log('[CONDITION] ✓ Main probability condition MET');

        // Check optional "last N ticks" condition ONLY if enabled
        if (overUnderCondition.enabled) {
            console.log('[CONDITION] Checking optional "last N ticks" condition...');
            
            // Get the last N ticks from the result data
            const tickHistory = result.data.tickHistory || [];
            const lastNTicks = tickHistory.slice(-overUnderCondition.lastNTicks);
            
            console.log('[CONDITION] Last N ticks data:', {
                tickHistory: tickHistory.slice(-10), // Show last 10 for context
                lastNTicks,
                barrier: overUnderBarrier,
                targetValue: overUnderCondition.targetValue
            });
            
            // Check if all last N ticks match the target (Over or Under)
            const allMatch = lastNTicks.every((tick: any) => {
                const lastDigit = parseInt(tick.toString().slice(-1));
                if (overUnderCondition.targetValue === 'Over') {
                    return lastDigit > overUnderBarrier;
                } else {
                    return lastDigit < overUnderBarrier;
                }
            });

            // If the "last N ticks" condition is not met, don't proceed
            if (!allMatch) {
                console.log('[CONDITION] ✗ Last N ticks condition NOT satisfied');
                console.log('[CONDITION] Last N ticks details:', lastNTicks.map((tick: any) => {
                    const lastDigit = parseInt(tick.toString().slice(-1));
                    return { tick, lastDigit, barrier: overUnderBarrier, isOver: lastDigit > overUnderBarrier };
                }));
                return;
            }
            
            console.log('[CONDITION] ✓ Last N ticks condition MET');
        } else {
            console.log('[CONDITION] ⊘ Last N ticks condition DISABLED (skipped)');
        }

        // All conditions met! Load bot and execute trade
        console.log('[CONDITION] All Over/Under conditions met! Loading Raziel bot and executing trade...');
        console.log('[CONDITION] Details:', {
            probability: prob,
            threshold: overUnderCondition.threshold,
            comparison: overUnderCondition.comparison,
            lastNTicksEnabled: overUnderCondition.enabled,
            lastNTicks: overUnderCondition.lastNTicks
        });
        
        // Load Raziel Over Under bot when ALL conditions are met
        window.dispatchEvent(new CustomEvent('load.bot.file', {
            detail: { 
                botFile: 'Raziel Over Under.xml',
                source: 'smart-trading-over-under-condition',
                autoRun: true  // Auto-run the bot after loading
            }
        }));

        // Wait for bot to load, then trigger the Run button
        setTimeout(() => {
            console.log('[EXECUTE] Triggering bot execution via Run button...');
            
            // Open the run panel drawer
            const rootStore = (window as any).Blockly?.derivWorkspace?.store?.root_store;
            if (rootStore?.run_panel) {
                rootStore.run_panel.toggleDrawer(true);
                console.log('[SUCCESS] Run panel drawer opened');
            }
            
            // Click the Run button programmatically
            const runButton = document.getElementById('db-animation__run-button');
            if (runButton) {
                runButton.click();
                console.log('[SUCCESS] Bot started via Run button');
            } else {
                console.error('[ERROR] Run button not found');
            }
        }, 2000); // 2 second delay to ensure bot is fully loaded
    };

    const checkEvenOddCondition = (result: AnalysisResult) => {
        // Check if last N ticks match the condition
        const pattern = lastDigitsPattern.slice(-evenOddCondition.lastNTicks);
        const targetPattern = evenOddCondition.targetValue === 'Even' ? 'E' : 'O';
        const matchCount = pattern.filter(p => p === targetPattern).length;
        
        if (matchCount === evenOddCondition.lastNTicks) {
            executeTrade('even-odd', evenOddCondition.targetValue, evenOddSettings);
        }
    };

    const executeTrade = async (type: string, prediction: string, settings: TradingSettings) => {
        console.log(`[EXECUTE] ${type} trade:`, {
            prediction,
            stake: settings.stake,
            ticks: settings.ticks,
            martingale: settings.martingale,
        });

        const tradeConfig: SmartTradeConfig = {
            type: type as 'over-under' | 'even-odd',
            prediction,
            settings,
            symbol: marketAnalyzer.getStatus().symbol,
        };

        // Execute trade via smart trading executor
        const result = await smartTradingExecutor.executeTrade(tradeConfig);

        if (result.success) {
            console.log('[SUCCESS] Trade executed successfully:', result);
        } else {
            console.error('[ERROR] Trade failed:', result.error);
        }
    };

    const toggleOverUnderTrading = async () => {
        if (!overUnderActive) {
            // Starting auto trading
            // Check if user is logged in first
            const authToken = localStorage.getItem('authToken');
            const activeLoginId = localStorage.getItem('active_loginid');
            
            if (!authToken || !activeLoginId) {
                alert('Please login to Deriv first. Click the "Login" button in the top right corner.');
                return;
            }
            
            // Initialize executor before starting
            const initialized = await smartTradingExecutor.initialize();
            if (!initialized) {
                alert('Failed to connect to Deriv API. Please make sure you are logged in.');
                return;
            }
            
            setOverUnderActive(true);
            console.log('[START] Over/Under Auto Trading Started - Waiting for conditions...');
        } else {
            // Stopping auto trading
            setOverUnderActive(false);
            console.log('[STOP] Over/Under Auto Trading Stopped');
            
            // Also stop the bot if it's running
            const stopButton = document.getElementById('db-animation__stop-button');
            if (stopButton) {
                stopButton.click();
                console.log('[STOP] Bot stopped via Stop button');
            } else {
                console.log('[INFO] Bot is not running or Stop button not found');
            }
        }
    };

    const toggleEvenOddTrading = async () => {
        if (!evenOddActive) {
            // Check if user is logged in first
            const authToken = localStorage.getItem('authToken');
            const activeLoginId = localStorage.getItem('active_loginid');
            
            if (!authToken || !activeLoginId) {
                alert('Please login to Deriv first. Click the "Login" button in the top right corner.');
                return;
            }
            
            // Initialize executor before starting
            const initialized = await smartTradingExecutor.initialize();
            if (!initialized) {
                alert('Failed to connect to Deriv API. Please make sure you are logged in.');
                return;
            }
            
            setEvenOddActive(true);
            console.log('[START] Even/Odd Auto Trading Started');
        } else {
            // Stopping auto trading
            setEvenOddActive(false);
            console.log('[STOP] Even/Odd Auto Trading Stopped');
            
            // Also stop the bot if it's running
            const stopButton = document.getElementById('db-animation__stop-button');
            if (stopButton) {
                stopButton.click();
                console.log('[STOP] Bot stopped via Stop button');
            } else {
                console.log('[INFO] Bot is not running or Stop button not found');
            }
        }
    };

    return (
        <div className='smart-trading-cards'>
            {/* Over/Under Card */}
            <div className='trading-card'>
                <div className='card-header'>
                    <h3 className='card-title'>Over/Under</h3>
                </div>

                <div className='card-body'>
                    {/* Barrier Control */}
                    <div className='barrier-control'>
                        <label className='control-label'>
                            <strong>Barrier:</strong>
                            <input
                                type='number'
                                min='0'
                                max='9'
                                value={overUnderBarrier}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    setOverUnderBarrier(value);
                                    marketAnalyzer.updateBarrier(value);
                                }}
                                className='barrier-input'
                            />
                        </label>
                        <p className='barrier-description'>
                            Under: 0-{overUnderBarrier - 1}, Equals: {overUnderBarrier}, Over: {overUnderBarrier + 1}-9
                        </p>
                    </div>

                    {/* Probability Display */}
                    <div className='probability-display'>
                        <div className='prob-item'>
                            <span className='prob-label'>Over</span>
                            <div className='prob-bar over'>
                                <div className='prob-fill' style={{ width: `${overProb}%` }}>
                                    <span className='prob-value'>{overProb.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                        <div className='prob-item'>
                            <span className='prob-label'>Under</span>
                            <div className='prob-bar under'>
                                <div className='prob-fill' style={{ width: `${underProb}%` }}>
                                    <span className='prob-value'>{underProb.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trading Condition */}
                    <div className='trading-condition'>
                        <h4 className='condition-title'>Trading Condition</h4>
                        
                        <div className='condition-row'>
                            <span className='condition-label'>If</span>
                            <select
                                className='condition-select'
                                value={overUnderCondition.targetValue}
                                onChange={(e) => setOverUnderCondition({ ...overUnderCondition, targetValue: e.target.value })}
                            >
                                <option value='Over'>Over Prob</option>
                                <option value='Under'>Under Prob</option>
                            </select>
                            <select
                                className='condition-select small'
                                value={overUnderCondition.comparison}
                                onChange={(e) => setOverUnderCondition({ ...overUnderCondition, comparison: e.target.value })}
                            >
                                <option value='>'>&gt;</option>
                                <option value='>='>&gt;=</option>
                                <option value='<'>&lt;</option>
                                <option value='<='>&lt;=</option>
                                <option value='='>=</option>
                            </select>
                            <input
                                type='number'
                                className='condition-input'
                                value={overUnderCondition.threshold}
                                onChange={(e) => setOverUnderCondition({ ...overUnderCondition, threshold: parseFloat(e.target.value) })}
                            />
                            <span className='condition-unit'>%</span>
                        </div>

                        <div className='condition-row'>
                            <label className='condition-checkbox'>
                                <input
                                    type='checkbox'
                                    checked={overUnderCondition.enabled}
                                    onChange={(e) => setOverUnderCondition({ ...overUnderCondition, enabled: e.target.checked })}
                                />
                                <span>and last</span>
                            </label>
                            <input
                                type='number'
                                className='condition-input small'
                                value={overUnderCondition.lastNTicks}
                                onChange={(e) => setOverUnderCondition({ ...overUnderCondition, lastNTicks: parseInt(e.target.value) })}
                                disabled={!overUnderCondition.enabled}
                            />
                            <span className='condition-label'>ticks</span>
                        </div>

                        <div className='condition-row'>
                            <select
                                className='condition-select'
                                disabled={!overUnderCondition.enabled}
                            >
                                <option value='Over'>Over</option>
                                <option value='Under'>Under</option>
                            </select>
                            <input
                                type='number'
                                className='condition-input small'
                                defaultValue='5'
                                disabled={!overUnderCondition.enabled}
                            />
                        </div>

                        <div className='condition-row'>
                            <span className='condition-label'>Then</span>
                            <select className='condition-select'>
                                <option value='Buy Over'>Buy Over</option>
                                <option value='Buy Under'>Buy Under</option>
                            </select>
                            <span className='condition-label'>digit</span>
                            <input
                                type='number'
                                className='condition-input small'
                                defaultValue='5'
                            />
                        </div>
                    </div>

                    {/* Trading Settings */}
                    <div className='trading-settings'>
                        <div className='setting-group'>
                            <label className='setting-label'>Stake</label>
                            <input
                                type='number'
                                step='0.1'
                                min='0.1'
                                value={overUnderSettings.stake}
                                onChange={(e) => setOverUnderSettings({ ...overUnderSettings, stake: parseFloat(e.target.value) })}
                                className='setting-input'
                            />
                        </div>
                        <div className='setting-group'>
                            <label className='setting-label'>Ticks</label>
                            <input
                                type='number'
                                min='1'
                                value={overUnderSettings.ticks}
                                onChange={(e) => setOverUnderSettings({ ...overUnderSettings, ticks: parseInt(e.target.value) })}
                                className='setting-input'
                            />
                        </div>
                        <div className='setting-group'>
                            <label className='setting-label'>Martingale</label>
                            <input
                                type='number'
                                step='0.1'
                                min='1'
                                value={overUnderSettings.martingale}
                                onChange={(e) => setOverUnderSettings({ ...overUnderSettings, martingale: parseFloat(e.target.value) })}
                                className='setting-input'
                            />
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        className={`start-trading-btn ${overUnderActive ? 'active' : ''}`}
                        onClick={toggleOverUnderTrading}
                    >
                        {overUnderActive ? 'Stop Auto Trading' : 'Start Auto Trading'}
                    </button>
                </div>
            </div>

            {/* Even/Odd Card */}
            <div className='trading-card'>
                <div className='card-header'>
                    <h3 className='card-title'>Even/Odd</h3>
                    <div className='status-indicator'></div>
                </div>

                <div className='card-body'>
                    {/* Last Digits Pattern */}
                    <div className='digits-pattern'>
                        <h4 className='pattern-title'>Last Digits Pattern</h4>
                        <div className='pattern-display'>
                            {lastDigitsPattern.map((digit, index) => (
                                <span
                                    key={index}
                                    className={`digit-badge ${digit === 'E' ? 'even' : 'odd'}`}
                                >
                                    {digit}
                                </span>
                            ))}
                        </div>
                        <p className='pattern-description'>
                            Recent digit pattern (E=Even, O=Odd)
                        </p>
                        <p className='streak-info'>
                            Current streak: <strong>{currentStreak.count} {currentStreak.type}</strong>
                        </p>
                    </div>

                    {/* Trading Condition */}
                    <div className='trading-condition'>
                        <h4 className='condition-title'>Trading Condition</h4>
                        
                        <div className='condition-row'>
                            <span className='condition-label'>Check if the last</span>
                            <input
                                type='number'
                                className='condition-input small'
                                value={evenOddCondition.lastNTicks}
                                onChange={(e) => setEvenOddCondition({ ...evenOddCondition, lastNTicks: parseInt(e.target.value) })}
                            />
                            <span className='condition-label'>digits are</span>
                        </div>

                        <div className='condition-row'>
                            <select
                                className='condition-select'
                                value={evenOddCondition.targetValue}
                                onChange={(e) => setEvenOddCondition({ ...evenOddCondition, targetValue: e.target.value })}
                            >
                                <option value='Even'>Even</option>
                                <option value='Odd'>Odd</option>
                            </select>
                        </div>

                        <div className='condition-row'>
                            <span className='condition-label'>Then</span>
                            <select className='condition-select'>
                                <option value='Buy Even'>Buy Even</option>
                                <option value='Buy Odd'>Buy Odd</option>
                            </select>
                        </div>
                    </div>

                    {/* Trading Settings */}
                    <div className='trading-settings'>
                        <div className='setting-group'>
                            <label className='setting-label'>Stake</label>
                            <input
                                type='number'
                                step='0.1'
                                min='0.1'
                                value={evenOddSettings.stake}
                                onChange={(e) => setEvenOddSettings({ ...evenOddSettings, stake: parseFloat(e.target.value) })}
                                className='setting-input'
                            />
                        </div>
                        <div className='setting-group'>
                            <label className='setting-label'>Ticks</label>
                            <input
                                type='number'
                                min='1'
                                value={evenOddSettings.ticks}
                                onChange={(e) => setEvenOddSettings({ ...evenOddSettings, ticks: parseInt(e.target.value) })}
                                className='setting-input'
                            />
                        </div>
                        <div className='setting-group'>
                            <label className='setting-label'>Martingale</label>
                            <input
                                type='number'
                                step='0.1'
                                min='1'
                                value={evenOddSettings.martingale}
                                onChange={(e) => setEvenOddSettings({ ...evenOddSettings, martingale: parseFloat(e.target.value) })}
                                className='setting-input'
                            />
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        className={`start-trading-btn ${evenOddActive ? 'active' : ''}`}
                        onClick={toggleEvenOddTrading}
                    >
                        {evenOddActive ? 'Stop Auto Trading' : 'Start Auto Trading'}
                    </button>
                </div>
            </div>

            {/* Recent Trades Section */}
            {recentTrades.length > 0 && (
                <div className='recent-trades-section'>
                    <h3 className='recent-trades-title'>
                        <ChartIcon size={20} />
                        Recent Trades 
                        <span className='recent-trades-subtitle'>(View all in Transactions drawer)</span>
                    </h3>
                    <div className='recent-trades-list'>
                        {recentTrades.map((trade, index) => (
                            <div key={trade.id} className={`trade-item ${trade.result}`}>
                                <div className='trade-info'>
                                    <div className='trade-type-wrapper'>
                                        {trade.result === 'win' ? (
                                            <CheckIcon size={16} className='trade-icon win' />
                                        ) : (
                                            <CrossIcon size={16} className='trade-icon loss' />
                                        )}
                                        <span className='trade-type'>{trade.prediction}</span>
                                    </div>
                                    <div className='trade-time-wrapper'>
                                        <ClockIcon size={14} className='trade-clock' />
                                        <span className='trade-time'>
                                            {new Date(trade.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <div className='trade-result'>
                                    <div className='trade-profit-wrapper'>
                                        {trade.result === 'win' ? (
                                            <ArrowUpIcon size={16} className='profit-arrow' />
                                        ) : (
                                            <ArrowDownIcon size={16} className='profit-arrow' />
                                        )}
                                        <span className={`trade-profit ${trade.result}`}>
                                            {trade.result === 'win' ? '+' : ''}{trade.profit.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className='trade-stake'>Stake: ${trade.stake.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className='trades-stats'>
                        <div className='stat-item'>
                            <CogwheelIcon size={18} className='stat-icon' />
                            <span className='stat-label'>Total Trades:</span>
                            <span className='stat-value'>{smartTradingExecutor.getStatistics().totalTrades}</span>
                        </div>
                        <div className='stat-item'>
                            <BoltIcon size={18} className='stat-icon' />
                            <span className='stat-label'>Win Rate:</span>
                            <span className='stat-value'>{smartTradingExecutor.getStatistics().winRate.toFixed(1)}%</span>
                        </div>
                        <div className='stat-item'>
                            {smartTradingExecutor.getStatistics().totalProfit >= 0 ? (
                                <ArrowUpIcon size={18} className='stat-icon positive' />
                            ) : (
                                <ArrowDownIcon size={18} className='stat-icon negative' />
                            )}
                            <span className='stat-label'>Total Profit:</span>
                            <span className={`stat-value ${smartTradingExecutor.getStatistics().totalProfit >= 0 ? 'positive' : 'negative'}`}>
                                ${smartTradingExecutor.getStatistics().totalProfit.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartTradingCards;
