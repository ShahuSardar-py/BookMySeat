# 📘 Complete File Reference Guide

## 📚 Documentation Files

### 1. **README.md** (START HERE!)
**Purpose:** Complete feature documentation  
**Contains:**
- Feature overview & architecture diagram
- Installation instructions (detailed)
- API endpoint documentation
- Optimistic locking explanation
- Database schema details
- Performance metrics
- Troubleshooting guide

**Read when:** First time learning about the project

---

### 2. **INDEX.md** (PROJECT OVERVIEW)
**Purpose:** High-level project summary  
**Contains:**
- Quick overview of what you get
- Project structure visualization
- A complete guide to all other docs
- Feature highlights
- Key technologies used
- Next steps

**Read when:** Getting oriented, need quick reference

---

### 3. **QUICKSTART.md** (5-MINUTE SETUP)
**Purpose:** Fast installation & first run  
**Contains:**
- Prerequisites checklist
- Step-by-step installation (3 steps)
- Quick test scenarios
- Common issues
- Concurrency testing overview

**Read when:** Want to get the app running immediately

---

### 4. **INSTALLATION.md** (DETAILED SETUP)
**Purpose:** Complete setup with verification  
**Contains:**
- Pre-installation checklist
- Detailed installation steps
- Post-installation verification
- Functional testing procedures
- Issue troubleshooting
- Health check scripts

**Read when:** Following complete installation, validating setup

---

### 5. **CONCURRENCY_EXPLANATION.md** (HOW IT WORKS)
**Purpose:** Deep dive into optimistic locking mechanism  
**Contains:**
- Visual ASCII diagrams of concurrency
- Timeline of concurrent events
- Why version column works
- State machine transitions
- Lock comparison (pessimistic vs optimistic)
- Edge case handling
- Performance metrics
- Key takeaways

**Read when:** Understanding how concurrency control works

---

### 6. **ARCHITECTURE.md** (SYSTEM DESIGN)
**Purpose:** Technical architecture & request flows  
**Contains:**
- System architecture diagram
- Three-phase booking flow
- Theater selection flow
- Optimistic lock reservation flow
- Payment processing flow
- Transaction isolation details
- Concurrency safety guarantees
- Request/response diagrams

**Read when:** Understanding system design, debugging

---

### 7. **TESTING.md** (VALIDATION GUIDE)
**Purpose:** Test scenarios & concurrency validation  
**Contains:**
- 7 detailed test scenarios
- Step-by-step test procedures
- Expected results for each scenario
- Database monitoring queries
- Browser DevTools instructions
- Troubleshooting test failures
- Performance notes
- Stress testing guide

**Read when:** Validating the system works, testing concurrency

---

## 🗄️ Database Files

### **database/schema.sql**
**Purpose:** MySQL database initialization  
**Contains:**
- Theater table schema
- Seats table schema (with version column for optimistic locking)
- Bookings table schema
- Sample data (3 theaters, 300 seats)
- Indexes for performance
- Foreign key relationships
- ENUM constraints

**Run before:** First app launch
```bash
mysql -u root -p < database/schema.sql
```

**Key features:**
- ✅ Version column for optimistic locking
- ✅ InnoDB engine for ACID compliance
- ✅ Proper indexes for fast queries
- ✅ Sample data included

---

## 🖥️ Backend (Server) Files

### **server/package.json**
**Purpose:** Node.js dependencies specification  
**Contains:**
- Project metadata
- Dependency list:
  - `express` - Web framework
  - `mysql2` - MySQL client
  - `uuid` - Token generation
  - `cors` - Cross-origin support
  - `dotenv` - Environment variables
- NPM scripts (start, dev)

**Used by:** `npm install`

---

### **server/server.js**
**Purpose:** Main Express.js API server  
**Contains (600+ lines):**

**Endpoints:**
- `GET /api/theaters` - List all theaters
- `GET /api/theaters/:theaterId` - Theater details
- `GET /api/theaters/:theaterId/seats` - Seat grid
- `POST /api/seats/reserve` - Reserve seat (⭐ optimistic locking)
- `POST /api/bookings/process-payment` - Payment processing
- `GET /api/bookings/:reservationToken` - Booking details
- `POST /api/bookings/cancel` - Cancel reservation
- `GET /api/health` - Health check

**Concurrency Logic:**
- Version checking in WHERE clause
- Condition UPDATE statements
- Transaction management (BEGIN/COMMIT/ROLLBACK)
- Optimistic lock detection (affectedRows check)
- Automatic rollback on payment failure

**Key function:** `/api/seats/reserve`
- Reads seat with FOR UPDATE lock
- Executes: `UPDATE ... WHERE version=? AND status='available'`
- If update succeeds: creates booking, returns token
- If update fails: returns "Seat no longer available"

---

