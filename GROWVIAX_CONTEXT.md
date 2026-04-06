# GrowViax - Complete Project Context

> **Last Updated:** April 6, 2026
> **Stack:** Next.js 14+ (App Router), TypeScript, MySQL (MariaDB 10.4), TailwindCSS
> **Domain:** growviax.live
> **Database:** `growviax` (MySQL via mysql2/promise connection pool)

---

## 1. Project Overview

GrowViax is a **crypto trading prediction platform** with two sub-platforms:

1. **Trading Platform** — Users predict if a coin goes UP or DOWN within a timed round (33s or 60s). Outcomes are controlled by a Smart Outcome Engine.
2. **FD (Fixed Deposit) Platform** — Separate user system for fixed deposit investments with monthly returns and profit sharing.

Both share the same Next.js codebase but have separate auth systems, user tables, and route groups.

---

## 2. Directory Structure

```
growviax/
├── app/
│   ├── (dashboard)/          # Trading platform pages (protected)
│   │   ├── admin/            # Admin panel (trade control, deposits, users, UPI, etc.)
│   │   ├── assets/           # Deposit/withdraw page
│   │   ├── dashboard/        # User dashboard
│   │   ├── home/             # Home page (recent trades, trending coins)
│   │   ├── market/           # Coin market listing
│   │   ├── profile/          # User profile
│   │   ├── promotion/        # Referral & commission info
│   │   ├── support/          # Support tickets
│   │   ├── trade/[coinId]/   # Trading page (chart, bid placement, round timer)
│   │   └── trading/          # Trading history
│   ├── (fd-dashboard)/       # FD platform pages (protected via fd_token)
│   │   ├── fd/assets/        # FD deposit/withdraw
│   │   ├── fd/dashboard/     # FD dashboard
│   │   ├── fd/home/          # FD home
│   │   ├── fd/invest/        # FD investment page
│   │   ├── fd/profile/       # FD profile
│   │   └── fd/support/       # FD support
│   ├── api/                  # API routes (see Section 5)
│   ├── fd/                   # FD auth pages (login/signup)
│   ├── login/                # Trading login
│   ├── signup/               # Trading signup
│   └── layout.tsx            # Root layout
├── components/               # Shared React components
├── lib/                      # Core business logic & utilities
│   ├── auth.ts               # JWT, bcrypt, wallet/referral code generation
│   ├── commission.ts         # 6-level MLM commission + referral bonus
│   ├── db.ts                 # MySQL connection pool (mysql2/promise)
│   ├── email.ts              # Nodemailer email templates (OTP, deposit, withdrawal, etc.)
│   ├── fd-user.ts            # FD platform user utilities
│   ├── growviax.sql          # Full database schema dump
│   ├── monitor.ts            # BSC blockchain USDT deposit monitor (ethers.js)
│   ├── outcome-engine.ts     # Smart Outcome Engine (bet result algorithm)
│   ├── salary.ts             # IB (Introducing Broker) daily salary system
│   └── user.ts               # User auth utilities (getCurrentUser, getUserIdFromRequest)
├── middleware.ts              # Auth middleware (JWT verification, role-based access)
├── types/                    # TypeScript type definitions
└── docs/                     # Documentation
```

---

## 3. Authentication & Middleware

### Auth Flow
- **Trading Platform:** JWT token stored in httpOnly cookie named `token`
  - Payload: `{ userId, email, role }` — signed with `JWT_SECRET`
  - 7-day expiry
- **FD Platform:** Separate JWT in cookie named `fd_token`
  - Payload: `{ fdUserId, email, role }`

### Middleware (`middleware.ts`)
Routes are protected in this order:
1. Static assets → pass through
2. Public paths (`/login`, `/signup`, `/api/auth/*`) → pass through
3. FD public paths (`/fd/login`, `/fd/signup`, `/api/fd/auth/*`) → pass through
4. `/api/fd/*` → requires `fd_token`
5. `/api/admin/fd/*` → requires `token` + admin role
6. `/fd/*` pages → requires `fd_token`
7. `/` → redirects to `/home` (if authed) or `/login`
8. `/api/cron/*` → **NO AUTH** (whitelisted)
9. `/api/*` → requires `token` (admin routes also check role)
10. All other pages → requires `token`

