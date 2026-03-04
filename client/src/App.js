import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import TheaterList from './components/TheaterList';
import SeatBooking from './components/SeatBooking';
import Checkout from './components/Checkout';
import './App.css';

function App() {
  const [authStep, setAuthStep] = useState('login'); // 'login', 'register'
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState('theater'); // theater, booking, checkout
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [reservationToken, setReservationToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setAuthStep('login');
    setCurrentStep('theater');
    setError('');
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setAuthStep('login');
    setCurrentStep('theater');
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setAuthStep('login');
    setCurrentStep('theater');
    setSelectedTheater(null);
    setSelectedSeat(null);
    setReservationToken(null);
    setError('');
  };

  const handleTheaterSelect = (theater) => {
    setSelectedTheater(theater);
    setCurrentStep('booking');
    setError('');
  };

  const handleSeatSelect = (seat) => {
    setSelectedSeat(seat);
    handleReserveSeat(seat);
  };

  const handleReserveSeat = async (seat) => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post('/api/seats/reserve', {
        seatId: seat.id,
        userId: user.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setReservationToken(response.data.reservationToken);
        setCurrentStep('checkout');
      } else {
        setError(response.data.error || 'Failed to reserve seat');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Seat is no longer available - another user took it!');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTheaters = () => {
    setCurrentStep('theater');
    setSelectedTheater(null);
    setSelectedSeat(null);
    setReservationToken(null);
    setError('');
  };

  const handleBackToSeats = () => {
    setCurrentStep('booking');
    setReservationToken(null);
    setError('');
  };

  // Not logged in - show auth pages
  if (!user) {
    return (
      <div className="app">
        {authStep === 'login' ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setAuthStep('register')}
          />
        ) : (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setAuthStep('login')}
          />
        )}
      </div>
    );
  }

  // Admin user - show admin panel
  if (user.role === 'admin') {
    return (
      <div className="app">
        <AdminPanel user={user} onLogout={handleLogout} />
      </div>
    );
  }

  // Regular user - show booking app
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🎬 BookMySeat</h1>
          <p>Theater Seat Booking System</p>
        </div>
        <div className="header-right">
          <span className="user-info">{user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}

        {currentStep === 'theater' && (
          <TheaterList onSelectTheater={handleTheaterSelect} />
        )}

        {currentStep === 'booking' && selectedTheater && (
          <SeatBooking
            theater={selectedTheater}
            userId={user.id}
            onSeatSelect={handleSeatSelect}
            onBack={handleBackToTheaters}
            loading={loading}
          />
        )}

        {currentStep === 'checkout' && reservationToken && (
          <Checkout
            reservationToken={reservationToken}
            userId={user.id}
            onBack={handleBackToSeats}
            onSuccess={handleBackToTheaters}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Concurrency Handled with Optimistic Locking • MySQL InnoDB</p>
      </footer>
    </div>
  );
}

export default App;
