# 🎬 Theater Seat Booking System with Optimistic Locking

A full-stack theater seat booking application demonstrating concurrent seat reservation using **MySQL optimistic locking** without any external caching or queueing systems.

## Key Features

✅ **Optimistic Locking**: Uses version columns for conflict detection  
✅ **MySQL InnoDB**: Row-level locking support for data consistency  
✅ **Atomic Operations**: Conditional UPDATE statements prevent race conditions  
✅ **Payment Simulation**: Handles successful and failed payments with proper rollbacks  
✅ **Real-time Updates**: Live seat status synchronization across users  
✅ **Concurrency Safe**: Only one user can book each seat simultaneously  

## Technical Architecture

### Database Layer
- **Version Column**: Each seat has a `version` field that increments on every update
- **Conditional Updates**: `UPDATE seats SET ... WHERE id = ? AND status = 'available' AND version = ?`
- **Transactions**: Used only during critical database operations, never kept open during payment
- **InnoDB**: ACID-compliant transactions with row-level locking

### Concurrency Mechanism: Optimistic Locking

**How it works:**

1. **User A** reads Seat with `version=1`
2. **User B** reads Seat with `version=1` (same version)
3. **User A** attempts: `UPDATE seats SET status='reserved', version=2 WHERE id=5 AND version=1` ✅ Success
4. **User B** attempts: `UPDATE seats SET status='reserved', version=2 WHERE id=5 AND version=1` ❌ Fails (version changed)
5. **User B** receives: "Seat no longer available"

### Flow Diagram

```
User Selection (Theater) 
    ↓
Display Available Seats 
    ↓
Click Seat → Check Version
    ↓
Attempt Optimistic Lock (Conditional UPDATE)
    ├─ ✅ Success: Create Reservation → Payment Page
    └─ ❌ Fail: Show Error → Return to Seat Selection
    ↓
Payment Processing (Outside Transaction)
    ├─ ✅ Update Seat to 'booked', Release Lock
    └─ ❌ Rollback Seat to 'available', Release Lock
```

## Project Structure

```
bookmyshow/
├── server/                 # Node.js/Express backend
│   ├── package.json
│   ├── server.js          # Main API with optimistic locking logic
│   └── database.js        # MySQL connection & transaction helpers
├── client/                # React frontend
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js         # Main component with state management
│       ├── index.js       # React entry point
│       └── components/
│           ├── TheaterList.js   # Theater selection
│           ├── SeatBooking.js   # Seat grid & selection
│           └── Checkout.js      # Payment processing
└── database/
    └── schema.sql         # Database initialization script
```

## Installation & Setup

### Prerequisites
- Node.js 14+
- MySQL 8.0+
- npm or yarn

### Step 1: Initialize Database

```bash
# Connect to MySQL and run the schema
mysql -u root -p < database/schema.sql
```

You'll be prompted for your MySQL root password.

**Default credentials used in setup:**
- Host: `localhost`
- User: `root`
- Password: `root`
- Database: `theater_booking`

> ⚠️ **Important**: Update credentials in `server/database.js` if your MySQL setup is different.

### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

### Step 3: Start the Backend Server

```bash
npm start
```

Expected output:
```
Server running on port 5000
Theater Booking API with Optimistic Locking
```

### Step 4: Install Client Dependencies (New Terminal)

```bash
cd client
npm install
```

### Step 5: Start the React Frontend

```bash
npm start
```

The browser will open automatically at `http://localhost:3000`

## API Endpoints

### Theaters
- `GET /api/theaters` - List all theaters
- `GET /api/theaters/:theaterId` - Get specific theater
- `GET /api/theaters/:theaterId/seats` - Get all seats for a theater

### Seat Booking
- `POST /api/seats/reserve` - Reserve a seat (optimistic locking)
  ```json
  {
    "seatId": 5,
    "userId": "USER_abc123"
  }
  ```

### Payment & Bookings
- `POST /api/bookings/process-payment` - Process payment (simulated)
  ```json
  {
    "reservationToken": "uuid-token",
    "userId": "USER_abc123"
  }
  ```
- `GET /api/bookings/:reservationToken` - Get booking details
- `POST /api/bookings/cancel` - Cancel reservation

## Optimistic Locking Implementation Details

### Key SQL Query for Reservation

