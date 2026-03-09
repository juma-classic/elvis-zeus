import React, { useState, useEffect } from 'react';
import { marketAnalyzer, AnalysisResult } from '@/services/market-analyzer.service';
import './MarketProbabilityCard.scss';

interface MarketProbabilityCardProps {
    onAutoStop?: () => void;
    onAutoContinue?: () => void;
    onManualStop?: () => void;
}

const MarketProbabilityCard: React.FC<MarketProbabilityCardProps> = ({
    onAutoStop,
    onAutoContinue,
    onManualStop
}) => {
    const [overProb, setOverProb] = useState(0);
    const [underProb, setUnderProb] = useState(0);
    const [evenProb, setEvenProb] = useState(0);
    const [oddProb, setOddProb] = useState(0);
    const [symbol, setSymbol] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [autoMode, setAutoMode] = useState<'auto-stop' | 'auto-continue' | null>(null);
    const [botRunning, setBotRunning] = useState(false);

    useEffect(() => {
        // Load saved state from localStorage
        const savedState = localStorage.getItem('smart_trading_settings');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                setAutoMode(parsed.overUnderAutoMode || null);
            } catch (error) {
                console.error('Error loading saved state:', error);
            }
        }

        const handleAnalysis = (result: AnalysisResult) => {
            if (result.strategyType === 'over-under') {
                setOverProb(parseFloat(result.data.overProbability));
                setUnderProb(parseFloat(result.data.underProbability));
            } else if (result.strategyType === 'even-odd') {
                setEvenProb(parseFloat(result.data.evenProbability));
                setOddProb(parseFloat(result.data.oddProbability));
            }
        };

        // Get current symbol
        const status = marketAnalyzer.getStatus();
        setSymbol(status.symbol);

        marketAnalyzer.on('analysis', handleAnalysis);

        return () => {
            marketAnalyzer.off('analysis', handleAnalysis);
        };
    }, []);

    // Monitor bot running state
    useEffect(() => {
        const checkBotState = () => {
            const runButton = document.getElementById('db-animation__run-button');
            const stopButton = document.getElementById('db-animation__stop-button');
            
            if (runButton && runButton.hasAttribute('disabled') && stopButton && !stopButton.hasAttribute('disabled')) {
                setBotRunning(true);
            } else {
                setBotRunning(false);
            }
        };

        const interval = setInterval(checkBotState, 1000);
        checkBotState();

        return () => clearInterval(interval);
    }, []);

    const handleAutoStop = () => {
        setAutoMode('auto-stop');
        // Update localStorage
        const savedState = localStorage.getItem('smart_trading_settings');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            parsed.overUnderAutoMode = 'auto-stop';
            localStorage.setItem('smart_trading_settings', JSON.stringify(parsed));
        }
        onAutoStop?.();
    };

    const handleAutoContinue = () => {
        setAutoMode('auto-continue');
        // Update localStorage
        const savedState = localStorage.getItem('smart_trading_settings');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            parsed.overUnderAutoMode = 'auto-continue';
            localStorage.setItem('smart_trading_settings', JSON.stringify(parsed));
        }
        onAutoContinue?.();
    };

    const handleManualStop = () => {
        setAutoMode(null);
        setBotRunning(false);
        // Update localStorage
        const savedState = localStorage.getItem('smart_trading_settings');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            parsed.overUnderActive = false;
            parsed.overUnderAutoMode = null;
            localStorage.setItem('smart_trading_settings', JSON.stringify(parsed));
        }
        
        // Stop the bot
        const stopButton = document.getElementById('db-animation__stop-button');
        if (stopButton && !stopButton.hasAttribute('disabled')) {
            stopButton.click();
        }
        
        onManualStop?.();
    };

    return (
        <div className={`market-probability-card ${isMinimized ? 'minimized' : ''}`}>
            <div className="card-header" onClick={() => setIsMinimized(!isMinimized)}>
                <span className="card-title">📊 Market Analysis</span>
                <button className="minimize-btn">{isMinimized ? '▼' : '▲'}</button>
            </div>

            {!isMinimized && (
                <div className="card-body">
                    <div className="market-info">
                        <span className="symbol-label">Symbol:</span>
                        <span className="symbol-value">{symbol}</span>
                    </div>

                    <div className="probabilities">
                        <div className="prob-section">
                            <h4>Over/Under</h4>
                            <div className="prob-row">
                                <span className="prob-label">Over:</span>
                                <div className="prob-bar">
                                    <div className="prob-fill over" style={{ width: `${overProb}%` }}>
                                        <span className="prob-text">{overProb.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="prob-row">
                                <span className="prob-label">Under:</span>
                                <div className="prob-bar">
                                    <div className="prob-fill under" style={{ width: `${underProb}%` }}>
                                        <span className="prob-text">{underProb.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="prob-section">
                            <h4>Even/Odd</h4>
                            <div className="prob-row">
                                <span className="prob-label">Even:</span>
                                <div className="prob-bar">
                                    <div className="prob-fill even" style={{ width: `${evenProb}%` }}>
                                        <span className="prob-text">{evenProb.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="prob-row">
                                <span className="prob-label">Odd:</span>
                                <div className="prob-bar">
                                    <div className="prob-fill odd" style={{ width: `${oddProb}%` }}>
                                        <span className="prob-text">{oddProb.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {autoMode && (
                        <>
                            <div className="status-indicator">
                                <span className="status-label">Status:</span>
                                <span className={`status-value ${botRunning ? 'running' : 'paused'}`}>
                                    {botRunning ? '🟢 Running' : '🟡 Paused'}
                                </span>
                                <span className="mode-label">Mode:</span>
                                <span className="mode-value">
                                    {autoMode === 'auto-stop' ? '🔄 Auto Stop' : '▶️ Auto Continue'}
                                </span>
                            </div>

                            <div className="control-buttons">
                                <button
                                    className={`control-btn ${autoMode === 'auto-stop' ? 'active' : ''}`}
                                    onClick={handleAutoStop}
                                    title="Pause when conditions are bad"
                                >
                                    🔄 Auto Stop
                                </button>
                                <button
                                    className={`control-btn ${autoMode === 'auto-continue' ? 'active' : ''}`}
                                    onClick={handleAutoContinue}
                                    title="Keep running regardless"
                                >
                                    ▶️ Auto Continue
                                </button>
                                <button
                                    className="control-btn stop"
                                    onClick={handleManualStop}
                                    title="Stop everything"
                                >
                                    ⏹️ Manual Stop
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketProbabilityCard;
