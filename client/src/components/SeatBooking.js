import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/SeatBooking.css';

function SeatBooking({ theater, userId, onSeatSelect, onBack, loading }) {
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeats();
    // Poll for seat updates every 2 seconds
    const interval = setInterval(fetchSeats, 2000);
    return () => clearInterval(interval);
  }, [theater.id]);

  const fetchSeats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/theaters/${theater.id}/seats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSeats(response.data);
    } catch (err) {
      setError('Failed to load seats');
      console.error(err);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status === 'available') {
      setSelectedSeats([seat]); // Only allow single seat selection
      onSeatSelect(seat);
    }
  };

  // Group seats by row
  const seatsByRow = {};
  seats.forEach((seat) => {
    if (!seatsByRow[seat.row_letter]) {
      seatsByRow[seat.row_letter] = [];
    }
    seatsByRow[seat.row_letter].push(seat);
  });

  const rows = Object.keys(seatsByRow).sort();

  if (loadingSeats) {
    return <div className="seat-booking loading">Loading seats...</div>;
  }

  const availableCount = seats.filter((s) => s.status === 'available').length;
  const reservedCount = seats.filter((s) => s.status === 'reserved').length;
  const bookedCount = seats.filter((s) => s.status === 'booked').length;

  return (
    <div className="seat-booking">
      <div className="booking-header">
        <button className="back-btn" onClick={onBack} disabled={loading}>
          ← Back to Theaters
        </button>
        <h2>{theater.name}</h2>
      </div>

      <div className="booking-stats">
        <div className="stat">
          <span className="stat-label">Available</span>
          <span className="stat-value available">{availableCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Reserved</span>
          <span className="stat-value reserved">{reservedCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Booked</span>
          <span className="stat-value booked">{bookedCount}</span>
        </div>
      </div>

      <div className="seats-container">
        <div className="screen-label">SCREEN</div>
        
        <div className="seats-grid">
          {rows.map((row) => (
            <div key={row} className="seat-row">
              <div className="row-label">{row}</div>
              <div className="seats">
                {seatsByRow[row].map((seat) => (
                  <button
                    key={seat.id}
                    className={`seat seat-${seat.status}`}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status !== 'available' || loading}
                    title={`${row}${seat.seat_number} - ${seat.status}`}
                  >
                    {seat.seat_number}
                  </button>
                ))}
              </div>
              <div className="row-label">{row}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-seat seat-available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat seat-reserved"></div>
          <span>Reserved</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat seat-booked"></div>
          <span>Booked</span>
        </div>
      </div>

      {loading && <div className="loading-overlay">Processing your reservation...</div>}
    </div>
  );
}

export default SeatBooking;
