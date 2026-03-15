'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUpIcon, ArrowDownIcon, ClockIcon, ArrowLeftIcon,
    BoltIcon, SparklesIcon, TrophyIcon, XMarkIcon,
    InformationCircleIcon, CalendarDaysIcon, CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

/* ── timeframe config ─────────────────────────────── */
const TIMEFRAMES = [
    { label: '1m', seconds: 60, bars: 120 },
    { label: '5m', seconds: 300, bars: 100 },
    { label: '15m', seconds: 900, bars: 80 },
    { label: '1H', seconds: 3600, bars: 72 },
    { label: '4H', seconds: 14400, bars: 60 },
    { label: '1D', seconds: 86400, bars: 90 },
    { label: '1W', seconds: 604800, bars: 52 },
];

/* ── trade duration config ────────────────────────── */
const TRADE_DURATIONS = [
    { label: '33s', seconds: 33 },
    { label: '1m', seconds: 60 },
    { label: '5m', seconds: 300 },
];

const TRADE_FEE_PCT = 0.03; // 3%

/* ── INR amounts & multipliers ───────────────────── */
const INR_AMOUNTS = [1, 5, 10, 100, 1000];
const QTY_MULTIPLIERS = [1, 5, 10, 20, 50, 100];

type ChartType = 'candle' | 'line';

/* ── generate realistic OHLCV data ──────────────── */
function generateCandles(basePrice: number, bars: number, intervalSec: number) {
    const now = Math.floor(Date.now() / 1000);
    const candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
    let cp = basePrice * (0.92 + Math.random() * 0.08);
    for (let i = bars; i >= 0; i--) {
        const time = now - i * intervalSec;
        const open = cp;
        const vol = basePrice * (0.006 + Math.random() * 0.010);
        const bias = Math.random() - 0.48;
        const close = open + bias * vol * 2;
        const high = Math.max(open, close) + Math.random() * vol * 0.8;
        const low = Math.min(open, close) - Math.random() * vol * 0.8;
        const volume = Math.floor(50000 + Math.random() * 500000);
        candles.push({ time, open, high, low, close, volume });
        cp = close;
    }
    return candles;
}

