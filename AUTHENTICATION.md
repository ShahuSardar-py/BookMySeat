# Authentication & Admin Panel Update

## New Features Added

### 1. User Authentication System
- User login and registration
- JWT token-based authentication
- Password hashing with bcrypt
- Persistent authentication (stored in localStorage)

### 2. Admin Panel
- Admin users can create new theaters
- Admin users can view all theaters with details
- Admin users can delete theaters (and all associated bookings/seats)
- Admin users can edit theater information

### 3. Role-Based Access Control
- **User Role**: Can browse theaters, select seats, and complete bookings
- **Admin Role**: Can manage theaters (create, read, update, delete)

---

## Demo Accounts

### For Testing

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin_user` | `password123` | Admin | Create/manage theaters |
| `john_doe` | `password123` | User | Book seats |
| `jane_smith` | `password123` | User | Book seats |

**Password Hash**: All demo accounts use the same bcrypt hash for easy testing.

---

## Database Changes

### New Table: `users`

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Updated: `theaters` Table

Added `created_by` column to track which admin created the theater:
```sql
ALTER TABLE theaters ADD COLUMN created_by INT;
ALTER TABLE theaters ADD CONSTRAINT fk_theaters_users 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
```

---

## API Changes

### New Authentication Endpoints

#### Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "new_user",
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "success": true,
  "user": {...},
  "token": "jwt_token_here"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin_user",
  "password": "password123"
}

Response: {
  "success": true,
  "user": {...},
  "token": "jwt_token_here"
}
```

#### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer jwt_token_here

Response: {
  "id": 1,
  "username": "admin_user",
  "email": "admin@bookmyseat.com",
  "role": "admin"
}
```

### Admin Endpoints

#### Get All Theaters (Admin Only)
```bash
GET /api/admin/theaters
Authorization: Bearer admin_token

Response: [
  {
    "id": 1,
    "name": "Cineplex Plaza",
    "city": "New York",
    "total_seats": 100,
    "created_by": 1,
    "created_by_name": "admin_user",
    "created_at": "2024-03-04T10:00:00Z"
  },
  ...
]
```

#### Create Theater (Admin Only)
```bash
POST /api/admin/theaters
Authorization: Bearer admin_token
Content-Type: application/json

{
  "name": "New Cinema",
  "city": "Boston",
  "total_seats": 150
}

Response: {
  "success": true,
  "theater": {
    "id": 4,
    "name": "New Cinema",
    "city": "Boston",
    "total_seats": 150,
    "seats_created": 150
  },
  "message": "Theater 'New Cinema' created with 150 seats"
}
```

#### Delete Theater (Admin Only)
```bash
DELETE /api/admin/theaters/:theaterId
Authorization: Bearer admin_token

Response: {
  "success": true
}
```

#### Update Theater (Admin Only)
```bash
PUT /api/admin/theaters/:theaterId
Authorization: Bearer admin_token
Content-Type: application/json

{
  "name": "Updated Name",
  "city": "Updated City"
}

Response: {
  "success": true,
  "message": "Theater updated successfully"
}
```

### Updated Booking Endpoints

All booking endpoints now require JWT authentication:

#### Reserve Seat
```bash
POST /api/seats/reserve
Authorization: Bearer user_token

Request: {
  "seatId": 5
}

Response: {
  "success": true,
  "reservationToken": "uuid-token",
  "bookingId": 1
}
```

#### Process Payment
```bash
POST /api/bookings/process-payment
Authorization: Bearer user_token

Request: {
  "reservationToken": "uuid-token"
}
```

#### Get Booking Details
```bash
GET /api/bookings/:reservationToken
Authorization: Bearer user_token
```

#### Cancel Reservation
```bash
POST /api/bookings/cancel
Authorization: Bearer user_token

Request: {
  "reservationToken": "uuid-token"
}
```

---

## Frontend Changes

### New Components

1. **Login.js** - Login page with demo account options
2. **Register.js** - Registration page for new users
3. **AdminPanel.js** - Admin management interface for theaters

### Updated Components

1. **App.js** - Added authentication state and routing logic
2. **Checkout.js** - Updated to use JWT tokens
3. **App.css** - Added styles for logout button and user info

### New Styles

1. **Auth.css** - Styling for login/registration pages
2. **AdminPanel.css** - Styling for admin panel UI

---

## How Authentication Works

### User Flow

```
1. User opens app
   ↓
