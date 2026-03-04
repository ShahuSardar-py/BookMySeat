import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AdminPanel.css';

function AdminPanel({ user, onLogout }) {
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    total_seats: 100
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTheaters();
  }, []);

  const fetchTheaters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/theaters', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTheaters(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load theaters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_seats' ? parseInt(value) : value
    }));
  };

  const handleSubmitTheater = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.name || !formData.city || formData.total_seats <= 0) {
      setFormError('All fields are required and seats must be > 0');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post('/api/admin/theaters', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFormSuccess(response.data.message || 'Theater created successfully!');
      setFormData({ name: '', city: '', total_seats: 100 });
      setShowForm(false);

      // Refresh theaters list
      setTimeout(() => {
        fetchTheaters();
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create theater');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTheater = async (theaterId) => {
    if (!window.confirm('Are you sure you want to delete this theater and all its bookings?')) {
      return;
    }

    setDeleting(theaterId);

    try {
      await axios.delete(`/api/admin/theaters/${theaterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTheaters(theaters.filter(t => t.id !== theaterId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete theater');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-title">
          <h1>🎬 Admin Panel</h1>
          <p>Welcome, {user.username}!</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-content">
        <div className="admin-section">
          <div className="section-header">
            <h2>Theaters</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setShowForm(!showForm);
                setFormError('');
                setFormSuccess('');
              }}
            >
              {showForm ? 'Cancel' : '+ New Theater'}
            </button>
          </div>

          {showForm && (
            <div className="theater-form-container">
              <h3>Create New Theater</h3>
              
              {formError && <div className="form-error">{formError}</div>}
              {formSuccess && <div className="form-success">{formSuccess}</div>}

              <form onSubmit={handleSubmitTheater} className="theater-form">
                <div className="form-group">
                  <label>Theater Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Cineplex Downtown"
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g., New York"
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    name="total_seats"
                    value={formData.total_seats}
                    onChange={handleInputChange}
                    min="10"
                    max="500"
                    disabled={submitting}
                    required
                  />
                  <small>Between 10 and 500 seats</small>
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Theater'}
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading theaters...</div>
          ) : theaters.length === 0 ? (
            <div className="no-theaters">
              <p>No theaters yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="theaters-grid">
              {theaters.map(theater => (
                <div key={theater.id} className="theater-card-admin">
                  <div className="theater-card-header">
                    <h3>{theater.name}</h3>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteTheater(theater.id)}
                      disabled={deleting === theater.id}
                      title="Delete theater"
                    >
                      {deleting === theater.id ? '...' : '🗑️'}
                    </button>
                  </div>

                  <div className="theater-card-body">
                    <div className="theater-detail">
                      <span className="label">Location:</span>
                      <span className="value">{theater.city}</span>
                    </div>
                    <div className="theater-detail">
                      <span className="label">Total Seats:</span>
                      <span className="value">{theater.total_seats}</span>
                    </div>
                    <div className="theater-detail">
                      <span className="label">Created by:</span>
                      <span className="value">{theater.created_by_name || 'Unknown'}</span>
                    </div>
                    <div className="theater-detail">
                      <span className="label">Created:</span>
                      <span className="value">
                        {new Date(theater.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
