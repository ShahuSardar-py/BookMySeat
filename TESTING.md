# Concurrency Testing Guide

## Understanding the Test Scenarios

This document provides detailed instructions for testing the optimistic locking concurrency mechanism.

---

## Scenario 1: Basic Concurrent Booking (Same User ID)

### Goal
Verify that only one user can successfully book a seat when multiple attempts happen simultaneously.

### Setup
1. Open **3 browser tabs** at `http://localhost:3000`
2. Each tab will get a unique **User ID** (shown at top of page)

### Test Steps
1. **Tab 1**: Select "Cineplex Plaza" theater
2. **Tab 2**: Select "Cineplex Plaza" theater
3. **Tab 3**: Select "Cineplex Plaza" theater
4. All tabs showing same seat grid
5. **Important**: All tabs should be on seat selection screen
6. **Click seat "A1" simultaneously** in all three tabs (within 1-2 seconds)

### Expected Results
- **One tab**: Successfully reserves → redirected to payment page ✅
- **Two tabs**: Receive error "Seat is no longer available - reservation failed" ❌
- All three tabs reflect updated seat status (A1 now yellow/reserved)

### What's Happening Behind the Scenes
```sql
-- Tab 1 executes
UPDATE seats SET status='reserved', version=2, reserved_by=USER_A WHERE id=1 AND status='available' AND version=1
-- Result: ✅ 1 row affected

-- Tab 2 executes (same time)
UPDATE seats SET status='reserved', version=2, reserved_by=USER_B WHERE id=1 AND status='available' AND version=1
-- Database has: status='reserved', version=2 (from Tab 1)
-- Condition fails: version is 2, we're checking for 1
-- Result: ❌ 0 rows affected

-- Tab 3 executes (same time)
-- Same as Tab 2 - fails because version changed
-- Result: ❌ 0 rows affected
```

---

## Scenario 2: Sequential Booking (Race Condition)

### Goal
Test behavior when users try to book the same seat with milliseconds between attempts.

### Setup
1. Open **2 browser tabs** at `http://localhost:3000`
2. Get unique User IDs (different for each tab)

### Test Steps
1. Both tabs: Select "Galaxy Cinemas"
2. Tab 1: Click seat "B5"
3. **Wait 100-200ms**
4. Tab 2: Click seat "B5"
5. Both should show responses almost simultaneously

### Expected Results
- **Tab 1**: Successfully reserves ✅ → Redirected to payment
- **Tab 2**: Gets error ❌ → Stays on seat selection
- Tab 2 seat B5 shows as reserved/yellow

---

## Scenario 3: Payment Success Path

### Goal
Test complete happy path: reservation → payment success → seat becomes booked

### Setup
1. Open **1 browser tab** at `http://localhost:3000`
2. Select "Metro Theatre"

### Test Steps
1. Click any available green seat
2. Wait for "Payment" page to load
3. Click "Process Payment" button
4. Watch the result
5. After success message, browser redirects automatically

### Expected Results
- Payment processes
- **70% chance of success** (simulated for testing)
  - Success: "Payment Successful! Your seat is now booked." ✅
  - Failure: "Payment failed. Your reservation has been released." ❌
- If **success**: Seat marked as "booked" (red)
- If **failure**: Seat marked as "available" (green) again

### Database State After Success
```sql
-- Seats table
SELECT seat_number, status, version FROM seats WHERE id=15;
-- Returns: ('C3', 'booked', 3)  -- version incremented to 3

-- Bookings table
SELECT status, payment_id FROM bookings WHERE seat_id=15;
-- Returns: ('payment_success', 'PAY_xxxxx')
```

---

## Scenario 4: Concurrent With Payment Simulation

### Goal
Test multiple users attempting to book different seats, with payment processing overlap.

### Setup
1. Open **4 browser tabs** at `http://localhost:3000`
2. Label them: Tab A, Tab B, Tab C, Tab D

### Test Steps
1. All tabs: Select same theater "Cineplex Plaza"
2. **Tab A**: Click seat A1 (gets to payment page)
3. **Tab B**: Click seat A2 (gets to payment page)
4. **Tab C**: Click seat A3 (gets to payment page)
5. **Tab D**: Click seat A4 (gets to payment page)
6. All should reach payment pages simultaneously
7. Click "Process Payment" in all tabs **at the same time**

### Expected Results
- All 4 seats successfully reserved ✅
- Each goes through payment simulation
- Some succeed, some fail (based on 70% success rate)
- **Successful seats**: Changed to red/booked
- **Failed seats**: Returned to green/available

### Why This Works
- Different seats: No conflict in optimistic locking
- Concurrent payments: No transactions kept open during payment
- Database remains consistent throughout

---

## Scenario 5: Stress Test (Many Users)

### Goal
Test system with high concurrent load.

### Setup
1. Open **10+ browser tabs** at `http://localhost:3000`
2. Arrange in grid for visibility

### Test Steps
1. Do NOT click anything yet - wait for all to load
2. All tabs: Select "Cineplex Plaza"
3. Wait for all to show seat grid
4. **Count down**: 3... 2... 1...
5. Click **different seats** across all tabs (avoid same seat)
6. Observe reservations happening

