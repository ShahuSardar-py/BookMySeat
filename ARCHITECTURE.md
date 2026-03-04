# Architecture & Implementation Details

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  App.js (State Management & Flow)                    │   │
│  │  ├─ TheaterList Component (Theater Selection)        │   │
│  │  ├─ SeatBooking Component (Seat Grid)                │   │
│  │  ├─ Checkout Component (Payment Flow)                │   │
│  │  └─ Real-time seat status polling every 2s           │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ▲                                  │
│                           │ HTTP/REST API                     │
│                           ▼                                  │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js Node)                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  server.js                                              │    │
│  │  ├─ GET /api/theaters (list all theaters)              │    │
│  │  ├─ GET /api/theaters/:theaterId/seats (seat grid)     │    │
│  │  ├─ POST /api/seats/reserve (optimistic lock)          │    │
│  │  ├─ POST /api/bookings/process-payment (simulate)      │    │
│  │  ├─ GET /api/bookings/:token (booking details)         │    │
│  │  └─ POST /api/bookings/cancel (release reservation)    │    │
│  │                                                          │    │
│  ├─ Concurrency Control:                                   │    │
│  │  ├─ Version-based optimistic locking                    │    │
│  │  ├─ Atomic conditional UPDATE statements                │    │
│  │  ├─ Transaction management (BEGIN/COMMIT/ROLLBACK)      │    │
│  │  └─ Reservation token generation (UUID)                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                           ▲                                       │
│                           │ MySQL Protocol                         │
│                           ▼                                       │
└───────────────────────────────────────────────────────────────────┘
                            │
┌────────────────────────────────────────────────────────────┐
│              DATABASE (MySQL 8.0+ InnoDB)                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Tables:                                             │  │
│  │                                                     │  │
│  │ theaters                                            │  │
│  │ ├─ id (PK)                                          │  │
│  │ ├─ name, city, total_seats                          │  │
│  │                                                     │  │
│  │ seats (CRITICAL FOR CONCURRENCY)                    │  │
│  │ ├─ id (PK)                                          │  │
│  │ ├─ theater_id (FK)                                  │  │
│  │ ├─ status: 'available'|'reserved'|'booked'          │  │
│  │ ├─ version INT (optimistic lock column) ✅          │  │
│  │ ├─ reserved_by, booked_by                           │  │
│  │ ├─ Indexes: (theater_id, status), (theater_id, row) │  │
│  │                                                     │  │
│  │ bookings                                            │  │
│  │ ├─ id (PK)                                          │  │
│  │ ├─ seat_id (FK)                                     │  │
│  │ ├─ user_id, reservation_token                       │  │
│  │ ├─ status: reserved|payment_pending|payment_success │  │
│  │ └─ timestamps: reserved_at, booked_at, expired_at   │  │
│  │                                                     │  │
│  │ Engine: InnoDB (ACID, row-level locks)              │  │
│  │ Charset: utf8mb4 (Unicode support)                  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow for Seat Reservation

### 1. Theater Selection Flow

```
CLIENT                          BACKEND                     DATABASE
┌────────────┐                                               
│ Select      │                                               
│ Theater 1   │─────── GET /api/theaters/1 ────────────────►
└────────────┘                                               
        ◄─────────────── {id, name, city, seats} ────────────
        │                                                     
        ├─ GET /api/theaters/1/seats ──────────────────────►
        │                                        
        │                                 SELECT * FROM seats
        │                                 WHERE theater_id=1
        │                                 ORDER BY row_letter
        │                                               ◄────
        │                                 [{seat data}]
        ◄───────────── [{id, seat_number, status, version}] ──
        │
        ▼
    Display grid with:
    ✅ Green seats = available
    🟡 Yellow seats = reserved
    🔴 Red seats = booked
```

### 2. Optimistic Lock Reservation Flow**

