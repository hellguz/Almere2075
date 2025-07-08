/**
 * ADDED: Configuration file for the News Ticker.
 * This allows for easy adjustments to the ticker's behavior without editing components.
 */
interface TickerConfig {
    showTopTicker: boolean;
    showBottomTicker: boolean;
    tickerHeight: string;
    tickerSpeed: number;
}

export const tickerConfig: TickerConfig = {
    /**
     * Set to true to display the news ticker at the top of the screen.
     */
    showTopTicker: true,

    /**
     * Set to true to display the news ticker at the bottom of the screen.
     */
    showBottomTicker: false,

    /**
     * The height of the ticker bar. Use any valid CSS unit (e.g., '40px').
     */
    tickerHeight: '40px',

    /**
     * The time in seconds it takes for a single news item to scroll across the screen.
     * The total animation duration is this value multiplied by the number of news items.
     * A higher number means a slower speed.
     */
    tickerSpeed: 60,
};