### Key Files
- `lib/auth.ts` — `hashPassword()`, `comparePassword()`, `signToken()`, `verifyToken()`, `generateWalletAddress()`, `generateReferralCode()`, `generateOTP()`
- `lib/user.ts` — `getCurrentUser()` (reads cookie from headers), `getUserIdFromRequest()` (parses cookie from Request object)

---

## 4. Database Schema (MySQL — `growviax` database)

### Trading Platform Tables

| Table | Purpose |
|-------|---------|
| `users` | Main user table: id, name, email, phone, password_hash, wallet_address, wallet_balance, referral_code, referred_by, role (user/admin), is_blocked |
| `bid_rounds` | Trading rounds: coin_id, start_time, end_time, status (open/closed/resolved), total_up/down_amount, total_up/down_users, winning_side |
| `bids` | Individual bets: user_id, coin_id, round_id, direction (up/down), amount, status (pending/won/lost), payout, admin_override, engine_reason |
| `transactions` | All money movements: type (deposit/withdrawal/bid_loss/bid_win/trading_fee/commission/referral_bonus/ib_bonus/admin_credit), amount, status |
| `deposit_requests` | USDT/UPI deposit requests with tx_hash/utr_number, admin approval workflow |
| `platform_settings` | Key-value config: trade_mode, manual_winner, house_edge, max_win_rate, commission_levels, etc. |
| `user_betting_profiles` | Per-user stats: total_bets/wins/losses, win_rate, streak info, risk_score |
| `bet_outcome_log` | Audit trail for every bet outcome decision |
| `admin_bet_overrides` | Per-bid admin force_win/force_loss overrides |
| `commission_history` | Audit trail for commission calculations |
| `pending_commissions` | Staged commissions (credited at midnight via cron) |
| `referral_earnings` | All referral income records (bonus + commission + IB salary) |
| `daily_salary_log` | IB salary credit log (one entry per user per day) |
| `otp_codes` | Email OTP verification codes |
| `support_tickets` | User support tickets |
| `ticket_replies` | Support ticket replies |
| `upi_accounts` | Admin-managed UPI accounts for deposits |
| `platform_risk_ledger` | Daily platform P&L snapshots |
| `rate_limits` | Per-user rate limiting |
| `admin_activity_log` | Admin action audit trail |
| `processed_deposits` | Blockchain deposit tracking |

### FD Platform Tables (prefixed with `fd_`)

| Table | Purpose |
|-------|---------|
| `fd_users` | Separate user table for FD platform |
| `fd_deposits` | Fixed deposit records: amount, monthly_rate, duration_days, phase, status |
| `fd_deposit_requests` | FD deposit requests (USDT/UPI) |
| `fd_transactions` | FD money movements |
| `fd_profit_distributions` | Monthly profit sharing distributions |
| `fd_profit_logs` | Per-FD monthly profit credits |
| `fd_user_profit_shares` | Per-user share of profit distributions |
| `fd_settings` | FD platform settings |
| `fd_support_tickets` | FD support tickets |
| `fd_ticket_replies` | FD ticket replies |
| `fd_upi_accounts` | FD UPI accounts |
| `fd_usdt_wallets` | FD USDT wallet addresses with QR images |

### Key Relationships
- `bids.user_id` → `users.id` (CASCADE)
- `bids.round_id` → `bid_rounds.id` (CASCADE)
- `transactions.user_id` → `users.id` (CASCADE)
- `deposit_requests.user_id` → `users.id` (CASCADE)
- Users linked by `referral_code` / `referred_by` (string match, not FK)

---

## 5. API Routes

### Auth (`/api/auth/`)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/signup` | Register (name, email, phone, otp, password, inviteCode) |
| POST | `/api/auth/login` | Login (email, password) → sets `token` cookie |
| POST | `/api/auth/logout` | Clear token cookie |
| POST | `/api/auth/send-otp` | Send 6-digit OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/forgot-password` | Password reset flow |

### Trading/Bids (`/api/bids/`)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/bids/round?coinId=X&duration=33` | Get current round info (deterministic time slot). **Auto-resolves expired rounds server-side.** Returns round data + serverTime for drift sync. |
| POST | `/api/bids/place` | Place a bid: { coinId, direction, amount, duration }. Deducts amount + 3% fee. Creates round if needed. |
| POST | `/api/bids/resolve` | Resolve all expired rounds. Called internally by round endpoint. Uses Smart Outcome Engine for single bets, minority-wins for multi-bets. |
| GET | `/api/bids/history?coinId=X` | User's bid history (joined with round data) |
| GET | `/api/bids/rounds-history?coinId=X` | Resolved rounds history (public, shows winning sides) |

