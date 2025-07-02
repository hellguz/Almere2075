import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config';
import type { GamificationStats } from '../../types';
import './GamificationWidget.css';

/**
 * A widget that displays gamification stats like score and a countdown timer.
 * @returns {JSX.Element} The rendered GamificationWidget component.
 */
const GamificationWidget: React.FC = () => {
    const [stats, setStats] = useState<GamificationStats>({ happiness_score: 0, target_score: 1000, deadline_iso: '' });
    const [timeLeft, setTimeLeft] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/gamification-stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data: GamificationStats = await response.json();
            setStats(data);
        } catch (error) {
             console.error("Error fetching gamification stats:", error);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Poll for new scores
        return () => clearInterval(interval);
    }, [fetchStats]);

    useEffect(() => {
        if (!stats.deadline_iso) return;
        const interval = setInterval(() => {
            const now = new Date();
            const deadline = new Date(stats.deadline_iso);
            const diff = deadline.getTime() - now.getTime();
            if (diff <= 0) {
               setTimeLeft('DEADLINE REACHED');
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        }, 1000);
        return () => clearInterval(interval);
    }, [stats.deadline_iso]);

    return (
        <div className="gamification-widget">
            <div className="info-tooltip">
                <span>i</span>
                <div className="info-tooltip-text">
                    <b>Help Almere get happier!</b>
                    <br />
                    Every "👍" vote in the Community Gallery adds 1 point to the city's score.
                    Let's reach the goal of <b>1000 points</b> before the deadline on <b>July 13th</b>! You can vote once per minute.
                </div>
            </div>
            <div className="widget-main">
                <div className="score-display">
                    <span className="score-value">{stats.happiness_score}</span>
                    <span className="score-target"> / {stats.target_score}</span>
                    {/* MODIFIED: Changed text from "Happy Points" */}
                    <span className="score-label">Total Votes 👍</span>
                </div>
                <div className="score-bar-container">
                    <div className="score-bar" style={{ width: `${Math.min(100, (stats.happiness_score / stats.target_score) * 100)}%` }}></div>
                </div>
            </div>
            <div className="widget-deadline">
                <div className="countdown-text">{timeLeft || '...'}</div>
                <div className="countdown-label">Until Deadline</div>
            </div>
        </div>
    );
};

export default GamificationWidget;



