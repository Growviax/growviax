# Referral & IB System Testing Guide

## System Overview

### 1. Direct Referral Bonus (3% of First Deposit)
- **Trigger**: When a referred user places their **first trade** (after depositing)
- **Amount**: 3% of the referred user's **first deposit amount** (not trade amount)
- **Frequency**: **One-time only** per referred user
- **Payment**: Credited to referrer's wallet instantly

### 2. 6-Level Commission (IB Income)
- **Trigger**: On **every trade** placed by users in the downline chain
- **Levels**: Up to 6 levels deep in the referral tree
- **Amount**: Percentage of trade amount (configurable per level)
- **Frequency**: On each trade
- **Payment**: Credited to upline wallets instantly

---

## Current Configuration

### Default Rates (Editable in Admin Panel → Referral Tab)

**Direct Referral Bonus**: 3% (0.03)

**6-Level Commission Structure**:
- Level 1: 0.81%
- Level 2: 0.54%
- Level 3: 0.36%
- Level 4: 0.24%
- Level 5: 0.16%
- Level 6: 0.11%

---

## Testing Scenarios

### Scenario 1: Direct Referral Bonus Test

**Setup**:
1. User A (Referrer) has referral code: `GVXDEMO1`
2. User B (New user) signs up using `GVXDEMO1`
3. User B deposits ₹1,000 (first deposit)
4. User B places their first trade (any amount, e.g., ₹100)

**Expected Results**:
- ✅ User A receives **₹30** (3% of ₹1,000) as referral bonus
- ✅ Entry created in `referral_earnings` table
- ✅ Transaction created with type `referral_bonus`
- ✅ User A's wallet balance increases by ₹30
- ✅ Notes: "3% referral bonus from user #[B's ID]'s first deposit of ₹1000.00"

**Verification SQL**:
```sql
-- Check referral earnings
SELECT * FROM referral_earnings WHERE from_user_id = [User B ID];

-- Check transactions
SELECT * FROM transactions WHERE user_id = [User A ID] AND type = 'referral_bonus';

-- Check wallet balance
SELECT wallet_balance FROM users WHERE id = [User A ID];
```

---

### Scenario 2: 6-Level Commission Test (Simple Chain)

**Setup**:
1. User A (Level 0) → User B (Level 1) → User C (Level 2)
2. User C deposits ₹1,000 and places a trade of ₹100

**Expected Results**:
- ✅ User B (Level 1) receives **₹0.81** (0.81% of ₹100)
- ✅ User A (Level 2) receives **₹0.54** (0.54% of ₹100)
- ✅ Entries created in `commission_history` table
- ✅ Transactions created with type `commission`

**Verification SQL**:
```sql
-- Check commission history
SELECT * FROM commission_history WHERE from_user_id = [User C ID];

-- Check transactions
SELECT * FROM transactions WHERE type = 'commission' AND notes LIKE '%user #[User C ID]%';
```

---

### Scenario 3: Full 6-Level Chain Test

**Setup**:
Create a chain: A → B → C → D → E → F → G (7 users, 6 levels deep)

User G places a trade of ₹1,000

**Expected Results**:
| User | Level | Commission Rate | Amount Received |
|------|-------|----------------|-----------------|
| F    | 1     | 0.81%          | ₹8.10           |
| E    | 2     | 0.54%          | ₹5.40           |
| D    | 3     | 0.36%          | ₹3.60           |
| C    | 4     | 0.24%          | ₹2.40           |
| B    | 5     | 0.16%          | ₹1.60           |
| A    | 6     | 0.11%          | ₹1.10           |

**Total Commission Paid**: ₹22.20 (2.22% of trade)

---

### Scenario 4: Combined Referral + Commission Test

