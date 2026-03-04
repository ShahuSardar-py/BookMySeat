import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Checkout.css';

function Checkout({ reservationToken, userId, onBack, onSuccess }) {
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookingDetails();
  }, [reservationToken]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/bookings/${reservationToken}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookingDetails(response.data);
    } catch (err) {
      setError('Failed to load booking details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    setProcessing(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post('/api/bookings/process-payment', {
        reservationToken,
        userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPaymentResult(response.data);

      if (response.data.success) {
        // Delay success navigation for UX
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment processing failed');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      const token = localStorage.getItem('token');
      try {
        await axios.post('/api/bookings/cancel', {
          reservationToken,
          userId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onBack();
      } catch (err) {
        setError('Failed to cancel reservation');
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="checkout loading">Loading booking details...</div>;
  }

  if (!bookingDetails) {
    return <div className="checkout error">Unable to load booking details</div>;
  }

  const { seat_number, row_letter, theater_name } = bookingDetails;

  return (
    <div className="checkout">
      {error && <div className="error-message">{error}</div>}

      {!paymentResult ? (
        <div className="checkout-content">
          <h2>Complete Your Booking</h2>

          <div className="booking-summary">
            <h3>Booking Summary</h3>
            <div className="summary-items">
              <div className="summary-item">
                <span className="label">Theater</span>
                <span className="value">{theater_name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Seat</span>
                <span className="value seat-display">
                  {row_letter}
                  {seat_number}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Reservation Token</span>
                <span className="value token">{reservationToken.substring(0, 12)}...</span>
              </div>
            </div>
          </div>

          <div className="pricing">
            <div className="price-item">
              <span>Ticket Price</span>
              <span>$15.00</span>
            </div>
            <div className="price-item">
              <span>Convenience Fee</span>
              <span>$2.00</span>
            </div>
            <div className="price-total">
              <span>Total Amount</span>
              <span>$17.00</span>
            </div>
          </div>

          <div className="payment-info">
            <h4>Payment Information</h4>
            <p className="info-text">
              This is a simulated payment. Your payment will be processed securely.
            </p>
            <p className="info-note">
              📝 <strong>Note:</strong> The system has a 70% payment success rate for testing purposes.
            </p>
          </div>

          <div className="checkout-actions">
            <button
              className="btn btn-cancel"
              onClick={handleCancel}
              disabled={processing}
            >
              Cancel Reservation
            </button>
            <button
              className="btn btn-pay"
              onClick={handleProcessPayment}
              disabled={processing}
            >
              {processing ? 'Processing Payment...' : 'Process Payment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="payment-result">
          {paymentResult.success ? (
            <div className="success-state">
              <div className="success-icon">✓</div>
              <h2>Payment Successful!</h2>
              <p className="result-message">{paymentResult.message}</p>
              <div className="confirmation-details">
                <div className="detail-item">
                  <span className="detail-label">Payment ID</span>
                  <span className="detail-value">{paymentResult.paymentId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Seat Location</span>
                  <span className="detail-value">
                    {row_letter}
                    {seat_number}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Theater</span>
                  <span className="detail-value">{theater_name}</span>
                </div>
              </div>
              <p className="redirect-message">Redirecting to home page...</p>
            </div>
          ) : (
            <div className="failure-state">
              <div className="failure-icon">✕</div>
              <h2>Payment Failed</h2>
              <p className="result-message">{paymentResult.message}</p>
              <div className="failure-info">
                <p>Your reservation has been automatically cancelled and the seat is now available for other users.</p>
              </div>
              <button className="btn btn-back" onClick={onBack}>
                Back to Seat Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Checkout;