```
USER_A REQUEST                  BACKEND                  DATABASE (SEAT)
                                                         Initial state:
                                                         {id:5, v:1, status:'avail'}

Post /api/seats/reserve ──────►
│ {seatId: 5, userId: A}        │
│                               Begin Transaction
│                               ├─ SELECT * FROM seats
│                               │   WHERE id=5 FOR UPDATE
│                               │                    ◄─ Locks row
│                               │                    Get v=1, status='avail'
│                               │
│                               │ Verify conditions met ✅
│                               │
│                               │ Execute Key Update:
│                               │ UPDATE seats SET
│                               │   status='reserved'
│                               │   version=version+1
│                               │   reserved_by='USER_A'
│                               │ WHERE id=5 
│                               │   AND status='available'
│                               │   AND version=1
│                               │                    ◄─ Check WHERE clause
│                               │                       ✅ All conditions TRUE
│                               │                       Execute UPDATE
│                               │                       Rows affected: 1 ✅
│                               │                       New state:
│                               │                       {id:5, v:2, status:'reserved'}
│                               │
│                               │ INSERT INTO bookings
│                               │   (seat_id, user_id, token, status)
│                               │   VALUES (5, A, token123, 'reserved')
│                               │                    ◄─ Booking record created
│                               │
│                               │ Commit Transaction
│                               │                    ◄─ Unlock row
◄──── {success: true, token: token123, bookingId: 999} ──

Result: ✅ Successfully reserved!
        → Redirect to payment page
        → Store reservation token in state


SIMULTANEOUS REQUEST FROM USER_B:

USER_B REQUEST                  BACKEND                  DATABASE (SEAT)
                                                         Current state (after A):
                                                         {id:5, v:2, status:'reserved'}

Post /api/seats/reserve ──────►
│ {seatId: 5, userId: B}        │
│                               Begin Transaction
│                               ├─ SELECT * FROM seats
│                               │   WHERE id=5 FOR UPDATE
│                               │                    ◄─ Locks row
│                               │                    Get v=2, status='reserved'
│                               │
│                               │ Verify conditions met ✅
│                               │
│                               │ Execute Key Update:
│                               │ UPDATE seats SET
│                               │   status='reserved'
│                               │   version=version+1
│                               │   reserved_by='USER_B'
│                               │ WHERE id=5 
│                               │   AND status='available' ─── ❌ FALSE!
│                               │   AND version=1             (v is now 2)
│                               │
│                               │      WHERE clause evaluation:
│                               │      ├─ id=5? ✅ TRUE
│                               │      ├─ status='available'? ❌ FALSE (is 'reserved')
│                               │      └─ version=1? ❌ FALSE (is 2)
│                               │
│                               │      Overall: ❌ FALSE
│                               │      Rows affected: 0 ❌
│                               │
│                               │ Rollback Transaction
│                               │                    ◄─ Unlock row
◄──── {success: false, error: 'Seat is no longer available'} ──

Result: ❌ Reservation failed!
        → Show error message
        → Stay on seat selection
        → Seat grid updates to show as 'reserved'
        → User can try another seat
```

### 3. Payment Processing Flow

```
PAYMENT REQUEST                 BACKEND                    DATABASE

POST /api/bookings/process-payment ──►
│ {reservationToken, userId}    │
│                               │ Get booking details (read-only query)
│                               │ ⚠️  NO transaction yet!
│                               │
│                               │ SELECT status FROM bookings
│                               │ WHERE reservation_token = token
│                               │                    ◄─ Get booking: {seat_id: 5}
│                               │
│                               │ Verify status = 'reserved' ✅
│                               │
│                               │ --- SIMULATE PAYMENT OUTSIDE DB ---
│                               │ (No transaction, no database locks!)
│                               │
│                               │ Simulate 500ms delay
│                               │ Generate payment_id = 'PAY_abc123'
│                               │ Random: success = (Math.random() < 0.7)
│                               │
│                               ├─ If paymentSuccess = true:
│                               │  │
│                               │  └─ Begin Transaction
│                               │     UPDATE seats SET
│                               │       status='booked'
│                               │       version=version+1
│                               │       reserved_by=NULL
│                               │       booked_by='USER_A'
│                               │     WHERE id=5 AND status='reserved'
│                               │                    ◄─ Check: status='reserved'?
│                               │                       ✅ TRUE
│                               │                       Execute: ✅ 1 row affected
│                               │                       v: 2→3, status: reserved→booked
│                               │
│                               │     UPDATE bookings SET
│                               │       status='payment_success'
│                               │       payment_id='PAY_abc123'
│                               │       booked_at=NOW()
│                               │     WHERE payment_token=token
│                               │                    ◄─ Booking updated
│                               │
│                               │     Commit ✅
◄──── {success: true, message: 'Payment successful'} ───

Result: ✅ Payment succeeded!
        → Seat marked as 'BOOKED' in database
        → Booking confirmed
        → All users see seat as red/unavailable


                               ├─ Else if paymentSuccess = false:
                               │  │
                               │  └─ Begin Transaction
                               │     UPDATE seats SET
                               │       status='available' ←── ROLLBACK!
│                               │       version=version+1
│                               │       reserved_by=NULL
│                               │     WHERE id=5 AND status='reserved'
│                               │                    ◄─ Check: status='reserved'?
│                               │                       ✅ TRUE
│                               │                       Execute: ✅ 1 row affected
│                               │                       v: 2→3, status: reserved→available
│                               │
│                               │     UPDATE bookings SET
│                               │       status='payment_failed'
│                               │       payment_id='PAY_abc123'
│                               │     WHERE payment_token=token
│                               │                    ◄─ Booking marked failed
│                               │
│                               │     Commit ✅
◄──── {success: false, message: 'Payment failed. Seat released.'} ──

Result: ⚠️  Payment failed!
        → Seat marked as 'AVAILABLE' in database
        → Automatically released for other users
        → User can try another seat
```