**Setup**:
1. User A refers User B (using A's referral code)
2. User B deposits ₹2,000 (first deposit)
3. User B places first trade of ₹500

**Expected Results**:
- ✅ User A receives **₹60** (3% of ₹2,000) as referral bonus (one-time)
- ✅ User A receives **₹4.05** (0.81% of ₹500) as Level 1 commission
- ✅ **Total earned by A**: ₹64.05

**On User B's second trade of ₹500**:
- ✅ User A receives **₹4.05** (0.81% of ₹500) as Level 1 commission only
- ❌ No referral bonus (already paid on first trade)

---

## Admin Panel Testing

### Test 1: Edit Direct Referral Bonus Rate
1. Go to Admin Panel → Referral Tab
2. Change "Direct Referral Bonus Rate" from 3% to 5%
3. Click "Update"
4. Verify: New referrals should receive 5% of first deposit

### Test 2: Edit 6-Level Commission Structure
1. Go to Admin Panel → Referral Tab → 6-Level Commission Structure
2. Click "Edit Levels"
3. Change Level 1 from 0.81% to 1.00%
4. Change Level 2 from 0.54% to 0.75%
5. Click "Save Changes"
6. Verify: New trades should use updated commission rates

### Test 3: View Referral Stats
Check the stats cards display:
- Total Referrers
- Total Referral Transactions
- Total Referral Paid (₹)
- Total Commission Paid (₹)

---

## Database Verification

### Check Referral Earnings
```sql
SELECT 
    re.id,
    re.user_id as referrer_id,
    u1.name as referrer_name,
    re.from_user_id as referred_user_id,
    u2.name as referred_user_name,
    re.amount,
    re.created_at
FROM referral_earnings re
JOIN users u1 ON u1.id = re.user_id
JOIN users u2 ON u2.id = re.from_user_id
ORDER BY re.created_at DESC;
```

### Check Commission History
```sql
SELECT 
    ch.id,
    ch.user_id as earner_id,
    u1.name as earner_name,
    ch.from_user_id as trader_id,
    u2.name as trader_name,
    ch.level,
    ch.trade_amount,
    ch.commission_rate,
    ch.commission_amount,
    ch.created_at
FROM commission_history ch
JOIN users u1 ON u1.id = ch.user_id
JOIN users u2 ON u2.id = ch.from_user_id
ORDER BY ch.created_at DESC;
```

### Check All Referral/Commission Transactions
```sql
SELECT 
    t.id,
    t.user_id,
    u.name as user_name,
    t.type,
    t.amount,
    t.notes,
    t.created_at
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE t.type IN ('referral_bonus', 'commission')
ORDER BY t.created_at DESC;
```

---

## Common Issues & Troubleshooting

### Issue 1: Referral Bonus Not Paid
**Symptoms**: User referred someone, but didn't receive bonus

**Checklist**:
- ✅ Did the referred user complete their first deposit?
- ✅ Did the referred user place at least one trade?
- ✅ Check if bonus was already paid (one-time only)
- ✅ Verify referral code was used correctly during signup
- ✅ Check `referral_earnings` table for existing entry

### Issue 2: Commission Not Paid
**Symptoms**: User didn't receive commission on downline trade

**Checklist**:
- ✅ Verify the referral chain exists in database
- ✅ Check if the downline user actually placed a trade
- ✅ Verify commission rates are configured correctly
- ✅ Check `commission_history` table for entries
- ✅ Ensure the chain is within 6 levels

### Issue 3: Wrong Commission Amount
**Symptoms**: Commission amount doesn't match expected percentage

**Checklist**:
- ✅ Verify current commission rates in `platform_settings`
- ✅ Check if rates were changed recently (old trades use old rates)
- ✅ Verify the trade amount is correct
- ✅ Check for any rounding issues

---

## API Endpoints

### Get Referral Settings (Admin)
```
GET /api/admin/referral-settings
```

### Update Referral Settings (Admin)
```
PATCH /api/admin/referral-settings
Body: {
  "referralBonusRate": 0.05,  // 5%
  "commissionLevels": [
    { "level": 1, "rate": 0.01 },
    { "level": 2, "rate": 0.0075 },
    ...
  ]
}
```

---

## Testing Checklist

- [ ] Create test users with referral chain
- [ ] Test direct referral bonus (3% of first deposit)
- [ ] Verify one-time payment (no duplicate bonuses)
- [ ] Test 6-level commission on trades
- [ ] Verify commission amounts at each level
- [ ] Test admin panel: Edit referral rate
- [ ] Test admin panel: Edit commission levels
- [ ] Verify stats display correctly
- [ ] Check database entries for all transactions
- [ ] Test with USDT deposits (USD → INR conversion)
- [ ] Test with UPI deposits (direct INR)
- [ ] Verify wallet balance updates correctly
- [ ] Test email notifications (if enabled)

---

## Expected Database State After Full Test

**Users Table**:
- All users should have updated `wallet_balance` reflecting bonuses/commissions

**Referral Earnings Table**:
- One entry per referred user (one-time bonus)

**Commission History Table**:
- Multiple entries per user (one per trade by downline)

**Transactions Table**:
- Type `referral_bonus`: One per referred user
- Type `commission`: Multiple per upline user

**Platform Settings Table**:
- `referral_bonus_rate`: Current rate (e.g., 0.03 for 3%)
- `commission_levels`: JSON array of 6 levels with rates
