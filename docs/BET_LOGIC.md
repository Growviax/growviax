# GrowViax Betting System Logic

## Overview

The GrowViax platform uses a **Smart Outcome Engine** to determine bet outcomes. This document explains how bets are processed, resolved, and how admin controls work.

---

## 1. Bet Types

### Single Bet
- **Definition**: Only ONE user places a bet in a trading round
- **Resolution**: Uses the Smart Outcome Engine (see Section 3)
- **File**: `lib/outcome-engine.ts`

### Multi-Bet (Multiple Users)
- **Definition**: TWO or MORE users place bets in the same round
- **Resolution**: Uses priority-based logic (see Section 2)
- **File**: `app/api/bids/resolve/route.ts`

---

## 2. Multi-Bet Resolution Logic

When multiple users bet in the same round, the system uses this priority order:

### Priority 1: Admin Manual Override
- If `trade_mode = 'manual'` AND `manual_winner` is set ('up' or 'down')
- The admin-chosen side wins
- Setting is cleared after use

### Priority 2: Consecutive Wins Cap
- If one side has won `consecutive_up_wins` or `consecutive_down_wins` times in a row
- The OTHER side wins to break the streak
- Prevents predictable patterns

### Priority 3: Equal Amounts (Random)
- If UP total = DOWN total (within ₹1)
- Winner is chosen randomly (50/50)

### Priority 4: Minority Wins (Default)
- The side with LESS total amount bet wins
- This ensures platform profitability
- Example: UP has ₹5000, DOWN has ₹3000 → DOWN wins

---

## 3. Smart Outcome Engine (Single Bets)

Located in `lib/outcome-engine.ts`, this engine determines outcomes for single-user bets.

### Step 1: Check Admin Override (Per-Bid)
- Admin can force win/loss on specific bids via `admin_bet_overrides` table
- Actions: `force_win`, `force_loss`, `system_decide`
- API: `POST /api/admin/bet-overrides`

### Step 2: New User Bonus
- **First 3 BETS** are guaranteed wins (not first 3 wins)
- Only applies if bet amount ≤ ₹500
- Configurable via `platform_settings.new_user_bonus_wins`

### Step 3: Streak Cap
- Max 4 consecutive same results per user
- If user has 4 wins in a row → forced loss
- If user has 4 losses in a row → allowed win

### Step 4: Risk Engine Calculation

The engine calculates a **loss probability** based on multiple factors:

```
Base Loss Probability = 0.55 + house_edge (8%) = 63%
```

**Factors that INCREASE loss probability:**
| Factor | Condition | Penalty |
|--------|-----------|---------|
| High Win Rate | User win rate > 45% | +2× excess |
| Large Bet | Bet > 2× user's average | +5% per ratio |
| Platform Losing | Negative exposure | Up to +25% |
| Exploit Pattern | Unusual betting behavior | +15% |
| High Bet Amount | Bet > ₹5000 | +10% |
| High Risk Score | Score > 0.7 threshold | +30% of excess |

**Final Bounds:**
- Minimum loss probability: 55% (max 45% win rate)
- Maximum loss probability: 90% (min 10% win rate)

**Random Jitter:**
- ±15% random variation added to prevent pattern detection

### Outcome Determination
```javascript
const roll = Math.random();  // 0.0 to 1.0
const shouldWin = roll >= lossProbability;
```

---

## 4. Admin Controls

### Trade Mode Settings
| Setting | Description |
|---------|-------------|
| `trade_mode` | 'auto' (engine decides) or 'manual' (admin controls) |
| `manual_winner` | 'up' or 'down' - forces next round winner |
| `consecutive_up_wins` | Counter for UP win streak |
| `consecutive_down_wins` | Counter for DOWN win streak |

### Per-Bid Override
Admin can override specific pending bids:
```
POST /api/admin/bet-overrides
{
  "bidId": 123,
  "action": "force_win" | "force_loss" | "system_decide"
}
```

### Platform Settings
| Key | Default | Description |
|-----|---------|-------------|
| `house_edge` | 0.08 | 8% house advantage |
| `max_win_rate` | 0.45 | Max 45% win rate per user |
| `risk_threshold` | 0.7 | Risk score threshold |
| `new_user_bonus_wins` | 3 | First N bets guaranteed win |
| `new_user_max_win_amount` | 500 | Max bet for bonus |