### **server/database.js**
**Purpose:** MySQL connection management  
**Contains:**
- Connection pool setup
- `getConnection()` - Get MySQL connection
- `query()` - Execute read query
- `executeTransaction()` - Manage transaction lifecycle
  - BEGIN TRANSACTION
  - Execute callback
  - COMMIT or ROLLBACK
  - Release connection

**Used by:** server.js for all DB operations

**Connection pool settings:**
- Max connections: 10
- Queue limit: unlimited

---

### **server/.env.example**
**Purpose:** Environment variable template  
**Contains:**
- DB_HOST (MySQL host)
- DB_USER (MySQL username)
- DB_PASSWORD (MySQL password)
- DB_NAME (Database name)
- PORT (Server port)
- Payment simulation settings

**Purpose:** Copy to `.env` and customize for your setup

---

## 💻 Frontend (Client) Files

### **client/package.json**
**Purpose:** React dependencies  
**Contains:**
- React 18, React DOM
- Axios (HTTP client)
- react-scripts (build tools)
- NPM scripts (start, build)

**Used by:** `npm install`

---

### **client/public/index.html**
**Purpose:** HTML entry point  
**Contains:**
- Basic HTML structure
- Meta tags
- `<div id="root">` for React mounting
- No other content (React renders everything)

---

### **client/src/index.js**
**Purpose:** React application bootstrap  
**Contains:**
- React import
- React DOM import
- App component import
- Root element mounting
- StrictMode wrapper

---

### **client/src/index.css**
**Purpose:** Global styles  
**Contains:**
- Font setup
- Body styles
- CSS reset
- Base element styling

---

### **client/src/App.js** (Core Application)
**Purpose:** Main React component & state management  
**Contains (200+ lines):**

**State Management:**
- `userId` - Unique user identifier
- `currentStep` - 'theater' | 'booking' | 'checkout'
- `selectedTheater` - Currently selected theater
- `selectedSeat` - Currently selected seat
- `reservationToken` - Token from backend
- `loading` - Loading state
- `error` - Error messages

**Event Handlers:**
- `handleTheaterSelect()` - Go to seat selection
- `handleSeatSelect()` - Click seat
- `handleReserveSeat()` - Call `/api/seats/reserve`
- `handleBackToTheaters()` - Reset state
- `handleBackToSeats()` - Go back from checkout

**Flow:**
1. User selects theater
2. Display seat grid
3. User clicks seat → calls API
4. If success: show checkout page
5. If fail: show error, allow retry

---

### **client/src/App.css**
**Purpose:** Main app styling  
**Contains:**
- Header styling (gradient background)
- Main content area
- Footer
- Error banner animation
- Responsive design

**Color scheme:**
- Purple gradient: `#667eea` to `#764ba2`
- Error red: `#ff6b6b`
- Success green: `#51cf66`

---

### **client/src/components/TheaterList.js**
**Purpose:** Theater selection component  
**Contains (100 lines):**

**Features:**
- Fetch theaters on mount
- Display theaters in grid
- Click to select + show details
- Theater icon & information
- Error handling

**API Calls:**
- `GET /api/theaters`

**State:**
- `theaters` - List of theaters
- `loading` - Loading state
- `error` - Error message

---

### **client/src/styles/TheaterList.css**
**Purpose:** Theater list styling  
**Contains:**
- Grid layout for theaters
- Card styling
- Hover effects
- Gradient backgrounds
- Responsive design
- Button styling

---

### **client/src/components/SeatBooking.js**
**Purpose:** Seat grid & booking component  
**Contains (150 lines):**

**Features:**
- Display seat grid organized by rows
- Fetch seats on mount
- Auto-refresh every 2 seconds
- Click seat to reserve
- Show seat statistics (available/reserved/booked)
- Legend showing seat colors
- Loading overlay during reservation

**API Calls:**
- `GET /api/theaters/:theaterId/seats` (repeated)

**State:**
- `seats` - Array of seat objects
- `loadingSeats` - Fetching seats
- `selectedSeats` - Currently selected seats
- `theater` - Selected theater info

**Seat Status Display:**
- 🟢 Green = available (clickable)
- 🟡 Yellow = reserved (disabled)
- 🔴 Red = booked (disabled)

---

### **client/src/styles/SeatBooking.css**
**Purpose:** Seat grid styling  
**Contains:**
- Theater screen visualization
- Seat button styling (3 colors)
- Hover animations
- Row & column layout
- Statistics display
- Legend styling
- Responsive grid

---

### **client/src/components/Checkout.js**
**Purpose:** Payment processing component  
**Contains (150 lines):**

**Features:**
- Fetch booking details
- Display summary (theater, seat)
- Price breakdown
- Process payment button
- Show success/failure result
- Auto-redirect on success
- Cancel reservation option

**API Calls:**
- `GET /api/bookings/:reservationToken`
- `POST /api/bookings/process-payment`
- `POST /api/bookings/cancel`

**State:**
- `bookingDetails` - Current booking info
- `loading` - Fetching details
- `processing` - Processing payment
- `paymentResult` - Payment outcome
- `error` - Error messages

