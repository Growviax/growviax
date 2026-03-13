'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon, BoltIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Coin { id: string; symbol: string; name: string; image: string; current_price: number | null; price_change_percentage_24h: number | null; market_cap: number | null; }
type SortField = 'market_cap' | 'current_price' | 'price_change_percentage_24h';

export default function MarketPage() {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<SortField>('market_cap');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const perPage = 20;

    const fetchCoins = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, per_page: perPage };
            if (search) params.search = search;
            const res = await axios.get('/api/market/coins', { params });
            setCoins(res.data.coins || []);
            setTotal(res.data.total || 0);
        } catch { } finally { setLoading(false); }
    }, [page, search]);

    useEffect(() => {
        const debounce = setTimeout(fetchCoins, search ? 500 : 0);
        return () => clearTimeout(debounce);
    }, [fetchCoins, search]);

    const sortedCoins = [...coins].sort((a, b) => {
        const aVal = (a as any)[sortField] || 0;
        const bVal = (b as any)[sortField] || 0;
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir((p) => (p === 'desc' ? 'asc' : 'desc'));
        else { setSortField(field); setSortDir('desc'); }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Market</h1>
                    <p className="text-xs text-text-muted mt-1">Live prices from CoinGecko</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-neon-green/10 flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-neon-green" />
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="text" value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search coins..." className="glass-input pl-12"
                />
            </div>

            {/* Sort */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { field: 'market_cap' as SortField, label: 'Market Cap' },
                    { field: 'current_price' as SortField, label: 'Price' },
                    { field: 'price_change_percentage_24h' as SortField, label: '24h %' },
                ].map(({ field, label }) => (
                    <button key={field} onClick={() => toggleSort(field)}
                        className={clsx(
                            'flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200',
                            sortField === field ? 'bg-neon-green/12 text-neon-green border border-neon-green/20' : 'bg-glass text-text-secondary border border-transparent hover:text-text-primary'
                        )}
                    >
                        {label} <ChevronUpDownIcon className="w-3.5 h-3.5" />
                    </button>
                ))}
            </div>

            {/* Coins */}
            {loading ? (
                <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-[72px] w-full" />)}</div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                    {sortedCoins.map((coin, index) => (
                        <Link key={coin.id} href={`/trade/${coin.id}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.025, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className="glass-card flex items-center justify-between hover:border-neon-green/20 transition-all group"
                            >
                                <div className="flex items-center gap-3.5">
                                    <span className="text-[11px] text-text-muted w-5 text-right font-medium">{(page - 1) * perPage + index + 1}</span>
                                    {coin.image ? (
                                        <Image src={coin.image} alt={coin.name} width={36} height={36} className="rounded-full" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-glass flex items-center justify-center text-xs font-bold uppercase">{coin.symbol?.charAt(0)}</div>
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold group-hover:text-neon-green transition-colors">{coin.name}</p>
                                        <p className="text-[11px] text-text-muted uppercase font-medium">{coin.symbol}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">${coin.current_price?.toLocaleString() || '—'}</p>
                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                        {coin.price_change_percentage_24h !== null && (
                                            <>
                                                {coin.price_change_percentage_24h >= 0 ?
                                                    <ArrowUpIcon className="w-3 h-3 text-neon-green" /> :
                                                    <ArrowDownIcon className="w-3 h-3 text-neon-red" />}
                                                <span className={clsx('text-[11px] font-semibold', coin.price_change_percentage_24h >= 0 ? 'text-neon-green' : 'text-neon-red')}>
                                                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                    {sortedCoins.length === 0 && <p className="text-center text-text-muted py-12">No coins found</p>}
                </motion.div>
            )}

            {/* Pagination */}
            {total > perPage && !search && (
                <div className="flex items-center justify-center gap-3 pt-3">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                        className="btn-ghost disabled:opacity-30">Previous</button>
                    <span className="text-xs text-text-muted font-medium">Page {page} of {Math.ceil(total / perPage)}</span>
                    <button onClick={() => setPage((p) => p + 1)} disabled={page * perPage >= total}
                        className="btn-ghost disabled:opacity-30">Next</button>
                </div>
            )}
        </div>
    );
}