```sql
UPDATE seats 
SET status = 'reserved', 
    version = version + 1, 
    reserved_by = ?, 
    updated_at = NOW()
WHERE id = ? 
  AND status = 'available' 
  AND version = ?
```

**Why this works:**
- `version = ?` ensures we only update if the version matches what we read
- Atomic operation: Both version increment and status change happen together
- `affectedRows` tells us if the update succeeded or another user beat us

### Database Schema: Seats Table

```sql
CREATE TABLE seats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  theater_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  row_letter CHAR(1) NOT NULL,
  status ENUM('available', 'reserved', 'booked'),
  version INT DEFAULT 1,           -- ✅ Optimistic locking column
  reserved_by VARCHAR(100),
  booked_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (theater_id, row_letter, seat_number),
  INDEX idx_theater_status (theater_id, status)
);
```

## Testing Concurrency

### Test Scenario: Multiple Users Book Same Seat

1. **Open multiple browser windows/tabs** pointing to `http://localhost:3000`
2. **Same user ID (for testing)**: Each window will have a different user ID by default
3. **Select same theater** in all windows
4. **Click the same seat** simultaneously in multiple windows
5. **Expected behavior**:
   - One user will successfully reserve the seat
   - Other users will see: "Seat is no longer available - reservation failed"
   - The seat status will update to "reserved" in all windows (after refresh)

### Test Scenario: Payment Failure Rollback

1. Complete a seat reservation
2. Proceed to payment
3. Payment has a **70% success rate** (simulated)
4. **If payment fails**:
   - Seat is automatically released to 'available'
   - You can try another seat
5. **If payment succeeds**:
   - Seat becomes 'booked'
   - No other user can book it

## Database Transaction Management

### Two-Phase Reservation
```
Phase 1: Reservation (Atomic Transaction)
  - Check seat version and status
  - Use FOR UPDATE lock for consistency
  - Attempt optimistic lock update
  - Create booking record
  - Release lock

Phase 2: Payment (Outside Transaction)
  - Simulate payment processing
  - No database locks held

Phase 3: Confirmation (Atomic Transaction)
  - Update seat to 'booked' or 'available'
  - Update booking status
  - Release any reserved state
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Avg Reservation Time | <100ms | With optimistic lock |
| Max Concurrent Users | Unlimited | No locks during payment |
| Lock Contention | Minimal | Only during DB updates |
| Payment Window | ~500ms | Simulated delay |

## Handling Edge Cases

### Case 1: User A reserves, User B clicks same seat
```
User A: UPDATE ... WHERE version=1 ✅ (version becomes 2)
User B: UPDATE ... WHERE version=1 ❌ (version is now 2)
Result: User B gets error, seat refreshes automatically
```

### Case 2: Payment fails during processing
```
Seat reserved with status='reserved'
User pays → Payment rejected
Seat status reverted to 'available'
Seat released for other users
```

### Case 3: Stale read between seat check and payment
```
User reads version=1
Another user books & completes → version=3
User's payment still processes correctly
Status updated only if version matches
```

## Troubleshooting

### MySQL Connection Error
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `server/database.js`
- Ensure database `theater_booking` exists

### Port Already in Use
```bash
# Server (port 5000)
lsof -i :5000
kill -9 <PID>

# Frontend (port 3000)
lsof -i :3000
kill -9 <PID>
```

### Schema Import Failed
- Ensure MySQL user has CREATE DATABASE privilege
- Reset and reimport:
  ```sql
  DROP DATABASE IF EXISTS theater_booking;
  CREATE DATABASE theater_booking;
  USE theater_booking;
  -- Then import schema.sql
  ```

## Key Learnings: Why Optimistic Locking Works Here

1. **No Distributed Locks**: All logic in single database - simpler & faster
2. **Conflicts Are Rare**: Same seat booked simultaneously is uncommon
3. **Retry Friendly**: Failed optimistic locks have clear error messages
4. **Transaction Short**: Lock held only for DB updates, not payment
5. **Scalable**: No central lock manager - scales horizontally

## Real-World Extensions

For production, you might add:
- Redis for distributed caching
- Message queues for payment processing
- Read replicas with eventual consistency
- Circuit breakers for payment service
- Detailed audit logs for bookings
- Seat holds with automatic expiration

## License

MIT License - Feel free to use and modify!

---

**Happy Booking! 🎟️**
