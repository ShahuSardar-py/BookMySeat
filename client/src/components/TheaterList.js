import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/TheaterList.css';

function TheaterList({ onSelectTheater }) {
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTheaters();
  }, []);

  const fetchTheaters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/theaters');
      setTheaters(response.data);
    } catch (err) {
      setError('Failed to load theaters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="theater-list loading">Loading theaters...</div>;
  }

  if (error) {
    return <div className="theater-list error">{error}</div>;
  }

  return (
    <div className="theater-list">
      <h2>Select a Theater</h2>
      
      {theaters.length === 0 ? (
        <p>No theaters available</p>
      ) : (
        <div className="theater-grid">
          {theaters.map((theater) => (
            <div
              key={theater.id}
              className="theater-card"
              onClick={() => onSelectTheater(theater)}
            >
              <div className="theater-icon">🎬</div>
              <h3>{theater.name}</h3>
              <p className="theater-info">
                <span className="city">{theater.city}</span>
              </p>
              <p className="seats-info">
                <span className="seat-count">{theater.total_seats} Seats</span>
              </p>
              <button className="select-btn">Select Theater →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TheaterList;
