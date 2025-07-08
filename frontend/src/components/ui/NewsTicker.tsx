import React, { useState, useEffect, useMemo } from 'react';
import { tickerConfig } from '../../tickerConfig';
import './NewsTicker.css';

interface NewsItem {
    id: number;
    text: string;
}

interface NewsTickerProps {
    position: 'top' | 'bottom';
}

/**
 * A component that displays a scrolling news ticker.
 * It fetches news from a public JSON file and can be configured via tickerConfig.ts.
 * @param {NewsTickerProps} props The component props.
 * @returns {JSX.Element | null} The rendered NewsTicker component.
 */
const NewsTicker: React.FC<NewsTickerProps> = ({ position }) => {
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await fetch('/news.json');
                if (!response.ok) {
                    throw new Error(`Failed to fetch news: ${response.statusText}`);
                }
                const data = await response.json();
                setNewsItems(data.newsItems || []);
            } catch (error) {
                console.error("Could not load news for ticker:", error);
            }
        };

        fetchNews();
    }, []);

    // Memoize the content to prevent re-rendering unless newsItems changes.
    // The content is duplicated to ensure a seamless loop.
    const tickerContent = useMemo(() => {
        if (newsItems.length === 0) return null;
        const allText = newsItems.map(item => item.text).join(' +++ ');
        return (
            <>
                <span className="news-item">{allText}</span>
                <span className="news-item">{allText}</span>
            </>
        );
    }, [newsItems]);

    if (newsItems.length === 0) {
        return null;
    }

    const style = {
        '--ticker-height': tickerConfig.tickerHeight,
    } as React.CSSProperties;

    const contentStyle = {
        animationDuration: `${newsItems.length * tickerConfig.tickerSpeed}s`,
    };

    return (
        <div className={`news-ticker-container ${position}`} style={style}>
            <div className="news-ticker-content" style={contentStyle}>
                {tickerContent}
            </div>
        </div>
    );
};

export default NewsTicker;
