# Installation Checklist & Verification Steps

## ✅ Pre-Installation Checklist

Before you start, verify you have:

- [ ] MySQL 8.0+ installed and running
- [ ] Node.js 14+ installed
- [ ] npm installed
- [ ] Port 3000 available (frontend)
- [ ] Port 5000 available (backend)
- [ ] Text editor/IDE (VS Code recommended)

### Check Prerequisites

```bash
# Check MySQL
mysql --version
mysql -u root -p  # Login and exit with Ctrl+D

# Check Node.js
node --version

# Check npm
npm --version
```

---

## 📦 Installation Steps

### Step 1: Setup Database

```bash
# Navigate to project
cd bookmyshow

# Initialize database with schema
mysql -u root -p < database/schema.sql

# Verify database created
mysql -u root -p -e "USE theater_booking; SHOW TABLES;"
```

**Expected Output:**
```
+---------------------------+
| Tables_in_theater_booking |
+---------------------------+
| bookings                  |
| seats                     |
| theaters                  |
+---------------------------+
```

### Step 2: Setup Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start server
npm start
```

**Expected Output:**
```
Server running on port 5000
Theater Booking API with Optimistic Locking
```

**Do NOT close this terminal!** Leave it running.

### Step 3: Setup Frontend (New Terminal)

```bash
# Navigate to client directory
cd client

# Install dependencies  
npm install

# Start React app
npm start
```

**Expected Output:**
```
webpack compiled successfully
Compiled successfully!

You can now view theater-booking-client in the browser.
  Local:            http://localhost:3000
  On Your Network:  http://192.168.X.X:3000

Press q to quit.
```

**Browser will open automatically at `http://localhost:3000`**

---

## ✅ Post-Installation Verification

### Verify Backend is Running

```bash
# In new terminal, test API health check
curl http://localhost:5000/api/health

# Expected output
{"status":"ok"}
```

### Verify Database Connection

```bash
# Check if theaters are in database
mysql -u root -p theater_booking -e "SELECT * FROM theaters;"

# Expected output
+----+----------------+-----------+--------------+---------------------+
| id | name           | city      | total_seats  | created_at          |
+----+----------------+-----------+--------------+---------------------+
| 1  | Cineplex Plaza | New York  | 100          | 2024-XX-XX XX:XX:XX |
| 2  | Galaxy Cinemas | Los Angeles | 120        | 2024-XX-XX XX:XX:XX |
| 3  | Metro Theatre  | Chicago   | 80           | 2024-XX-XX XX:XX:XX |
+----+----------------+-----------+--------------+---------------------+
```

### Verify Frontend is Running

- Browser should show: **🎬 BookMySeat**
- You should see three theater cards
- Each theater shows seat count

---

## 🧪 Quick Functional Test

### Test 1: Load Theater List (3 minutes)

1. Frontend should show 3 theaters:
   - ✅ Cineplex Plaza
   - ✅ Galaxy Cinemas
   - ✅ Metro Theatre

2. Click "Select Theater →" button
3. Should see seat grid (10×10 grid for Cineplex Plaza)
4. **Expected**: Green seats (available), no red/yellow yet

### Test 2: Single Seat Booking (5 minutes)

1. Click any green seat
2. Should redirect to "Complete Your Booking" page
3. Should show:
   - Theater name ✅
   - Seat location (e.g., A1) ✅
   - Price breakdown ✅
4. Click "Process Payment"
5. Should show either:
   - ✅ "Payment Successful! Your seat is now booked"
   - ❌ "Payment failed. Your reservation has been released."
6. Redirects back to theater list

### Test 3: Concurrent Booking (7 minutes)

1. **Open 2 browser tabs** with `http://localhost:3000`
2. Both select same theater (Cineplex Plaza)
3. Both see same seat grid
4. **Tab 1**: Click seat A1 → Redirects to payment
5. **Tab 2**: Click seat A1 → Should show error: "Seat is no longer available" ✅
6. This confirms optimistic locking works!

---

## 📋 Verification Checklist

After installation, verify:

### Frontend
- [ ] Browser loads at `http://localhost:3000`
- [ ] Page title shows "🎬 BookMySeat"
- [ ] Three theaters displayed (Cineplex, Galaxy, Metro)
- [ ] Can click theater and see seat grid
- [ ] Seats show green/yellow/red correctly
- [ ] User ID displayed at top

### Backend
- [ ] Terminal shows "Server running on port 5000"
- [ ] `curl http://localhost:5000/api/health` returns `{"status":"ok"}`
- [ ] No error messages in backend terminal
- [ ] API responds to requests