### Wallet (`/api/wallet/`)
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/wallet/deposit` | Get random USDT wallet for deposit |
| POST | `/api/wallet/deposit/submit` | Submit USDT deposit (tx_hash) |
| POST | `/api/wallet/deposit/submit-upi` | Submit UPI deposit (utr_number) |
| GET | `/api/wallet/deposit/get-upi` | Get random active UPI ID |
| GET | `/api/wallet/deposit/status` | Check deposit status |
| GET | `/api/wallet/transactions` | Transaction history |
| POST | `/api/wallet/withdraw` | Withdrawal request |

### Admin (`/api/admin/`) — requires admin role
| Method | Route | Purpose |
|--------|-------|---------|
| GET/PATCH | `/api/admin/trade-control` | Get/update trade settings (mode, manual winner, consecutive wins, force-lose list), live data, P&L |
| GET/POST | `/api/admin/bet-overrides` | Manage per-bid overrides (force_win/force_loss/system_decide) |
| GET/PATCH | `/api/admin/deposits` | Approve/reject deposit requests |
| GET/POST/DELETE | `/api/admin/upi` | CRUD UPI accounts |
| GET/PATCH | `/api/admin/users` | User management |
| PATCH | `/api/admin/balance` | Manual balance adjustment |
| GET | `/api/admin/transactions` | All transactions |
| GET/PATCH | `/api/admin/referral-settings` | Commission rates config |
| GET/PATCH | `/api/admin/ib-settings` | IB salary tiers config |
| POST | `/api/admin/seed` | Seed/migrate data |
| GET | `/api/admin/export` | Export data |
| GET/POST | `/api/admin/support` | Admin support ticket management |

### Other
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/user` | Get current user data |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/market` | Coin market data (CoinGecko) |
| GET/POST | `/api/referral/*` | Referral tree & earnings |
| GET/POST | `/api/support` | User support tickets |
| POST | `/api/salary/check` | Trigger IB salary check (admin) |
| GET | `/api/salary/tiers` | Get IB salary tiers |
| GET | `/api/commission/pending` | Get pending commissions |
| POST | `/api/cron/commission` | Midnight cron: credit pending commissions |

### FD API (`/api/fd/`) — uses `fd_token`
Separate auth/dashboard/invest/support/wallet routes for the FD platform.

---

## 6. Core Business Logic

### 6.1 Trading Round System (Deterministic Time Slots)

**File:** `app/api/bids/round/route.ts`

Rounds are anchored to **epoch-based time slots**, NOT created on-demand:
```
slot_number = floor(epoch_seconds / duration)
round_start = slot_number * duration
round_end   = (slot_number + 1) * duration
```

This ensures ALL users see the same round with the same timer regardless of when they connect. The server returns `serverTime` so clients calculate drift for perfectly synced countdowns.

**Round lifecycle:**
1. User polls `GET /api/bids/round` → server auto-resolves any expired rounds first
2. Server finds/creates round matching current time slot
3. Returns round data + server time
4. Client uses drift-adjusted countdown (200ms interval for smooth updates)
5. At round expiry, client waits 1.5s then re-polls (server resolves on next poll)

### 6.2 Bid Placement

**File:** `app/api/bids/place/route.ts`

1. Validate direction (up/down), amount > 0, duration (33s or 60s)
2. Check user not blocked, has sufficient balance
3. Block bids in last 10 seconds of round
4. Calculate 3% trading fee: `fee = amount * 0.03`, `netBid = amount - fee`
5. Deduct full amount from wallet
6. Insert bid with net amount
7. Update round totals (total_up/down_amount, total_up/down_users)
8. Record `bid_loss` transaction (amount deducted) + `trading_fee` transaction

### 6.3 Bid Resolution (Smart Outcome Engine)

**File:** `app/api/bids/resolve/route.ts` + `lib/outcome-engine.ts`

Resolution runs when any user polls the round endpoint and expired rounds exist.

**Resolution logic by scenario:**

#### A. No bids in round
- Assign random winning side (shows activity in UI)

#### B. Single-side bets (all UP or all DOWN)
1. **Admin manual override** (if trade_mode=manual and manual_winner set) → all bets win/lose based on admin choice
2. **True single bet** (1 user) → Smart Outcome Engine per-bid decision
3. **Same-side multi-user** → Engine decides once using largest bet as representative, applies to all

#### C. Multi-side bets (both UP and DOWN)
1. **Admin manual** → admin-chosen side wins
2. **Consecutive settings** → if consecutive_up/down_wins > 0, use that
3. **Equal amounts** → random
4. **Default** → **minority side wins** (lower total = platform pays less)

### 6.4 Smart Outcome Engine

**File:** `lib/outcome-engine.ts`

Multi-factor algorithm to determine single-bet outcomes:

1. **Admin override check** — per-bid force_win/force_loss via `admin_bet_overrides` table
2. **Force-lose list** — `force_lose_user_ids` setting (array of user IDs that always lose)
3. **New user bonus** — first N bets (default 3) win automatically if amount ≤ threshold (default ₹100)
4. **Streak cap** — max 4 consecutive same results (wins → force loss, losses → force win)
5. **Risk engine calculation:**
   - Base loss probability = 55% + house_edge (8%) = 63%
   - Adjustments for: user win rate excess, bet amount vs average, platform exposure (24h P&L), exploit pattern detection, absolute bet size, user risk score
   - Jitter (±7.5%) added for unpredictability
   - Clamped to 55-90% loss probability (10-45% win rate)
   - Random roll determines outcome

**User profiles** tracked in `user_betting_profiles` — updated after every bet with new stats, streak, risk score.

**Payout formula:** `payout = originalAmount + netAmount` (e.g., bet ₹100, fee ₹3, net ₹97, win = ₹100 + ₹97 = ₹197)

### 6.5 Commission System (6-Level MLM)

**File:** `lib/commission.ts`

- **Referral bonus:** 3% of referee's first deposit amount → credited instantly to referrer
- **Trading commission:** 6 levels up the referral chain
  - Level 1: 0.81%, Level 2: 0.35%, Level 3: 0.17%, Level 4: 0.10%, Level 5: 0.07%, Level 6: 0.04%
  - **Staged** in `pending_commissions` table (NOT instant)
  - Credited at midnight IST via `creditPendingCommissions()`
- **Eligibility:** Referrer must have minimum ₹500 total deposits to earn

### 6.6 IB (Introducing Broker) Daily Salary

**File:** `lib/salary.ts`

- Fixed daily income based on team performance milestones
- Requires minimum 6 direct referrals + ₹500 personal deposit
- "Active member" = user with ≥200 total trades
- 12 configurable tiers (minDirect, minActive, minDeposit → dailySalary)
- Processed daily, logged in `daily_salary_log`, credited to wallet

### 6.7 Deposit Flow

**USDT (BEP20):**
1. User requests deposit → gets random wallet address + QR
2. User sends USDT and submits tx_hash
3. Creates `deposit_request` (status: pending)
4. Admin approves/rejects in admin panel
5. On approve: credits wallet_balance, records transaction

**UPI:**
1. User requests deposit → gets random active UPI ID
2. User pays and submits UTR number
3. Creates `deposit_request` (status: pending)
4. Admin approves/rejects

**Blockchain Monitor** (`lib/monitor.ts`): Automated BSC USDT deposit detection via ethers.js — scans Transfer events to deposit wallets. Legacy system, mostly replaced by manual approval.

---

## 7. Frontend Architecture

### Trading Platform Pages
- **Home** (`/home`) — wallet balance, referral link, recent trades, trending coins
- **Market** (`/market`) — coin listing from CoinGecko API
- **Trade** (`/trade/[coinId]`) — full trading UI:
  - Lightweight Charts (candlestick/line with real-time tick simulation)
  - Drift-synced countdown timer (200ms updates)
  - Amount selector (₹1/5/10/100/1000 × multipliers 1/5/10/20/50/100)
  - UP/DOWN buttons, active bid display
  - Trade history (open/closed tabs)
  - Round history with period IDs
  - Result popup (win/loss detection via status transition)
- **Assets** (`/assets`) — multi-step deposit (USDT/UPI), withdrawal
- **Admin** (`/admin`) — trade control, deposits, users, UPI management, bet overrides

### FD Platform Pages
Separate login/signup, dashboard, invest, assets, profile, support — all under `/fd/` routes.

### UI Stack
- TailwindCSS with custom dark theme (glass morphism, neon green/red accents)
- Framer Motion for animations
- Heroicons for icons
- Lightweight Charts for trading charts
- react-hot-toast for notifications
- dayjs for date formatting
- clsx for conditional classes

---

## 8. Environment Variables

```env
# Database
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=growviax

# Auth
JWT_SECRET=

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# App
NEXT_PUBLIC_APP_URL=https://growviax.live

# Blockchain (optional, for auto-deposit monitor)
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

---

## 9. Key Platform Settings (`platform_settings` table)

| Key | Default | Purpose |
|-----|---------|---------|
| `trade_mode` | `auto` | `auto` or `manual` (admin controls winner) |
| `manual_winner` | `` | `up` or `down` (one-time, cleared after use) |
| `consecutive_up_wins` | `0` | Force N consecutive UP wins |
| `consecutive_down_wins` | `0` | Force N consecutive DOWN wins |
| `force_lose_user_ids` | `[]` | JSON array of user IDs that always lose |
| `house_edge` | `0.08` | 8% house edge in outcome engine |
| `max_win_rate` | `0.45` | Max 45% win rate per user |
| `new_user_bonus_wins` | `3` | First N bets guaranteed wins |
| `new_user_max_win_amount` | `100` | Max bet amount eligible for new user bonus |
| `risk_threshold` | `0.7` | Risk score threshold |
| `referral_bonus_rate` | `0.03` | 3% referral bonus |
| `commission_levels` | JSON | 6-level commission rates |
| `ib_salary_tiers` | JSON | 12 IB salary milestone tiers |
| `usd_to_inr_rate` | `98` | USDT to INR conversion rate |
| `min_deposit_usdt` | `10` | Minimum USDT deposit |
| `min_deposit_upi` | `1000` | Minimum UPI deposit |
| `min_deposit_for_earnings` | `500` | Min deposit to earn commissions |

---

## 10. Money Flow Summary

```
User deposits (USDT/UPI) → wallet_balance
  ↓
Places bid → wallet_balance -= (amount)
  ↓ Records: bid_loss transaction + trading_fee transaction
  ↓
Round expires → resolve
  ├─ WIN:  wallet_balance += payout (originalAmount + netAmount)
  │        Records: bid_win transaction
  └─ LOSS: nothing returned
  ↓
Commission: staged in pending_commissions → credited at midnight
Referral bonus: 3% of referee's first deposit (instant)
IB Salary: daily credit based on team milestones
```

---

## 11. Recent Bug Fix (April 2026)

### Issue: All trades stuck on "Pending"

**Root Cause:** The deterministic sync mechanism in `round/route.ts` used `autoResolveExpired()` which did a self-fetch to `/api/bids/resolve` via HTTP. This fetch had **no auth token**, so the middleware returned 401 Unauthorized. The error was silently swallowed by `catch {}`, so resolution never happened.

**Fix:** Replaced the HTTP self-fetch with a **direct function import and call**:
```typescript
import { POST as resolveRounds } from '@/app/api/bids/resolve/route';
// ...
await resolveRounds(); // Direct call, no HTTP, no auth needed
```

**File changed:** `app/api/bids/round/route.ts`

---

## 12. Cron Jobs

| Schedule | Endpoint/Function | Purpose |
|----------|-------------------|---------|
| Midnight IST | `POST /api/cron/commission` | Credit all pending commissions to wallets |
| Daily | `processDailySalaries()` | IB salary for qualifying users |
| On-demand | `POST /api/salary/check` | Admin-triggered salary processing |

---

## 13. Admin Controls

The admin panel at `/admin` provides:
- **Trade Control:** Set auto/manual mode, force UP/DOWN wins, consecutive wins, force-lose user list, view live rounds & P&L
- **Bet Overrides:** Force win/loss on specific pending bids
- **Deposits:** Approve/reject USDT and UPI deposit requests
- **UPI Management:** Add/edit/delete UPI accounts
- **Users:** View/block/unblock users, adjust balances
- **Referral Settings:** Configure commission rates and referral bonus
- **IB Settings:** Configure salary tier milestones
- **Support:** Manage user support tickets