---

## 5. User Betting Profiles

The system tracks each user's betting behavior in `user_betting_profiles`:

| Field | Description |
|-------|-------------|
| `total_bets` | Total number of bets placed |
| `total_wins` / `total_losses` | Win/loss counts |
| `total_amount_bet` | Cumulative bet amount |
| `total_amount_won` / `lost` | Cumulative winnings/losses |
| `avg_bet_amount` | Average bet size |
| `max_bet_amount` | Largest single bet |
| `win_rate` | Calculated win percentage |
| `current_streak_type` | 'win', 'loss', or 'none' |
| `current_streak_count` | Current streak length |
| `risk_score` | 0.0 to 1.0 risk assessment |

---

## 6. Audit Trail

All outcomes are logged in `bet_outcome_log`:

| Field | Description |
|-------|-------------|
| `bid_id` | The bet ID |
| `user_id` | User who placed bet |
| `outcome_source` | 'new_user_bonus', 'admin_override', 'risk_engine', 'random' |
| `outcome_reason` | Detailed explanation |
| `should_win` | Engine's decision |
| `actual_outcome` | Final result |
| `risk_score` | User's risk score at time |
| `platform_exposure` | Platform P&L at time |

Additionally, the `bids` table has:
- `admin_override`: 'force_win', 'force_loss', or 'system'
- `engine_reason`: Text explanation of outcome

---

## 7. Platform Exposure Tracking

The system tracks overall platform profitability:

```sql
SELECT 
  SUM(CASE WHEN status='lost' THEN amount ELSE 0 END) as platform_wins,
  SUM(CASE WHEN status='won' THEN payout ELSE 0 END) as platform_losses
FROM bids WHERE status IN ('won','lost')
```

**Exposure** = Platform Wins - Platform Losses
- Positive = Platform is profitable
- Negative = Platform is losing → increases loss probability for users

---

## 8. Exploit Detection

The system detects suspicious patterns:

1. **Unusually High Bets**: Bet > 3× user's average
2. **High Win Rate + High Profit**: Win rate > 60% AND winnings > 1.5× total bet

When detected, loss probability increases by 15%.

---

## 9. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bids/place` | POST | Place a new bet |
| `/api/bids/resolve` | POST | Resolve round (cron job) |
| `/api/bids/round` | GET | Get current round info |
| `/api/bids/history` | GET | User's bet history |
| `/api/admin/bet-overrides` | GET/POST | Admin override management |
| `/api/admin/trade-control` | GET/PATCH | Trade settings |

---

## 10. Flow Diagram

```
User Places Bet
      ↓
Round Timer Ends
      ↓
/api/bids/resolve called
      ↓
┌─────────────────────────────┐
│ Count bets in round         │
└─────────────────────────────┘
      ↓
┌─────────────────────────────┐
│ Single Bet?                 │
│ YES → Smart Outcome Engine  │
│ NO  → Multi-Bet Logic       │
└─────────────────────────────┘
      ↓
┌─────────────────────────────┐
│ Determine winning side      │
│ Process winners (credit)    │
│ Process losers (debit)      │
│ Update user profiles        │
│ Log outcome                 │
└─────────────────────────────┘
      ↓
Round Complete
```

---

## 11. Key Files

| File | Purpose |
|------|---------|
| `lib/outcome-engine.ts` | Smart Outcome Engine |
| `app/api/bids/resolve/route.ts` | Round resolution logic |
| `app/api/bids/place/route.ts` | Bet placement |
| `app/api/admin/bet-overrides/route.ts` | Admin override API |
| `app/api/admin/trade-control/route.ts` | Trade settings API |
| `lib/database_updates.sql` | Database schema |

---

## 12. Summary

- **Single bets**: Outcome Engine with house edge, user profiling, exploit detection
- **Multi bets**: Minority wins (or admin override)
- **New users**: First 3 bets win (if ≤ ₹500)
- **House edge**: ~37% base win rate for users
- **Admin control**: Per-bid overrides + global trade mode
- **Audit**: Full logging of all outcomes with reasons