### Expected Results
- All 10 reservations succeed ✅
- All reach payment pages
- Mix of payment successes/failures
- System remains responsive
- No crashes or database locks

### Optional: Try Same Seat
- If you want to test with same seat across many tabs:
  1. All tabs select "Cineplex Plaza"
  2. All tabs click on seat "D7"
  3. Only 1 reservation succeeds
  4. 9+ tabs get error message

---

## Scenario 6: Version Mismatch Detection

### Goal
Verify that the optimistic locking version check actually works.

### Setup
1. Open **2 browser tabs** at `http://localhost:3000`
2. Database with some pre-booked seats

### Test Steps - Manual Version Check
1. Open Tab 1: Select theater, see seat A1 with version=1
2. Open Tab 2: Select same theater, same seat A1 has version=1
3. Tab 1: Click A1 (version becomes 2 when reserved)
4. Tab 2: Try to click A1 (but version is now 2)
5. Tab 2: Click shows error immediately

### Debug View (Optional)
Check browser console logs to see:
```
Error: Seat is no longer available - reservation failed
```

---

## Scenario 7: Payment Failure Rollback

### Goal
Confirm that failed payment releases the seat back to available state.

### Setup
1. Open **2 browser tabs** at `http://localhost:3000`

### Test Steps
1. Tab 1: Select theater, click seat B3, go to payment page
2. **Don't** click payment yet
3. Tab 2: Select **same theater**, click **same seat B3**
4. Tab 2: Should show "Seat no longer available" ✅
5. Tab 1: Click "Process Payment"
6. If payment fails (30% chance):
   - See "Payment failed" message
   - Seat returned to available
7. Tab 2: Click "Back to Seat Selection"
8. Tab 2: Seat B3 should now show as available (green) again

### Forcing Payment Failure for Testing
Edit `server/server.js`:
```javascript
// Line ~160, change:
const paymentSuccess = Math.random() < 0.7;  // 70% success

// To this for 0% success (always fails):
const paymentSuccess = false;
```

---

## Advanced: Monitoring Database State

### Check Seat Status in Real-Time
```bash
# Terminal: Connect to MySQL
mysql -u root -p theater_booking

# Query seats during booking
SELECT id, seat_number, status, version FROM seats 
WHERE theater_id=1 
ORDER BY seat_number;

# Watch for changes:
# - status changes from 'available'to 'reserved' to 'booked'
# - version increments on each update
# - reserved_by shows which user reserved it
```

### Monitor Bookings Table
```bash
SELECT id, user_id, status, reserved_at, booked_at 
FROM bookings 
WHERE status != 'cancelled'
ORDER BY reserved_at DESC
LIMIT 10;
```

---

## Browser Developer Tools

### Check Network Requests
1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by XHR/Fetch
4. Click a seat
5. Observe request to `/api/seats/reserve`
6. Response shows: `success`, `reservationToken`, etc.

### Check Console Logs
1. Open DevTools (F12)
2. Go to **Console** tab
3. Errors appear in red
4. API responses appear in network tab details

---

## Expected Test Results Summary

| Scenario | Expected Outcome | Why |
|----------|-----------------|-----|
| Same seat, 3 users | 1 success, 2 fail | Version mismatch on DB |
| Different seats, 10 users | All succeed | No conflicts |
| Payment success | Seat becomes 'booked' | Update completes |
| Payment fail | Seat becomes 'available' | Rollback executed |
| Stale read | Correctly handled | Version check prevents it |
| High load (10+ users) | System stable | Optimistic lock scales |

---

## Troubleshooting Test Failures

### Seat not showing as reserved
- Check browser refresh: seat grid refreshes every 2 seconds
- Check database: `SELECT * FROM seats WHERE id=X`
- Check server logs for errors

### Payment always succeeds/fails
- Edit success rate in `server/server.js` line 160
- Default is 70% success rate for testing variance

### All users get same error
- Could mean database connection issue
- Check server logs for errors
- Verify MySQL is running

### Browser tabs show different seat statuses
- This is expected! Refresh rate is 2 seconds
- Manual refresh (F5) updates immediately
- This demonstrates eventual consistency

---

## Performance Notes

### Expected Response Times
- Seat reservation: <100ms (with optimistic lock)
- Payment simulation: ~500ms (includes artificial delay)
- Seat refresh: Every 2 seconds automatically

### Max Concurrent Users
- Theoretically unlimited
- Limited by MySQL connection pool (default 10)
- Adjust in `server/database.js` if needed

### Database Load
- Low: Each operation is a single atomic UPDATE
- No full table scans
- Indexes on `theater_id`, `status` for fast lookups

---

## Next Steps After Testing

1. ✅ Verify all scenarios pass
2. ✅ Check database consistency (no duplicate bookings)
3. ✅ Review server logs for any errors
4. ✅ Monitor MySQL for locked table warnings
5. ✅ Performance test with load generator (Apache JMeter, etc.)

**Happy Testing! 🧪**
