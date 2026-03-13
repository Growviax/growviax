import { NextResponse } from 'next/server';

// CoinGecko free API for market data
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

let cachedCoins: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('per_page') || '20');
        const search = searchParams.get('search') || '';

        const now = Date.now();

        // Use cache if available
        if (cachedCoins && now - cacheTimestamp < CACHE_DURATION && !search) {
            const start = (page - 1) * perPage;
            const paginatedCoins = cachedCoins.slice(start, start + perPage);
            return NextResponse.json({
                coins: paginatedCoins,
                total: cachedCoins.length,
                page,
                perPage,
            });
        }

        const url = search
            ? `${COINGECKO_API}/search?query=${encodeURIComponent(search)}`
            : `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            // Return mock data if API is rate limited
            return NextResponse.json({
                coins: getMockCoins().slice((page - 1) * perPage, page * perPage),
                total: getMockCoins().length,
                page,
                perPage,
            });
        }

        const data = await response.json();

        if (search) {
            const coins = (data.coins || []).map((coin: any) => ({
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                image: coin.large || coin.thumb,
                current_price: null,
                price_change_percentage_24h: null,
                market_cap: null,
                total_volume: null,
            }));
            return NextResponse.json({ coins, total: coins.length, page: 1, perPage: coins.length });
        }

        if (!search) {
            cachedCoins = data;
            cacheTimestamp = now;
        }

        const start = (page - 1) * perPage;
        const paginatedCoins = data.slice(start, start + perPage);

        return NextResponse.json({
            coins: paginatedCoins,
            total: data.length,
            page,
            perPage,
        });
    } catch (error: any) {
        console.error('Market coins error:', error);
        return NextResponse.json({
            coins: getMockCoins(),
            total: 20,
            page: 1,
            perPage: 20,
        });
    }
}

function getMockCoins() {
    return [
        { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: '', current_price: 97500, price_change_percentage_24h: 2.1, market_cap: 1920000000000, total_volume: 45000000000 },
        { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: '', current_price: 3750, price_change_percentage_24h: -0.8, market_cap: 450000000000, total_volume: 18000000000 },
        { id: 'tether', symbol: 'usdt', name: 'Tether', image: '', current_price: 1.00, price_change_percentage_24h: 0.01, market_cap: 140000000000, total_volume: 60000000000 },
        { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: '', current_price: 715, price_change_percentage_24h: 1.5, market_cap: 110000000000, total_volume: 2200000000 },
        { id: 'solana', symbol: 'sol', name: 'Solana', image: '', current_price: 195, price_change_percentage_24h: 4.2, market_cap: 95000000000, total_volume: 5500000000 },
        { id: 'ripple', symbol: 'xrp', name: 'XRP', image: '', current_price: 2.85, price_change_percentage_24h: -1.3, market_cap: 165000000000, total_volume: 8500000000 },
        { id: 'cardano', symbol: 'ada', name: 'Cardano', image: '', current_price: 1.05, price_change_percentage_24h: 3.1, market_cap: 37000000000, total_volume: 1200000000 },
        { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: '', current_price: 0.38, price_change_percentage_24h: -2.7, market_cap: 56000000000, total_volume: 3200000000 },
        { id: 'polkadot', symbol: 'dot', name: 'Polkadot', image: '', current_price: 9.8, price_change_percentage_24h: 1.8, market_cap: 14000000000, total_volume: 500000000 },
        { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', image: '', current_price: 42, price_change_percentage_24h: 5.1, market_cap: 17000000000, total_volume: 900000000 },
        { id: 'chainlink', symbol: 'link', name: 'Chainlink', image: '', current_price: 22, price_change_percentage_24h: 1.2, market_cap: 14000000000, total_volume: 700000000 },
        { id: 'polygon', symbol: 'matic', name: 'Polygon', image: '', current_price: 0.52, price_change_percentage_24h: -0.5, market_cap: 5200000000, total_volume: 350000000 },
    ];
}
