import React, { useState, useEffect, useRef } from 'react';
import { copyTradingAPI, CopyTradingConfig, CopyTradingStatistics } from '../../services/copy-trading-api.service';
import './CopyTrader.scss';

interface CopyTraderProps {
    onClose?: () => void;
}

export const CopyTrader: React.FC<CopyTraderProps> = ({ onClose }) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [newToken, setNewToken] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [isDemoActive, setIsDemoActive] = useState(false);
    const [message, setMessage] = useState('');
    const [config, setConfig] = useState<CopyTradingConfig>({
        copy_trading: { is_active: false },
        demo_copy_trading: { is_active: false, login_id: '' }
    });
    const [statistics, setStatistics] = useState<CopyTradingStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load saved tokens and config on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            // Load tokens
            const savedTokens = copyTradingAPI.retrieveCopyTradingTokens();
            setTokens(savedTokens);

            // Load config
            const savedConfig = copyTradingAPI.getConfig();
            setConfig(savedConfig);
            setIsActive(savedConfig.copy_trading.is_active);
            setIsDemoActive(savedConfig.demo_copy_trading.is_active);

            // Load statistics
            const stats = await copyTradingAPI.copytradingStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Error loading initial data:', error);
            showMessage('Error loading copy trading data');
        } finally {
            setIsLoading(false);
        }
    };

    // Add new token
    const addToken = async () => {
        if (newToken.trim() && !tokens.includes(newToken.trim())) {
            setIsLoading(true);
            try {
                const success = await copyTradingAPI.updateCopyTradingTokens(newToken.trim());
                if (success) {
                    const updatedTokens = copyTradingAPI.retrieveCopyTradingTokens();
                    setTokens(updatedTokens);
                    setNewToken('');
                    showMessage('Token added successfully!');
                } else {
                    showMessage('Failed to add token');
                }
            } catch (error) {
                console.error('Error adding token:', error);
                showMessage('Error adding token');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Remove token
    const removeToken = (tokenToRemove: string) => {
        try {
            const success = copyTradingAPI.removeCopyTradingTokens(tokenToRemove);
            if (success) {
                const updatedTokens = copyTradingAPI.retrieveCopyTradingTokens();
                setTokens(updatedTokens);
                showMessage('Token removed successfully!');
            } else {
                showMessage('Failed to remove token');
            }
        } catch (error) {
            console.error('Error removing token:', error);
            showMessage('Error removing token');
        }
    };

    // Toggle copy trading
    const toggleCopyTrading = () => {
        const newState = !isActive;
        setIsActive(newState);
        
        const success = copyTradingAPI.toggleCopyTrading(newState);
        if (success) {
            const status = newState ? 'started' : 'stopped';
            showMessage(`Copy trading ${status} successfully for all ${tokens.length} tokens!`);
        } else {
            setIsActive(!newState); // Revert on failure
            showMessage('Failed to toggle copy trading');
        }
    };

    // Toggle demo copy trading
    const toggleDemoCopyTrading = () => {
        const newState = !isDemoActive;
        setIsDemoActive(newState);
        
        const success = copyTradingAPI.enableDemoCopyTrading({
            copy_status: newState ? 'enable' : 'disable',
            account_id: tokens[0] || ''
        });

        if (success) {
            const status = newState ? 'started' : 'stopped';
            showMessage(`Demo to Real copy trading ${status} successfully`);
        } else {
            setIsDemoActive(!newState); // Revert on failure
            showMessage('Failed to toggle demo copy trading');
        }
    };

    // Show temporary message
    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 5000);
    };

    return (
        <div className="copy-trader-container">
            <div className="copy-trader-header">
                <h2>Copy Trader</h2>
                {onClose && (
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                )}
            </div>

            {message && (
                <div className="message-banner">
                    {message}
                </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
                <div className="loading-banner">
                    Loading...
                </div>
            )}

            {/* Statistics Section */}
            {statistics && (
                <div className="statistics-section">
                    <h3>Copy Trading Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Total Trades</span>
                            <span className="stat-value">{statistics.total_trades}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Successful</span>
                            <span className="stat-value success">{statistics.successful_trades}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Failed</span>
                            <span className="stat-value failed">{statistics.failed_trades}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Success Rate</span>
                            <span className="stat-value">{(statistics.success_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Profit</span>
                            <span className={`stat-value ${statistics.total_profit >= 0 ? 'profit' : 'loss'}`}>
                                ${statistics.total_profit.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Demo Copy Trading Section */}
            <div className="demo-copy-section">
                <h3>Demo to Real Copy Trading</h3>
                <p>Copy trades from demo account to real account</p>
                <button 
                    className={`copy-trading-btn ${isDemoActive ? 'stop' : 'start'}`}
                    onClick={toggleDemoCopyTrading}
                >
                    {isDemoActive ? 'Stop Demo to Real Copy Trading' : 'Start Demo to Real Copy Trading'}
                </button>
            </div>

            {/* Token Management Section */}
            <div className="token-section">
                <h3>Trading Tokens</h3>
                <div className="token-input-container">
                    <input
                        type="text"
                        value={newToken}
                        onChange={(e) => setNewToken(e.target.value)}
                        placeholder="Enter trading token..."
                        className="token-input"
                        onKeyPress={(e) => e.key === 'Enter' && addToken()}
                    />
                    <button onClick={addToken} className="add-token-btn">
                        Add Token
                    </button>
                </div>

                <div className="tokens-container">
                    {tokens.length === 0 ? (
                        <p className="no-tokens">No tokens added yet</p>
                    ) : (
                        tokens.map((token, index) => (
                            <div key={index} className="token-item">
                                <span className="token-text">{token}</span>
                                <button 
                                    onClick={() => removeToken(token)}
                                    className="remove-token-btn"
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Copy Trading Section */}
            <div className="main-copy-section">
                <h3>Copy Trading Control</h3>
                <p>Manage copy trading for all tokens</p>
                <button 
                    className={`copy-trading-btn ${isActive ? 'stop' : 'start'}`}
                    onClick={toggleCopyTrading}
                    disabled={tokens.length === 0}
                >
                    {isActive ? 'Stop Copy Trading' : 'Start Copy Trading'}
                </button>
                {tokens.length === 0 && (
                    <p className="warning-text">Add at least one token to enable copy trading</p>
                )}
            </div>

            {/* Tutorial Section */}
            <div className="tutorial-section">
                <h3>Copy Trading Tutorial</h3>
                <p>Learn how to use copy trading effectively</p>
                <button className="tutorial-btn">
                    Watch Tutorial
                </button>
            </div>
        </div>
    );
};

export default CopyTrader;