2. Check localStorage for stored token
   ├─ Token exists → Skip to step 5
   └─ No token → Go to step 3
   ↓
3. Show Login/Register page
   ├─ User creates account → Register
   └─ User logs in → Login
   ↓
4. Validate credentials with backend
   ├─ Success → Generate JWT token
   └─ Failure → Show error
   ↓
5. Store token in localStorage
   └─ Store user info in localStorage
   ↓
6. Redirect to appropriate dashboard
   ├─ If role='admin' → AdminPanel
   └─ If role='user' → TheaterList
```

### Token Storage

Tokens are stored in browser `localStorage`:
- **Token**: `localStorage.getItem('token')`
- **User Info**: `localStorage.getItem('user')`

Tokens are included in requests via `Authorization` header:
```javascript
headers: { Authorization: `Bearer ${token}` }
```

### Session Duration

- **Token Expiration**: 24 hours
- **Logout**: Clears localStorage and resets state

---

## Server Dependencies Added

```json
{
  "dependencies": {
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

---

## Installation & Setup

### 1. Update Database
```bash
mysql -u root -p < database/schema.sql
```

This will:
- Create `users` table
- Add demo accounts (admin_user, john_doe, jane_smith)
- Update `theaters` table with `created_by` column

### 2. Install New Dependencies
```bash
cd server
npm install  # Installs bcrypt and jsonwebtoken

cd ../client
npm install  # Already has necessary dependencies
```

### 3. Start the Application
```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend
cd client && npm start
```

---

## Testing the New Features

### Test Admin Functions

1. Login with `admin_user` / `password123`
2. You'll see Admin Panel instead of TheaterList
3. Click "+ New Theater" to create a theater
4. Fill in theater details:
   - Name: "Your Theater Name"
   - City: "Your City"
   - Seats: 100-300
5. Click "Create Theater"
6. New theater appears in the grid
7. Click trash icon to delete theater

### Test User Functions

1. Login with `john_doe` / `password123`
2. You'll see TheaterList with available theaters
3. Select a theater to see seats
4. Click a green (available) seat
5. Complete payment flow
6. Green seat changes to red (booked) after payment

### Test Registration

1. Click "Register here" on login page
2. Fill in new account details
3. New user account is created with 'user' role
4. Automatically logs in after registration
5. New user can start booking seats

---

## Security Notes

### Current Implementation (Development)

⚠️ **For Development Only** - The current setup is suitable for:
- Local testing
- Demo purposes
- Development environment

### Production Considerations

For production deployment, implement:

1. **HTTPS/TLS** - Encrypt all connections
2. **Environment Variables** - Move secrets to `.env` file
3. **Password Requirements** - Enforce stronger passwords (min 12 chars, uppercase, numbers, symbols)
4. **Rate Limiting** - Prevent brute force login attempts
5. **CORS Configuration** - Restrict origins to your domain
6. **Token Refresh** - Implement refresh token rotation
7. **Account Lockout** - Lock accounts after failed login attempts
8. **Audit Logging** - Log all admin actions
9. **SQL Injection Prevention** - All queries already use parameterized statements ✅
10. **CSRF Protection** - Add CSRF tokens for state-changing operations

---

## Environment Variables

Create `.env` file in server directory:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=theater_booking

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_here

# Payment (for testing)
PAYMENT_SUCCESS_RATE=0.7
```

---

## Troubleshooting

### "Invalid token" Error

**Cause**: Token has expired or is malformed
**Solution**: 
- Clear localStorage and login again
- Check token is being sent correctly in headers

### "Admin access required" Error

**Cause**: Logged in user doesn't have admin role
**Solution**:
- Login with admin account (`admin_user`)
- Or ask admin to promote your account (admin function)

### "Username already exists" Error

**Cause**: That username is already registered
**Solution**:
- Choose a different username
- Or login if you already have an account

### Bcrypt "No such file" Error

**Cause**: Dependencies not installed
**Solution**:
```bash
cd server
npm install
```

---

## Summary of Changes

| Component | Type | Change |
|-----------|------|--------|
| Database Schema | New | `users` table added |
| API Endpoints | New | 6 auth/admin endpoints added |
| Backend | Modified | Authentication middleware added |
| Frontend Components | New | Login, Register, AdminPanel |
| Frontend Styling | New | Auth.css, AdminPanel.css |
| App Flow | Modified | Added auth routing logic |

---

**Authentication and admin features are now fully integrated!** 🎉

Start with login/registration, then explore admin panel or start booking seats! 🎬