export default function TradePage() {
    const params = useParams();
    const coinId = params.coinId as string;

    const [price, setPrice] = useState<number>(0);
    const [priceChange, setPriceChange] = useState<number>(0);
    const [direction, setDirection] = useState<'up' | 'down'>('up');
    const [selectedAmount, setSelectedAmount] = useState<number>(10);
    const [multiplier, setMultiplier] = useState<number>(1);
    const [placing, setPlacing] = useState(false);
    const [round, setRound] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(33);
    const [trades, setTrades] = useState<any[]>([]);
    const [tradeTab, setTradeTab] = useState<'open' | 'closed'>('open');
    const [tradeDuration, setTradeDuration] = useState(33);

    /* ── trade detail modal state ─────────────────── */
    const [selectedTrade, setSelectedTrade] = useState<any>(null);

    /* ── countdown & result popup state ───────────── */
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownTriggered, setCountdownTriggered] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState<{ won: boolean; amount: number } | null>(null);
    const prevRoundIdRef = useRef<number | null>(null);
    // Map of tradeId → status for detecting pending → won/lost transitions
    const prevTradeStatusMap = useRef<Record<number, string>>({});

    /* ── chart state ────────────────────────────────── */
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const candleSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const lineSeriesRef = useRef<any>(null);
    const lastCandleRef = useRef<any>(null);
    const tickIntervalRef = useRef<any>(null);
    const [tfIdx, setTfIdx] = useState(1);
    const [chartType, setChartType] = useState<ChartType>('candle');
    const [ohlc, setOhlc] = useState<{ o: number; h: number; l: number; c: number } | null>(null);

    /* ── data fetching ──────────────────────────────── */
    const fetchCoinData = useCallback(async () => {
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
            const data = await res.json();
            if (data[coinId]) {
                setPrice(data[coinId].usd);
                setPriceChange(data[coinId].usd_24h_change || 0);
            }
        } catch { }
    }, [coinId]);

    const fetchRound = useCallback(async () => {
        try {
            const res = await axios.get(`/api/bids/round?coinId=${coinId}`);
            setRound(res.data.round);
        } catch { }
    }, [coinId]);

    const fetchTrades = useCallback(async () => {
        try {
            const res = await axios.get(`/api/bids/history?coinId=${coinId}`);
            setTrades(res.data.trades || []);
        } catch { }
    }, [coinId]);

    const resolveRounds = useCallback(async () => {
        try { await axios.post('/api/bids/resolve'); } catch { }
    }, []);

    useEffect(() => {
        fetchCoinData(); fetchRound(); fetchTrades();
        const priceInterval = setInterval(fetchCoinData, 10000);
        const roundInterval = setInterval(() => { fetchRound(); resolveRounds(); }, 5000);
        return () => { clearInterval(priceInterval); clearInterval(roundInterval); };
    }, [fetchCoinData, fetchRound, fetchTrades, resolveRounds]);

    /* ── countdown & result logic ─────────────────── */
    useEffect(() => {
        if (!round) { setTimeLeft(tradeDuration); return; }
        const interval = setInterval(() => {
            const endTime = new Date(round.endTime).getTime();
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);

            // Trigger countdown popup at 10 seconds for ALL users (not just those with open trades)
            if (remaining <= 10 && remaining > 0 && !countdownTriggered) {
                setShowCountdown(true);
                setCountdownTriggered(true);
            }

            if (remaining <= 0) {
                setShowCountdown(false);
                setTimeout(async () => {
                    await resolveRounds();
                    await fetchTrades();
                    await fetchRound();
                    setCountdownTriggered(false);
                }, 1500);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [round, fetchRound, fetchTrades, resolveRounds, tradeDuration, trades, countdownTriggered]);

    /* ── Detect result: only when a trade flips from pending → won/lost ─── */
    useEffect(() => {
        const prevMap = prevTradeStatusMap.current;
        const hasPrevData = Object.keys(prevMap).length > 0;

        // Look for a trade whose previous status was 'pending' and now is 'won' or 'lost'
        if (hasPrevData) {
            for (const trade of trades) {
                const prevStatus = prevMap[trade.id];
                if (prevStatus === 'pending' && (trade.status === 'won' || trade.status === 'lost')) {
                    const won = trade.status === 'won';
                    const amt = won ? parseFloat(trade.payout) : parseFloat(trade.amount) / (1 - 0.03);
                    setResultData({ won, amount: amt });
                    setShowResult(true);
                    setTimeout(() => setShowResult(false), 6000);
                    break; // only show one result at a time
                }
            }
        }

        // Update the map with current statuses
        const newMap: Record<number, string> = {};
        for (const t of trades) newMap[t.id] = t.status;
        prevTradeStatusMap.current = newMap;
        if (round) prevRoundIdRef.current = round.id;
    }, [round, trades]);

    /* ── chart init with real-time ticks ─────────── */
    useEffect(() => {
        if (!chartRef.current || typeof window === 'undefined') return;
        let cancelled = false;

        const buildChart = async () => {
            try {
                const lc = await import('lightweight-charts');
                if (cancelled) return;

                // Clear previous tick interval
                if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
                if (chartInstance.current) { try { chartInstance.current.remove(); } catch { } }

                const chart = lc.createChart(chartRef.current!, {
                    layout: { background: { color: 'transparent' }, textColor: '#8b95a5', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
                    grid: { vertLines: { color: 'rgba(255,255,255,0.025)' }, horzLines: { color: 'rgba(255,255,255,0.025)' } },
                    width: chartRef.current!.clientWidth,
                    height: 300,
                    timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, secondsVisible: false, rightOffset: 5, barSpacing: 8 },
                    rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)', scaleMargins: { top: 0.08, bottom: 0.25 } },
                    crosshair: {
                        mode: 0,
                        horzLine: { color: 'rgba(0,255,136,0.25)', labelBackgroundColor: '#1a1a2e', width: 1, style: 3 },
                        vertLine: { color: 'rgba(0,255,136,0.25)', labelBackgroundColor: '#1a1a2e', width: 1, style: 3 },
                    },
                    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
                    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
                });

                chartInstance.current = chart;

                // Hide branding watermark
                setTimeout(() => {
                    if (!chartRef.current) return;
                    const links = chartRef.current.querySelectorAll('a');
                    links.forEach((a) => {
                        a.style.opacity = '0'; a.style.pointerEvents = 'none'; a.style.visibility = 'hidden';
                        a.style.position = 'absolute'; a.style.zIndex = '-1'; a.removeAttribute('href');
                        a.onclick = (e) => { e.preventDefault(); e.stopPropagation(); };
                    });
                }, 100);

                const chartAny = chart as any;
                let candleSeries: any;
                if (typeof chartAny.addCandlestickSeries === 'function') {
                    candleSeries = chartAny.addCandlestickSeries({
                        upColor: '#00ff88', downColor: '#ff4466',
                        borderUpColor: '#00ff88', borderDownColor: '#ff4466',
                        wickUpColor: '#00ff8888', wickDownColor: '#ff446688',
                    });
                } else {
                    candleSeries = chart.addSeries((lc as any).CandlestickSeries, {
                        upColor: '#00ff88', downColor: '#ff4466',
                        borderUpColor: '#00ff88', borderDownColor: '#ff4466',
                        wickUpColor: '#00ff8888', wickDownColor: '#ff446688',
                    });
                }
                candleSeriesRef.current = candleSeries;

                let lineSeries: any;
                if (typeof chartAny.addLineSeries === 'function') {
                    lineSeries = chartAny.addLineSeries({ color: '#00ff88', lineWidth: 2, crosshairMarkerRadius: 4, crosshairMarkerVisible: true, visible: chartType === 'line' });
                } else {
                    lineSeries = chart.addSeries((lc as any).LineSeries, { color: '#00ff88', lineWidth: 2, crosshairMarkerRadius: 4, crosshairMarkerVisible: true, visible: chartType === 'line' });
                }
                lineSeriesRef.current = lineSeries;

                let volumeSeries: any;
                if (typeof chartAny.addHistogramSeries === 'function') {
                    volumeSeries = chartAny.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
                } else {
                    volumeSeries = chart.addSeries((lc as any).HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
                }
                chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, borderVisible: false });
                volumeSeriesRef.current = volumeSeries;

                const tf = TIMEFRAMES[tfIdx];
                const bp = price || 100;
                const candles = generateCandles(bp, tf.bars, tf.seconds);
                candleSeries.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })) as any);
                lineSeries.setData(candles.map(c => ({ time: c.time, value: c.close })) as any);
                volumeSeries.setData(candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? 'rgba(0,255,136,0.18)' : 'rgba(255,68,102,0.18)' })) as any);

                candleSeries.applyOptions({ visible: chartType === 'candle' });
                lineSeries.applyOptions({ visible: chartType === 'line' });

                chart.timeScale().fitContent();

                const last = candles[candles.length - 1];
                if (last) {
                    setOhlc({ o: last.open, h: last.high, l: last.low, c: last.close });
                    lastCandleRef.current = { ...last };
                }

                chart.subscribeCrosshairMove((param: any) => {
                    if (!param || !param.time) {
                        if (lastCandleRef.current) {
                            const lc = lastCandleRef.current;
                            setOhlc({ o: lc.open, h: lc.high, l: lc.low, c: lc.close });
                        }
                        return;
                    }
                    const d = param.seriesData?.get(candleSeries);
                    if (d && 'open' in d) setOhlc({ o: d.open, h: d.high, l: d.low, c: d.close });
                });

                /* ── REAL-TIME TICK SIMULATION ──────── */
                // Update the last candle every second with micro price movements
                tickIntervalRef.current = setInterval(() => {
                    if (!lastCandleRef.current || !candleSeriesRef.current || !lineSeriesRef.current || !volumeSeriesRef.current) return;

                    const lc2 = lastCandleRef.current;
                    const now = Math.floor(Date.now() / 1000);
                    const volatility = (lc2.close || bp) * 0.0005; // 0.05% per tick
                    const change = (Math.random() - 0.48) * volatility * 2; // slight upward bias
                    const newClose = lc2.close + change;
                    const newHigh = Math.max(lc2.high, newClose);
                    const newLow = Math.min(lc2.low, newClose);
                    const newVol = lc2.volume + Math.floor(Math.random() * 5000);

                    const updatedCandle = {
                        time: lc2.time,
                        open: lc2.open,
                        high: newHigh,
                        low: newLow,
                        close: newClose,
                        volume: newVol,
                    };

                    try {
                        candleSeriesRef.current.update({ time: updatedCandle.time, open: updatedCandle.open, high: updatedCandle.high, low: updatedCandle.low, close: updatedCandle.close });
                        lineSeriesRef.current.update({ time: updatedCandle.time, value: updatedCandle.close });
                        volumeSeriesRef.current.update({ time: updatedCandle.time, value: updatedCandle.volume, color: updatedCandle.close >= updatedCandle.open ? 'rgba(0,255,136,0.18)' : 'rgba(255,68,102,0.18)' });
                    } catch { }

                    lastCandleRef.current = updatedCandle;
                    setOhlc({ o: updatedCandle.open, h: updatedCandle.high, l: updatedCandle.low, c: updatedCandle.close });

                    // Every N seconds (based on timeframe), create a new candle
                    const tf2 = TIMEFRAMES[tfIdx];
                    if (now - lc2.time >= tf2.seconds) {
                        const newCandleStart = {
                            time: now,
                            open: newClose,
                            high: newClose,
                            low: newClose,
                            close: newClose,
                            volume: 0,
                        };
                        lastCandleRef.current = newCandleStart;
                        try {
                            candleSeriesRef.current.update({ time: newCandleStart.time, open: newCandleStart.open, high: newCandleStart.high, low: newCandleStart.low, close: newCandleStart.close });
                            lineSeriesRef.current.update({ time: newCandleStart.time, value: newCandleStart.close });
                        } catch { }
                    }
                }, 1000);

                const handleResize = () => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); };
                window.addEventListener('resize', handleResize);

                return () => {
                    window.removeEventListener('resize', handleResize);
                    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
                    chart.remove();
                };
            } catch (err) { console.error('Chart error:', err); }
        };

        buildChart();
        return () => {
            cancelled = true;
            if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [price > 0 ? 1 : 0, tfIdx, chartType]);

    /* ── bid handler ────────────────────────────────── */
    const finalAmount = selectedAmount * multiplier;

    const placeBid = async () => {
        if (!finalAmount || finalAmount <= 0) { toast.error('Select an amount'); return; }
        setPlacing(true);
        try {
            const res = await axios.post('/api/bids/place', {
                coinId,
                direction,
                amount: finalAmount,
                duration: tradeDuration,
            });
            toast.success(res.data.message);
            fetchRound(); fetchTrades();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to place bid');
        } finally { setPlacing(false); }
    };

    const displayName = coinId.charAt(0).toUpperCase() + coinId.slice(1).replace(/-/g, ' ');
    const openTrades = trades.filter((t) => t.status === 'pending');
    const closedTrades = trades.filter((t) => t.status !== 'pending');
    const timerPct = (timeLeft / tradeDuration) * 100;

    const feeAmount = finalAmount * TRADE_FEE_PCT;
    const netBidAmount = finalAmount - feeAmount;

    return (
        <div className="space-y-4 overflow-x-hidden">
            {/* ── Header ────────────────────────────── */}
            <div className="flex items-center gap-3">
                <Link href="/market" className="w-9 h-9 rounded-xl bg-glass flex items-center justify-center hover:bg-glass-hover transition-colors shrink-0">
                    <ArrowLeftIcon className="w-4 h-4 text-text-secondary" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight truncate">{displayName}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl font-extrabold">${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-lg', priceChange >= 0 ? 'bg-up text-neon-green' : 'bg-down text-neon-red')}>
                            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                    </div>
                </div>
                {/* Timer */}
                <div className="relative w-12 h-12 shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                        <circle cx="24" cy="24" r="20" fill="none"
                            stroke={timeLeft <= 5 ? '#ff4466' : '#00ff88'}
                            strokeWidth="2.5" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerPct / 100)}`}
                            className="transition-all duration-1000" />
                    </svg>
                    <span className={clsx('absolute inset-0 flex items-center justify-center text-xs font-bold font-mono', timeLeft <= 5 ? 'text-neon-red' : 'text-neon-green')}>
                        {timeLeft}
                    </span>
                </div>
            </div>

            {/* ── Chart Card ────────────────────────── */}
            <div className="glass-card p-0 overflow-hidden relative">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-glass-border">
                    <div className="flex items-center gap-0.5 overflow-x-auto">
                        {TIMEFRAMES.map((tf, idx) => (
                            <button key={tf.label} onClick={() => setTfIdx(idx)}
                                className={clsx(
                                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap',
                                    tfIdx === idx
                                        ? 'bg-neon-green/15 text-neon-green'
                                        : 'text-text-muted hover:text-text-secondary'
                                )}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button onClick={() => setChartType('candle')}
                            className={clsx('p-1.5 rounded-lg transition-all', chartType === 'candle' ? 'bg-neon-green/15 text-neon-green' : 'text-text-muted hover:text-text-secondary')}
                            title="Candlestick"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <line x1="4" y1="1" x2="4" y2="15" /><rect x="2" y="4" width="4" height="5" fill="currentColor" rx="0.5" />
                                <line x1="12" y1="1" x2="12" y2="15" /><rect x="10" y="7" width="4" height="5" fill="currentColor" rx="0.5" />
                            </svg>
                        </button>
                        <button onClick={() => setChartType('line')}
                            className={clsx('p-1.5 rounded-lg transition-all', chartType === 'line' ? 'bg-neon-green/15 text-neon-green' : 'text-text-muted hover:text-text-secondary')}
                            title="Line"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1,12 4,8 7,10 10,4 15,6" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* OHLC legend overlay */}
                {ohlc && chartType === 'candle' && (
                    <div className="flex items-center gap-3 px-3 pt-2 text-[10px] font-mono">
                        <span className="text-text-muted">O <span className="text-text-primary font-semibold">${ohlc.o.toFixed(2)}</span></span>
                        <span className="text-text-muted">H <span className="text-neon-green font-semibold">${ohlc.h.toFixed(2)}</span></span>
                        <span className="text-text-muted">L <span className="text-neon-red font-semibold">${ohlc.l.toFixed(2)}</span></span>
                        <span className="text-text-muted">C <span className={clsx('font-semibold', ohlc.c >= ohlc.o ? 'text-neon-green' : 'text-neon-red')}>${ohlc.c.toFixed(2)}</span></span>
                    </div>
                )}

                {/* Chart container */}
                <div ref={chartRef} className="w-full" />
            </div>

            {/* ── Period ID (below chart, always visible) ─── */}
            <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold font-mono"
                    style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <BoltIcon className="w-3.5 h-3.5" />
                    PERIOD {(() => {
                        // Stable 20-digit ID: hash of coinId. Changes per coin, stable per session.
                        const base = coinId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                        const roundPart = round ? String(round.id).padStart(5, '0') : '00001';
                        const coinHash = String(base * 7919 + 20260308).slice(0, 15).padStart(15, '0');
                        return coinHash + roundPart;
                    })()}
                </span>
            </div>

            {/* ── Trade Duration Selector ──────────── */}
            <div className="glass-card">
                <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                    <ClockIcon className="w-3.5 h-3.5 text-neon-cyan" /> Trade Duration
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {TRADE_DURATIONS.map((td) => (
                        <button key={td.seconds} onClick={() => setTradeDuration(td.seconds)}
                            className={clsx(
                                'py-3 rounded-2xl font-bold text-sm transition-all duration-300 border-2',
                                tradeDuration === td.seconds
                                    ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30 shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                                    : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                            )}
                        >
                            {td.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Your Bid Info (if active) ──────────── */}
            {round?.userBid && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
                    <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                        <BoltIcon className="w-3.5 h-3.5 text-warning" /> Your Active Bid
                        <span className="ml-auto text-[10px] font-mono text-neon-cyan">#{round.id}</span>
                    </p>
                    <div className="inner-card flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', round.userBid.direction === 'up' ? 'bg-up' : 'bg-down')}>
                                {round.userBid.direction === 'up' ? <ArrowUpIcon className="w-5 h-5 text-neon-green" /> : <ArrowDownIcon className="w-5 h-5 text-neon-red" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold">{round.userBid.direction.toUpperCase()}</p>
                                <p className="text-[11px] text-text-muted">Waiting for result...</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold">₹{parseFloat(round.userBid.amount).toFixed(2)}</p>
                            <p className="text-[10px] text-neon-green">Win: ₹{(parseFloat(round.userBid.amount) / (1 - 0.03) + parseFloat(round.userBid.amount)).toFixed(2)}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Bid Controls ───────────────────────── */}
            <div className="glass-card">
                <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-4">Place Your Bid</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setDirection('up')}
                        className={clsx(
                            'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border-2',
                            direction === 'up'
                                ? 'bg-neon-green/15 text-neon-green border-neon-green/30 shadow-[0_0_20px_rgba(0,255,136,0.1)]'
                                : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                        )}
                    >
                        <ArrowUpIcon className="w-5 h-5" /> UP
                    </button>
                    <button onClick={() => setDirection('down')}
                        className={clsx(
                            'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border-2',
                            direction === 'down'
                                ? 'bg-neon-red/15 text-neon-red border-neon-red/30 shadow-[0_0_20px_rgba(255,68,102,0.1)]'
                                : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                        )}
                    >
                        <ArrowDownIcon className="w-5 h-5" /> DOWN
                    </button>
                </div>

                {/* ── INR Amount Selector ────────────── */}
                <div className="mb-4">
                    <label className="form-label">Amount (INR)</label>
                    <div className="flex gap-1.5 mt-2">
                        {INR_AMOUNTS.map((val) => (
                            <button key={val} onClick={() => setSelectedAmount(val)}
                                className={clsx(
                                    'flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 border',
                                    selectedAmount === val
                                        ? 'bg-neon-green/12 text-neon-green border-neon-green/20'
                                        : 'bg-glass text-text-muted border-transparent hover:text-text-secondary hover:border-glass-border'
                                )}
                            >₹{val}</button>
                        ))}
                    </div>
                    {/* Manual Balance Input */}
                    <div className="mt-2">
                        <input
                            type="number"
                            min="1"
                            placeholder="Enter custom amount ₹"
                            className="w-full px-3 py-2.5 rounded-xl bg-glass border border-glass-border text-sm text-text-primary placeholder:text-text-muted focus:border-neon-green/30 focus:outline-none transition-colors"
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (v > 0) setSelectedAmount(v);
                            }}
                        />
                    </div>
                </div>

                {/* ── Quantity Multiplier ───────────── */}
                <div className="mb-4">
                    <label className="form-label">Quantity</label>
                    <div className="flex gap-1.5 mt-2">
                        {QTY_MULTIPLIERS.map((q) => (
                            <button key={q} onClick={() => setMultiplier(q)}
                                className={clsx(
                                    'flex-1 py-2 text-[11px] font-bold rounded-xl transition-all duration-200 border',
                                    multiplier === q
                                        ? 'bg-neon-cyan/12 text-neon-cyan border-neon-cyan/20'
                                        : 'bg-glass text-text-muted border-transparent hover:text-text-secondary hover:border-glass-border'
                                )}
                            >x{q}</button>
                        ))}
                    </div>
                    {/* Manual Qty Input */}
                    <div className="mt-2">
                        <input
                            type="number"
                            min="1"
                            placeholder="Enter custom quantity"
                            className="w-full px-3 py-2.5 rounded-xl bg-glass border border-glass-border text-sm text-text-primary placeholder:text-text-muted focus:border-neon-cyan/30 focus:outline-none transition-colors"
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (v > 0) setMultiplier(v);
                            }}
                        />
                    </div>
                </div>

                {/* Fee breakdown */}
                {finalAmount > 0 && (
                    <div className="inner-card mb-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">Amount × Qty</span>
                            <span className="text-text-secondary font-medium">₹{selectedAmount} × {multiplier} = ₹{finalAmount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">Trading Fee (3%)</span>
                            <span className="text-neon-red font-medium">-₹{feeAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-glass-border pt-1.5 flex items-center justify-between text-xs">
                            <span className="text-text-secondary font-semibold">Net Bid</span>
                            <span className="text-neon-green font-bold">₹{netBidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">Potential Win</span>
                            <span className="text-neon-green font-bold">₹{(finalAmount + netBidAmount).toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <button onClick={placeBid} disabled={placing || !finalAmount || timeLeft <= 10}
                    className={clsx('w-full py-3.5 rounded-2xl font-bold transition-all text-base', direction === 'up' ? 'btn-glow' : 'btn-danger', timeLeft <= 10 && 'opacity-50 cursor-not-allowed')}
                >
                    {timeLeft <= 10 ? `Betting Closed (${timeLeft}s)` : placing ? 'Placing...' : `Place ${direction.toUpperCase()} Bid — ₹${finalAmount}`}
                </button>
            </div>

            {/* ── Trade History ───────────────────────── */}
            <div className="glass-card">
                <div className="flex gap-4 mb-4">
                    {(['open', 'closed'] as const).map((t) => (
                        <button key={t} onClick={() => setTradeTab(t)}
                            className={clsx(
                                'text-sm font-semibold pb-2 border-b-2 transition-all capitalize',
                                tradeTab === t ? 'text-neon-green border-neon-green' : 'text-text-muted border-transparent hover:text-text-secondary'
                            )}
                        >
                            {t} ({t === 'open' ? openTrades.length : closedTrades.length})
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    {(tradeTab === 'open' ? openTrades : closedTrades).map((trade, i) => (
                        <div
                            key={i}
                            className="inner-card flex items-center justify-between cursor-pointer hover:bg-glass-hover transition-colors"
                            onClick={() => setSelectedTrade(trade)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', trade.direction === 'up' ? 'bg-up' : 'bg-down')}>
                                    {trade.direction === 'up' ? <ArrowUpIcon className="w-4 h-4 text-neon-green" /> : <ArrowDownIcon className="w-4 h-4 text-neon-red" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{trade.direction.toUpperCase()}</p>
                                    <p className="text-[11px] text-text-muted">{dayjs(trade.created_at).format('MMM D, HH:mm')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <p className="text-sm font-bold">₹{parseFloat(trade.amount).toFixed(2)}</p>
                                    {trade.status === 'won' && <span className="text-[11px] font-bold text-neon-green">+₹{parseFloat(trade.payout).toFixed(2)}</span>}
                                    {trade.status === 'lost' && <span className="text-[11px] font-bold text-neon-red">Lost</span>}
                                    {trade.status === 'pending' && <span className="text-[11px] font-medium text-warning">Pending</span>}
                                </div>
                                <InformationCircleIcon className="w-4 h-4 text-text-muted" />
                            </div>
                        </div>
                    ))}
                    {(tradeTab === 'open' ? openTrades : closedTrades).length === 0 && (
                        <p className="text-sm text-text-muted text-center py-6">No {tradeTab} trades</p>
                    )}
                </div>
            </div>

            {/* ═══════════ TRADE DETAIL MODAL ═══════════ */}
            <AnimatePresence>
                {selectedTrade && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
                        onClick={() => setSelectedTrade(null)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden"
                            style={{ background: 'linear-gradient(180deg, rgba(15,15,35,0.98) 0%, rgba(8,8,20,0.99) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-glass-border">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <InformationCircleIcon className="w-5 h-5 text-neon-cyan" />
                                    Trade Details
                                </h3>
                                <button onClick={() => setSelectedTrade(null)} className="text-text-muted hover:text-white transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Status Banner */}
                            <div className={clsx(
                                'mx-5 mt-4 p-4 rounded-2xl text-center border',
                                selectedTrade.status === 'won' ? 'bg-neon-green/8 border-neon-green/20' :
                                    selectedTrade.status === 'lost' ? 'bg-neon-red/8 border-neon-red/20' :
                                        'bg-warning/8 border-warning/20'
                            )}>
                                <p className={clsx(
                                    'text-lg font-extrabold',
                                    selectedTrade.status === 'won' ? 'text-neon-green' :
                                        selectedTrade.status === 'lost' ? 'text-neon-red' : 'text-warning'
                                )}>
                                    {selectedTrade.status === 'won' ? '🎉 WON' : selectedTrade.status === 'lost' ? '❌ LOST' : '⏳ PENDING'}
                                </p>
                            </div>

                            {/* Details Grid */}
                            <div className="p-5 space-y-3">
                                {[
                                    { label: 'Order ID', value: `#${selectedTrade.id}`, icon: '🆔' },
                                    { label: 'Round ID', value: `#${selectedTrade.round_id}`, icon: '🔄' },
                                    { label: 'Trade Type', value: selectedTrade.direction?.toUpperCase(), icon: selectedTrade.direction === 'up' ? '📈' : '📉', color: selectedTrade.direction === 'up' ? 'text-neon-green' : 'text-neon-red' },
                                    { label: 'Coin', value: (selectedTrade.coin_id || coinId).charAt(0).toUpperCase() + (selectedTrade.coin_id || coinId).slice(1), icon: '🪙' },
                                    { label: 'Trade Amount (Net)', value: `₹${parseFloat(selectedTrade.amount).toFixed(2)}`, icon: '💰' },
                                    { label: 'Tax / Fee', value: '₹0.00 (3% deducted at entry)', icon: '🏛️' },
                                    ...(selectedTrade.status === 'won' ? [
                                        { label: 'Win Amount', value: `₹${parseFloat(selectedTrade.payout).toFixed(2)}`, icon: '🏆', color: 'text-neon-green' },
                                        { label: 'Net Profit', value: `+₹${(parseFloat(selectedTrade.payout) - parseFloat(selectedTrade.amount) / (1 - 0.03)).toFixed(2)}`, icon: '✨', color: 'text-neon-green' },
                                    ] : selectedTrade.status === 'lost' ? [
                                        { label: 'Amount Lost', value: `-₹${(parseFloat(selectedTrade.amount) / (1 - 0.03)).toFixed(2)}`, icon: '📉', color: 'text-neon-red' },
                                    ] : [
                                        { label: 'Potential Win', value: `₹${(parseFloat(selectedTrade.amount) / (1 - 0.03) + parseFloat(selectedTrade.amount)).toFixed(2)}`, icon: '🎯', color: 'text-neon-cyan' },
                                    ]),
                                    { label: 'Placed At', value: dayjs(selectedTrade.created_at).format('MMM D, YYYY • HH:mm:ss'), icon: '📅' },
                                    ...(selectedTrade.round_end ? [
                                        { label: 'Result At', value: dayjs(selectedTrade.round_end).format('MMM D, YYYY • HH:mm:ss'), icon: '⏰' },
                                    ] : []),
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-glass/30">
                                        <span className="text-xs text-text-muted flex items-center gap-2">
                                            <span className="text-sm">{row.icon}</span> {row.label}
                                        </span>
                                        <span className={clsx('text-xs font-bold', (row as any).color || 'text-text-primary')}>
                                            {row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Close Button */}
                            <div className="px-5 pb-5">
                                <button onClick={() => setSelectedTrade(null)} className="w-full py-3 rounded-2xl bg-glass text-text-secondary font-bold text-sm hover:bg-glass-hover transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════ COUNTDOWN POPUP ═══════════ */}
            <AnimatePresence>
                {showCountdown && timeLeft > 0 && timeLeft <= 10 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="fixed inset-0 z-[100] flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                    >
                        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} className="text-center relative">
                            <button onClick={() => setShowCountdown(false)} className="absolute -top-8 right-0 text-text-muted hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            <div className="relative w-48 h-48 mx-auto mb-6">
                                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
                                    <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                    <circle cx="100" cy="100" r="88" fill="none"
                                        stroke={timeLeft <= 3 ? '#ff4466' : timeLeft <= 6 ? '#ffaa00' : '#00ff88'}
                                        strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 88}`}
                                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - timeLeft / 10)}`}
                                        className="transition-all duration-1000"
                                        style={{ filter: `drop-shadow(0 0 16px ${timeLeft <= 3 ? '#ff4466' : timeLeft <= 6 ? '#ffaa00' : '#00ff88'})` }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.span key={timeLeft} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                                        className={clsx('text-7xl font-black font-mono', timeLeft <= 3 ? 'text-neon-red' : timeLeft <= 6 ? 'text-warning' : 'text-neon-green')}
                                        style={{ textShadow: `0 0 40px ${timeLeft <= 3 ? '#ff4466' : timeLeft <= 6 ? '#ffaa00' : '#00ff88'}` }}>
                                        {timeLeft}
                                    </motion.span>
                                </div>
                            </div>
                            <p className="text-lg font-bold text-white mb-1">Round Ending Soon!</p>
                            <p className="text-sm text-text-muted">Results will be announced shortly</p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {[0, 1, 2].map((i) => (
                                    <motion.div key={i} className="w-2 h-2 rounded-full bg-neon-green"
                                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════ RESULT POPUP (Lottery Style) ═══════════ */}
            <AnimatePresence>
                {showResult && resultData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.5 } }}
                        className="fixed inset-0 z-[100] flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
                        onClick={() => setShowResult(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
                            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                            exit={{ scale: 0.3, opacity: 0, rotateY: -90 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            className="relative w-[340px] max-w-[90vw] overflow-hidden rounded-3xl"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: resultData.won
                                    ? 'linear-gradient(180deg, rgba(30,25,15,0.98) 0%, rgba(15,12,8,0.99) 100%)'
                                    : 'linear-gradient(160deg, rgba(255,68,102,0.15) 0%, rgba(40,0,10,0.95) 40%, rgba(20,0,5,0.98) 100%)',
                                border: `2px solid ${resultData.won ? 'rgba(218,165,32,0.4)' : 'rgba(255,68,102,0.3)'}`,
                                boxShadow: `0 32px 80px ${resultData.won ? 'rgba(218,165,32,0.2)' : 'rgba(255,68,102,0.15)'}`,
                            }}
                        >
                            {resultData.won && (
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    {[...Array(15)].map((_, i) => (
                                        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
                                            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, background: i % 2 === 0 ? '#daa520' : '#ffd700' }}
                                            animate={{ opacity: [0, 1, 0], scale: [0, 2, 0], y: [0, -30 - Math.random() * 40] }}
                                            transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: Math.random() * 2 }} />
                                    ))}
                                </div>
                            )}
                            <div className="relative text-center px-6 py-8">
                                {/* Trophy / Sad Icon */}
                                {resultData.won ? (
                                    <motion.div initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', delay: 0.15, stiffness: 250 }}
                                        className="mx-auto mb-4 w-32 h-32 relative">
                                        <Image src="/img/win_trophy.png" alt="Victory" fill className="object-contain drop-shadow-[0_0_30px_rgba(218,165,32,0.4)]" />
                                    </motion.div>
                                ) : (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 300 }}
                                        className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-neon-red/15 shadow-[0_0_40px_rgba(255,68,102,0.2)]">
                                        <ArrowDownIcon className="w-10 h-10 text-neon-red" />
                                    </motion.div>
                                )}

                                {/* Title */}
                                <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                                    className={clsx('text-2xl font-black mb-1', resultData.won ? 'text-yellow-400' : 'text-neon-red')}
                                    style={{ textShadow: `0 0 20px ${resultData.won ? 'rgba(218,165,32,0.5)' : 'rgba(255,68,102,0.4)'}` }}>
                                    {resultData.won ? 'Congratulations' : '😔 YOU LOST'}
                                </motion.h2>

                                {/* Trade result badge */}
                                {resultData.won && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                                        className="flex items-center justify-center gap-2 mb-5">
                                        <span className="text-sm text-text-muted font-semibold">Trade Result</span>
                                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-neon-green/20 text-neon-green border border-neon-green/30">
                                            {direction.toUpperCase()}
                                        </span>
                                    </motion.div>
                                )}
                                {!resultData.won && (
                                    <motion.p initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-text-muted mb-5">
                                        Better luck next time!
                                    </motion.p>
                                )}

                                {/* Amount Box */}
                                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.45, type: 'spring', stiffness: 200 }}
                                    className={clsx('inline-block px-10 py-5 rounded-2xl border-2 mb-2',
                                        resultData.won
                                            ? 'border-yellow-600/30'
                                            : 'bg-neon-red/10 border-neon-red/20')}
                                    style={resultData.won ? { background: 'linear-gradient(135deg, rgba(218,165,32,0.08) 0%, rgba(139,109,24,0.12) 100%)' } : undefined}>
                                    <p className={clsx('text-4xl font-black font-mono mb-1', resultData.won ? 'text-neon-green' : 'text-neon-red')}
                                        style={{ textShadow: `0 0 25px ${resultData.won ? 'rgba(0,255,136,0.35)' : 'rgba(255,68,102,0.3)'}` }}>
                                        {resultData.won ? '+ ' : '- '}₹{resultData.amount.toFixed(2)}
                                    </p>
                                    <p className={clsx('text-lg font-bold', resultData.won ? 'text-yellow-400' : 'text-neon-red')}>INR</p>
                                </motion.div>

                                {/* Auto close text */}
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                                    className="text-[11px] text-text-muted mt-4 mb-5">
                                    Auto closing in a few seconds
                                </motion.p>

                                {/* Close button */}
                                <motion.button initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                                    onClick={() => setShowResult(false)}
                                    className="w-10 h-10 rounded-full bg-glass/40 border border-glass-border flex items-center justify-center mx-auto hover:bg-glass-hover transition-colors">
                                    <XMarkIcon className="w-5 h-5 text-text-muted" />
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