---

## Concurrency Safety Guarantees

### Transaction Isolation

```
MySQL InnoDB Default: REPEATABLE READ

User A's Transaction            User B's Transaction
┌────────────────────┐          ┌────────────────────┐
│ BEGIN              │          │ BEGIN              │
│                    │          │                    │
│ SELECT seat        │          │ SELECT seat        │
│ └─ v=1, status=av  │          │ └─ v=1, status=av  │
│                    │          │                    │
│ UPDATE set v=2     │          │                    │
│ WHERE v=1          │          │                    │
│ └─ SUCCESS ✅      │          │                    │
│                    │          │ UPDATE set v=2     │
│ COMMIT ✅          │          │ WHERE v=1          │
│ └─ v=2 in DB       │          │ └─ FAILS ❌        │
│                    │          │ (v is now 2)       │
│                    │          │                    │
│                    │          │ ROLLBACK ✅        │
└────────────────────┘          └────────────────────┘

Isolation Level: REPEATABLE READ
- User B doesn't see User A's changes until committed
- But User B's UPDATE check detects the version change
- Conflict detected before User B can corrupt state
```

### Atomicity

```
The UPDATE statement is atomic:

Either it:
┌─────────────────────────────────────┐
│ 1. Sets ALL columns:                 │
│    ├─ status ← 'reserved'           │
│    ├─ version ← 2                    │
│    ├─ reserved_by ← 'USER_A'         │
│    ├─ updated_at ← NOW()             │
│    └─ Increments version perfectly   │
│                                      │
│ 2. OR fails completely:              │
│    ├─ No columns changed             │
│    ├─ version still 1                │
│    ├─ status still 'available'       │
│    └─ affectedRows = 0               │
│                                      │
│ NEVER a halfway state!               │
└─────────────────────────────────────┘

Atomicity = ALL or NOTHING
No partial updates that could corrupt data
```

### Consistency

```
Before: {id:5, v:1, status:'available', reserved_by:null}
After:  {id:5, v:2, status:'reserved', reserved_by:'USER_A'}

Constraints maintained:
✅ version always incremented with each update
✅ status transitions valid (available→reserved→booked)
✅ reserved_by populated when status='reserved'
✅ booked_by populated when status='booked'
✅ No user can have multiple reservations for same seat
✅ No seat can be booked by two users

Database constraints enforced:
├─ UNIQUE(theater_id, row_letter, seat_number)
├─ FOREIGN KEY(seat_id) REFERENCES bookings
└─ ENUM CHECK for valid status values
```

### Durability

```
After COMMIT ✅
Data is guaranteed to persist even if:
✅ Application crashes
✅ Server restarts
✅ Power failure (MySQL log file ensures recovery)
✅ Network disconnection

MySQL writes to:
1. In-memory buffer (fast)
2. Disk transaction log (safe)
3. Data file (eventual)

User considered booked after COMMIT returns successfully
```

---

## Why No Redis/Queues/External Systems Needed

### Without Optimistic Locking (Using External Cache)

```
User A clicks → Queue job → Redis holds lock (5 seconds)
User B clicks → Queue job → Waits for Redis lock...
            → Timeout error shown after 5+ seconds
            
Problems:
- Added complexity (Redis setup, configuration)
- Potential lock timeouts
- Requires lock expiration logic
- Network latency for cache reads
- Potential data loss if Redis crashes
```

### With Optimistic Locking (Database Only)

```
User A clicks → Query database (10ms) → Check version → UPDATE (5ms)
User B clicks → Query database (10ms) → Check version → Failed (0ms)
             
Advantages:
- Everything in ONE database (single source of truth)
- No external dependency (no Redis needed)
- Instant conflict detection
- Built-in durability (ACID)
- No network latency for locks
```

---

## Summary

✅ **Optimistic Locking** = Use version column to detect conflicts
✅ **MySQL Transactions** = ACID guarantees for consistency  
✅ **Conditional Updates** = WHERE version=expected_value prevents overwrites
✅ **Fast Processing** = Conflicts detected instantly, no lock waits
✅ **Simple Implementation** = No external systems, just SQL

The system is ready for production with proper error handling and logging! 🚀
