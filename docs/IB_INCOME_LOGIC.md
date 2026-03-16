# IB (Introducing Broker) Income Logic — Growviax

## Overview

The Growviax platform has three income streams for users who refer others:

1. **Direct Referral Bonus** — One-time bonus on referred user's first deposit
2. **6-Level Trading Commission** — Recurring commission on every trade by downline
3. **Daily IB Salary** — Fixed daily income based on team performance tiers

---

## 1. Direct Referral Bonus

- **Trigger**: When a referred user's **first deposit** is approved by admin
- **Rate**: Configurable via admin panel (default: **3%**)
- **Calculation**: `bonus = first_deposit_amount × referral_bonus_rate`
- **One-time**: Only the first deposit triggers this bonus. Subsequent deposits do not.
- **Credited to**: The direct referrer's wallet balance (instantly)
- **Stored in**: `referral_earnings` table (type = `referral_bonus`), `transactions` table

### Example
- User B signs up with User A's referral code
- User B deposits ₹10,000 (first deposit, approved by admin)
- User A receives: ₹10,000 × 3% = **₹300** referral bonus

---

## 2. 6-Level Trading Commission

- **Trigger**: Every time a downline user places a trade (bid)
- **Levels**: 6 levels deep through the referral chain
- **Default Rates** (configurable via admin panel):

| Level | Rate   | Description                    |
|-------|--------|--------------------------------|
| 1     | 0.81%  | Direct referral's trade        |
| 2     | 0.35%  | Referral's referral's trade    |
| 3     | 0.17%  | 3rd level deep                 |
| 4     | 0.10%  | 4th level deep                 |
| 5     | 0.07%  | 5th level deep                 |
| 6     | 0.04%  | 6th level deep                 |

- **Calculation**: `commission = net_bid_amount × level_rate`
- **Credited to**: Each upline user's wallet (instantly, per trade)
- **Stored in**: `referral_earnings` (type = `commission`, level = 1-6), `commission_history`, `transactions`

### Example
- User D places a ₹1,000 trade (net after 3% fee = ₹970)
- Referral chain: D → C → B → A
- User C (Level 1): ₹970 × 0.81% = **₹7.86**
- User B (Level 2): ₹970 × 0.35% = **₹3.40**
- User A (Level 3): ₹970 × 0.17% = **₹1.65**

---

## 3. Daily IB Salary

- **Trigger**: Automated daily cron job (or manual via admin panel)
- **Qualification**: Based on team performance metrics
- **Requirements per tier**:

| Tier | Min Direct | Min Active (7d) | Min Team Deposit | Daily Salary (INR) |
|------|-----------|-----------------|------------------|-------------------|
| 1    | 5         | 15              | ₹30,000          | ₹800              |
| 2    | 5         | 30              | ₹60,000          | ₹1,600            |
| 3    | 5         | 50              | ₹1,00,000        | ₹3,000            |
| 4    | 5         | 100             | ₹2,00,000        | ₹6,000            |
| 5    | 5         | 150             | ₹3,00,000        | ₹10,000           |
| 6    | 5         | 300             | ₹5,00,000        | ₹20,000           |

- **Direct Members**: Users who signed up with your referral code
- **Active Members**: Team members (up to 6 levels deep) who traded in last 7 days
- **Team Deposit**: Sum of all deposits by team members (all levels)
- **Credited**: Once per day, highest qualifying tier
- **Stored in**: `daily_salary_log`, `transactions` (type = `referral_bonus`)

---

## Database Tables

### `referral_earnings`
Unified income history for all three types:
- `type`: `referral_bonus` | `commission` | `ib_bonus` | `salary`
- `level`: NULL for referral bonus, 1-6 for commission
- `user_id`: Who receives the income
- `from_user_id`: Who triggered it
- `amount`: Income amount in INR

### `commission_history`
Detailed commission audit trail:
- `user_id`, `from_user_id`, `level`, `trade_amount`, `commission_amount`

### `daily_salary_log`
Prevents double-crediting daily salary:
- `user_id`, `tier_id`, `amount`, `credited_at`

### `transactions`
All wallet movements:
- Types: `referral_bonus`, `commission` for income entries

---

## Admin Configuration

All rates are configurable via **Admin Panel → Referral tab**:

- **Referral Bonus Rate**: Text input (percentage), stored as decimal in `platform_settings.referral_bonus_rate`
- **Commission Levels 1-6**: Text inputs (percentage), stored as JSON in `platform_settings.commission_levels`
- **Daily Salary Tiers**: Defined in `lib/salary.ts` (code-level config)

---

## Flow Diagrams

### Referral Bonus Flow
```
User B deposits → Admin approves → processReferralBonus()
  → Check: first deposit? → Check: has referrer?
  → Calculate bonus → Credit to referrer wallet
  → Record in referral_earnings + transactions
```

### Commission Flow
```
User places bid → Bid resolved → processCommission()
  → Walk up referral chain (max 6 levels)
  → For each upline: calculate commission → credit wallet
  → Record in referral_earnings + commission_history + transactions
```

### Daily Salary Flow
```
Cron/Admin triggers → processDailySalaries()
  → Find users with ≥5 direct referrals
  → For each: calculate team stats → determine tier
  → Check not already credited today
  → Credit salary → Record in daily_salary_log + transactions
```
