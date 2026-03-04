const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getConnection, executeTransaction, query } = require('./database');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  verifyAdmin
} = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ===========================
// AUTHENTICATION ENDPOINTS
// ===========================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, 'user']
    );

    // Generate token
    const token = generateToken({
      id: result.insertId,
      username,
      role: 'user'
    });

    res.json({
      success: true,
      user: { id: result.insertId, username, email, role: 'user' },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const users = await query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ===========================
// ADMIN PANEL ENDPOINTS
// ===========================

// Get all theaters (admin only)
app.get('/api/admin/theaters', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const theaters = await query(
      `SELECT t.*, u.username as created_by_name
       FROM theaters t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(theaters);
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({ error: 'Failed to fetch theaters' });
  }
});

// Create new theater (admin only)
app.post('/api/admin/theaters', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, city, total_seats } = req.body;

    if (!name || !city || !total_seats) {
      return res.status(400).json({ error: 'Name, city, and total_seats are required' });
    }

    // Check if theater name already exists
    const existing = await query(
      'SELECT id FROM theaters WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Theater name already exists' });
    }

    const result = await executeTransaction(async (connection) => {
      // Insert theater
      const [theaterResult] = await connection.execute(
        'INSERT INTO theaters (name, city, total_seats, created_by) VALUES (?, ?, ?, ?)',
        [name, city, total_seats, req.user.id]
      );

      const theaterId = theaterResult.insertId;

      // Create seats for the theater
      const seats = [];
      let seatIndex = 0;

      for (let row = 0; row < Math.ceil(total_seats / 10); row++) {
        const rowLetter = String.fromCharCode(65 + row); // A, B, C, etc.
        for (let col = 1; col <= 10 && seatIndex < total_seats; col++) {
          seats.push([theaterId, col.toString(), rowLetter, 'available']);
          seatIndex++;
        }
      }

      // Insert all seats
      for (const seat of seats) {
        await connection.execute(
          'INSERT INTO seats (theater_id, seat_number, row_letter, status) VALUES (?, ?, ?, ?)',
          seat
        );
      }

      return {
        id: theaterId,
        name,
        city,
        total_seats,
        seats_created: seats.length
      };
    });

    res.json({
      success: true,
      theater: result,
      message: `Theater "${name}" created with ${result.seats_created} seats`
    });
  } catch (error) {
    console.error('Error creating theater:', error);
    res.status(500).json({ error: 'Failed to create theater' });
  }
});

// Delete theater (admin only)
app.delete('/api/admin/theaters/:theaterId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { theaterId } = req.params;

    const result = await executeTransaction(async (connection) => {
      // Check if theater exists
      const [theaters] = await connection.execute(
        'SELECT id FROM theaters WHERE id = ?',
        [theaterId]
      );

      if (theaters.length === 0) {
        throw new Error('Theater not found');
      }

      // Delete all bookings for this theater's seats
      await connection.execute(
        `DELETE FROM bookings WHERE seat_id IN
         (SELECT id FROM seats WHERE theater_id = ?)`,
        [theaterId]
      );

      // Delete all seats for this theater
      await connection.execute(
        'DELETE FROM seats WHERE theater_id = ?',
        [theaterId]
      );

      // Delete theater
      await connection.execute(
        'DELETE FROM theaters WHERE id = ?',
        [theaterId]
      );

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    console.error('Error deleting theater:', error);
    res.status(500).json({ error: error.message || 'Failed to delete theater' });
  }
});

// Update theater (admin only)
app.put('/api/admin/theaters/:theaterId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { theaterId } = req.params;
    const { name, city } = req.body;

    if (!name || !city) {
      return res.status(400).json({ error: 'Name and city are required' });
    }

    // Update theater
    const [result] = await getConnection().then(conn => {
      const promise = conn.execute(
        'UPDATE theaters SET name = ?, city = ? WHERE id = ?',
        [name, city, theaterId]
      );
      conn.release();
      return promise;
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Theater not found' });
    }

    res.json({ success: true, message: 'Theater updated successfully' });
  } catch (error) {
    console.error('Error updating theater:', error);
    res.status(500).json({ error: 'Failed to update theater' });
  }
});

// ===========================

// Get all theaters
app.get('/api/theaters', async (req, res) => {
  try {
    const theaters = await query('SELECT * FROM theaters', []);
    res.json(theaters);
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({ error: 'Failed to fetch theaters' });
  }
});

// Get specific theater details
app.get('/api/theaters/:theaterId', async (req, res) => {
  try {
    const { theaterId } = req.params;
    const theaters = await query('SELECT * FROM theaters WHERE id = ?', [theaterId]);
    
    if (theaters.length === 0) {
      return res.status(404).json({ error: 'Theater not found' });
    }
    
    res.json(theaters[0]);
  } catch (error) {
    console.error('Error fetching theater:', error);
    res.status(500).json({ error: 'Failed to fetch theater' });
  }
});

// ===========================
// SEATS ENDPOINTS
// ===========================

// Get seats for a theater
app.get('/api/theaters/:theaterId/seats', async (req, res) => {
  try {
    const { theaterId } = req.params;
    
    const seats = await query(
      `SELECT id, seat_number, row_letter, status, version 
       FROM seats 
       WHERE theater_id = ? 
       ORDER BY row_letter, seat_number`,
      [theaterId]
    );
    
    res.json(seats);
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

// ===========================
// BOOKING ENDPOINTS
// ===========================

/**
 * STEP 1: Reserve a seat (optimistic locking)
 * 
 * This endpoint attempts to reserve a seat using optimistic locking.
 * Requires authentication
 */
app.post('/api/seats/reserve', verifyToken, async (req, res) => {
  try {
    const { seatId } = req.body;
    const userId = req.user.id; // Get from authenticated user

    const result = await executeTransaction(async (connection) => {
      // Step 1: Get current seat details
      const [seats] = await connection.execute(
        'SELECT id, status, version FROM seats WHERE id = ? FOR UPDATE',
        [seatId]
      );

      if (seats.length === 0) {
        throw new Error('Seat not found');
      }

      const seat = seats[0];

      // If seat is already booked, fail
      if (seat.status === 'booked') {
        throw new Error('Seat is already booked');
      }

      // If seat is already reserved by someone else, fail
      if (seat.status === 'reserved') {
        throw new Error('Seat is already reserved');
      }

      // Step 2: Attempt to reserve using optimistic locking
      // Update only if status is 'available' and version matches
      const [updateResult] = await connection.execute(
        `UPDATE seats 
         SET status = 'reserved', version = version + 1, reserved_by = ?, updated_at = NOW()
         WHERE id = ? AND status = 'available' AND version = ?`,
        [userId, seatId, seat.version]
      );

      // If no rows were updated, optimistic lock failed
      if (updateResult.affectedRows === 0) {
        throw new Error('Seat no longer available - reservation failed');
      }

      // Step 3: Create booking record with reservation token
      const reservationToken = uuidv4();
      const [bookingResult] = await connection.execute(
        `INSERT INTO bookings (seat_id, user_id, reservation_token, status)
         VALUES (?, ?, ?, 'reserved')`,
        [seatId, userId, reservationToken]
      );

      return {
        success: true,
        reservationToken,
        bookingId: bookingResult.insertId,
        message: 'Seat reserved successfully'
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error reserving seat:', error);
    res.status(409).json({ 
      error: error.message || 'Failed to reserve seat',
      success: false 
    });
  }
});

/**
 * STEP 2: Process payment (simulated)
 * 
 * Requires authentication
 */
app.post('/api/bookings/process-payment', verifyToken, async (req, res) => {
  try {
    const { reservationToken } = req.body;
    const userId = req.user.id;

    // Step 1: Get booking details (read-only, no transaction yet)
    const bookings = await query(
      `SELECT b.id, b.seat_id, b.status, s.id as seat_id_check
       FROM bookings b
       JOIN seats s ON b.seat_id = s.id
       WHERE b.reservation_token = ? AND b.user_id = ? AND b.status = 'reserved'`,
      [reservationToken, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Reservation not found or already processed' });
    }

    const booking = bookings[0];
    const seatId = booking.seat_id;

    // Step 2: Simulate payment (this happens outside transaction)
    const paymentId = 'PAY_' + uuidv4().substring(0, 8);
    
    // Simulate payment processing (70% success rate for testing)
    const paymentSuccess = Math.random() < 0.7;
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate payment delay

    // Step 3: Update booking status based on payment result (within transaction)
    const result = await executeTransaction(async (connection) => {
      if (paymentSuccess) {
        // Payment successful: mark seat as booked
        const [updateSeat] = await connection.execute(
          `UPDATE seats 
           SET status = 'booked', version = version + 1, reserved_by = NULL, booked_by = ?, updated_at = NOW()
           WHERE id = ? AND status = 'reserved'`,
          [userId, seatId]
        );

        if (updateSeat.affectedRows === 0) {
          throw new Error('Seat state changed - payment cannot be completed');
        }

        // Update booking status
        await connection.execute(
          `UPDATE bookings 
           SET status = 'payment_success', payment_id = ?, booked_at = NOW()
           WHERE id = ?`,
          [paymentId, booking.id]
        );

        return {
          success: true,
          paymentId,
          status: 'payment_success',
          message: 'Payment successful! Your seat is now booked.'
        };
      } else {
        // Payment failed: release the reservation
        const [updateSeat] = await connection.execute(
          `UPDATE seats 
           SET status = 'available', version = version + 1, reserved_by = NULL, updated_at = NOW()
           WHERE id = ? AND status = 'reserved'`,
          [seatId]
        );

        if (updateSeat.affectedRows === 0) {
          throw new Error('Could not release seat reservation');
        }

        // Update booking status
        await connection.execute(
          `UPDATE bookings 
           SET status = 'payment_failed', payment_id = ?
           WHERE id = ?`,
          [paymentId, booking.id]
        );

        return {
          success: false,
          paymentId,
          status: 'payment_failed',
          message: 'Payment failed. Your reservation has been released.'
        };
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process payment',
      success: false 
    });
  }
});

// Get booking details
app.get('/api/bookings/:reservationToken', verifyToken, async (req, res) => {
  try {
    const { reservationToken } = req.params;
    
    const bookings = await query(
      `SELECT b.id, b.seat_id, b.user_id, b.status, b.payment_id, 
              b.reserved_at, b.booked_at, 
              s.seat_number, s.row_letter, t.name as theater_name
       FROM bookings b
       JOIN seats s ON b.seat_id = s.id
       JOIN theaters t ON s.theater_id = t.id
       WHERE b.reservation_token = ?`,
      [reservationToken]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(bookings[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Cancel reservation
app.post('/api/bookings/cancel', verifyToken, async (req, res) => {
  try {
    const { reservationToken } = req.body;
    const userId = req.user.id;
    
    if (!reservationToken) {
      return res.status(400).json({ error: 'reservationToken is required' });
    }

    const result = await executeTransaction(async (connection) => {
      // Get booking details
      const [bookings] = await connection.execute(
        `SELECT id, seat_id, status FROM bookings 
         WHERE reservation_token = ? AND user_id = ? AND status = 'reserved'`,
        [reservationToken, userId]
      );

      if (bookings.length === 0) {
        throw new Error('Reservation not found or already processed');
      }

      const booking = bookings[0];
      const seatId = booking.seat_id;

      // Release the seat
      await connection.execute(
        `UPDATE seats 
         SET status = 'available', version = version + 1, reserved_by = NULL, updated_at = NOW()
         WHERE id = ?`,
        [seatId]
      );

      // Update booking status
      await connection.execute(
        `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
        [booking.id]
      );

      return { success: true, message: 'Reservation cancelled' };
    });

    res.json(result);
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(409).json({ 
      error: error.message || 'Failed to cancel reservation',
      success: false 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Theater Booking API with Optimistic Locking`);
});