**Payment Result:**
- Success: Show confirmation, redirect after 2s
- Failure: Show error, offer to try another seat

---

### **client/src/styles/Checkout.css**
**Purpose:** Checkout page styling  
**Contains:**
- Card layout
- Summary display
- Pricing table styling
- Button styling (cancel/pay)
- Payment result styling
- Success/failure animations
- Responsive design

---

## 📊 File Statistics

```
Total Files: 27
├── Documentation: 7 files (README, INDEX, QUICKSTART, etc.)
├── Database: 1 file (schema.sql)
├── Backend: 4 files (package.json, server.js, database.js, .env.example)
├── Frontend: 13 files (HTML, JS, CSS, components)
└── Config: 2 files (package.json files)

Code Lines:
├── Backend: ~600 lines (server.js optimistic locking logic)
├── Frontend: ~400 lines (React components)
├── Database: ~150 lines (schema + sample data)
├── Documentation: ~2000 lines (guides & explanations)
└── Total: ~3150 lines

Documentation:
├── README.md: 400 lines
├── CONCURRENCY_EXPLANATION.md: 600 lines
├── ARCHITECTURE.md: 500 lines  
├── TESTING.md: 400 lines
├── And more...
```

---

## 🔗 File Dependencies

### Frontend Dependencies
```
App.js
├─ Imports: TheaterList, SeatBooking, Checkout
├─ Uses: axios for API calls
├─ Calls: all major endpoints
└─ State management: user, step, selections, errors
```

### Backend Dependencies
```
server.js
├─ Imports: database.js
├─ Imports: mysql2, express, uuid, cors
├─ Uses: database.query() and database.executeTransaction()
└─ All endpoints depend on database operations
```

### Database Dependencies
```
schema.sql
├─ Creates: theaters table
├─ Creates: seats table (with version column)
├─ Creates: bookings table (with status tracking)
├─ Relations: seats.theater_id → theaters.id
└─ Relations: bookings.seat_id → seats.id
```

---

## ✅ File Checklist

Before running, verify these files exist:

```
server/
├─ [ ] package.json
├─ [ ] server.js
├─ [ ] database.js
└─ [ ] .env.example

client/
├─ [ ] package.json
├─ [ ] public/index.html
├─ [ ] src/
│   ├─ [ ] index.js
│   ├─ [ ] index.css
│   ├─ [ ] App.js
│   ├─ [ ] App.css
│   ├─ [ ] components/
│   │   ├─ [ ] TheaterList.js
│   │   ├─ [ ] SeatBooking.js
│   │   └─ [ ] Checkout.js
│   └─ [ ] styles/
│       ├─ [ ] TheaterList.css
│       ├─ [ ] SeatBooking.css
│       └─ [ ] Checkout.css

database/
└─ [ ] schema.sql

docs/
├─ [ ] README.md
├─ [ ] QUICKSTART.md
├─ [ ] INSTALLATION.md
├─ [ ] TESTING.md
├─ [ ] CONCURRENCY_EXPLANATION.md
├─ [ ] ARCHITECTURE.md
└─ [ ] INDEX.md
```

---

## 🚀 Quick File Reference

**Need to...**

- **...get started**: `QUICKSTART.md`
- **...understand concurrency**: `CONCURRENCY_EXPLANATION.md`
- **...see system design**: `ARCHITECTURE.md`
- **...test the system**: `TESTING.md`
- **...modify API**: Edit `server/server.js`
- **...change UI**: Edit `client/src/components/*.js`
- **...update database**: Edit `database/schema.sql` then reimport
- **...add features**: Start in `server/server.js`, then add React component

---

## 📞 File Locations Quick Reference

```
API Endpoints: server/server.js (lines ~20-200)
Optimistic Lock Logic: server/server.js (lines ~100-140)
Payment Processing: server/server.js (lines ~170-250)
Theater Selection UI: client/src/components/TheaterList.js
Seat Grid UI: client/src/components/SeatBooking.js
Checkout UI: client/src/components/Checkout.js
Database Schema: database/schema.sql
Connection Pool: server/database.js (lines ~1-20)
Transaction Helper: server/database.js (lines ~30-45)
State Management: client/src/App.js (lines ~10-50)
Main App Flow: client/src/App.js (lines ~50-150)
```

---

## 🎯 Which File to Check For...

| Question | File |
|----------|------|
| How do I install? | QUICKSTART.md |
| Why does optimistic locking work? | CONCURRENCY_EXPLANATION.md |
| How should I test? | TESTING.md |
| What's the system architecture? | ARCHITECTURE.md |
| Where are the API endpoints? | server/server.js |
| How is state managed? | App.js |
| How does the seat grid work? | SeatBooking.js |
| Where's the DB config? | server/database.js |
| Where's the schema? | database/schema.sql |

---

**All set! Now you know exactly where everything is! 🎉**