### Database
- [ ] `theater_booking` database exists
- [ ] Tables: `theaters`, `seats`, `bookings` exist
- [ ] 3 theaters with sample data present
- [ ] 300 total seats created (100+120+80)
- [ ] All seats have `status='available'` and `version=1`

### Concurrency Control
- [ ] Two simultaneous bookings on same seat show conflict ✅
- [ ] Error message appears: "Seat is no longer available"
- [ ] Seat status updates in both tabs
- [ ] Version column increments correctly

---

## 🐛 Common Issues & Fixes

### Issue 1: MySQL Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Fix:**
```bash
# Check MySQL is running
mysql -u root -p

# If not running, start MySQL
# macOS (with Homebrew)
brew services start mysql

# Windows (cmd as admin)
net start MySQL80

# Linux
sudo systemctl start mysql
```

### Issue 2: Database Not Found

**Error:**
```
Error: Unknown database 'theater_booking'
```

**Fix:**
```bash
# Re-import schema
mysql -u root -p < database/schema.sql

# Verify it worked
mysql -u root -p -e "SHOW DATABASES;" | grep theater_booking
```

### Issue 3: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE :::5000
```

**Fix:**
```bash
# Find process on port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Try again
npm start
```

### Issue 4: MySQL credentials wrong

**Error:**
```
Error: Access denied for user 'root'@'localhost'
```

**Fix:**
1. Edit `server/database.js`
2. Find the pool configuration section
3. Update `user` and `password` to your MySQL credentials:
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'your_mysql_user',      // ← Update
  password: 'your_mysql_password',  // ← Update
  database: 'theater_booking',
  // ... rest stays the same
});
```

### Issue 5: React won't compile

**Error:**
```
'react-scripts' is not recognized
```

**Fix:**
```bash
cd client
npm install
npm start

# If still issues
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 🚀 Verify Concurrency Works

### Manual Concurrency Test

```bash
# Terminal 1 - Start backend
cd server
npm start

# Terminal 2 - Start frontend
cd client
npm start

# Browser 1: Open http://localhost:3000
# Browser 2: Open http://localhost:3000

# Both: Select Cineplex Plaza
# Both: Click on seat A1 at the SAME TIME (within 1-2 seconds)

# Expected:
# Browser 1: ✅ Success → Redirects to payment
# Browser 2: ❌ Error "Seat is no longer available"
```

### Database Verification

```bash
# While tests running, check database in new terminal

# See seat status updates
watch -n 1 'mysql -u root -p theater_booking -e "SELECT id, seat_number, status, version FROM seats WHERE id=1;"'

# See booking records  
mysql -u root -p -e "SELECT * FROM theater_booking.bookings;"
```

---

## 📊 System Status Checks

### All Running Successfully?

```bash
# Quick health check script
echo "=== Backend Health ==="
curl -s http://localhost:5000/api/health

echo -e "\n=== Database Status ==="
mysql -u root -p theater_booking -e "SELECT COUNT(*) as total_seats FROM seats;"

echo -e "\n=== Theaters ==="
mysql -u root -p theater_booking -e "SELECT name, total_seats FROM theaters;"

echo -e "\nAll systems operational! ✅"
```

### Expected Output:
```
=== Backend Health ===
{"status":"ok"}

=== Database Status ===
+------+
| total_seats |
+------+
| 300  |
+------+

=== Theaters ===
+-----------------+-----+
| name            | total_seats |
+-----------------+-----+
| Cineplex Plaza  | 100 |
| Galaxy Cinemas  | 120 |
| Metro Theatre   | 80  |
+-----------------+-----+

All systems operational! ✅
```

---

## 🎯 Next: Testing Concurrency

Now that everything is installed, proceed to **TESTING.md** for:
- Detailed test scenarios
- Concurrency validation
- Edge case testing
- Load testing guide

---

## 📞 Still Issues?

1. Check **README.md** - Comprehensive troubleshooting section
2. Check **QUICKSTART.md** - Fast setup guide
3. Review **ARCHITECTURE.md** - System design details
4. Verify MySQL/Node versions with `--version`
5. Check terminal for error messages
6. Review server logs for database errors

---

## ✅ Installation Complete!

Once all checks pass:
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000  
- ✅ Database initialized with sample data
- ✅ Concurrency control verified
- ✅ Ready for testing and development!

**Next Step**: Go to **TESTING.md** to validate concurrency handling! 🚀
