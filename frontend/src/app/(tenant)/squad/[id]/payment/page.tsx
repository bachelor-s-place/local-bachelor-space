'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuth } from '@/context/AuthContext';
import styles from '@/app/login/page.module.css';

// Razorpay type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentPage() {
  useAuthGuard();
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [squad, setSquad] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [property, setProperty] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);

  const [paymentModel, setPaymentModel] = useState<'leader_pays_all' | 'split_evenly'>('leader_pays_all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false); // received but not yet confirmed by backend
  const [polling, setPolling] = useState(false);

  // Cancellation flag so polling stops (and no setState fires) after unmount/navigation.
  const cancelledRef = useRef(false);
  // Guards against a rapid double-click firing handlePayment twice (which would create
  // two Razorpay orders) before React re-renders and disables the button.
  const submittingRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  // Dynamically load the Razorpay checkout script
  useEffect(() => {
    if (window.Razorpay) { setRazorpayReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => setError('Failed to load payment SDK. Please refresh and try again.');
    document.body.appendChild(script);
    return () => {
      // Only remove if it's still attached — avoids throwing if already gone.
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const squadRes = await apiFetch(`/squads/${id}`);
        // API returns { data: { squad: {...}, members: [...], proposals: [...] } }
        const sq = squadRes.data?.squad ?? squadRes.data;
        const mem = squadRes.data?.members ?? [];
        setSquad(sq);
        setMembers(mem);

        if (sq?.property_id) {
          const propRes = await apiFetch(`/properties/${sq.property_id}`);
          setProperty(propRes.data);

          if (propRes.data.property_type === 'pg') {
            const roomsRes = await apiFetch(`/properties/${sq.property_id}/rooms`);
            setRooms(roomsRes.data || []);
            if (roomsRes.data?.length > 0) {
              setSelectedRoomId(roomsRes.data[0].id);
            }
          }
        }
        if (sq?.status === 'locked' || sq?.status === 'moved_in') {
          setPaymentSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Poll squad status until 'locked' — the backend only locks once the webhook
  // has verified the captured payment. We NEVER assume success on timeout.
  const pollForLock = useCallback(async () => {
    setPaymentPending(false);
    setPolling(true);
    const MAX_POLLS = 10;
    const INTERVAL_MS = 3000;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, INTERVAL_MS));
      if (cancelledRef.current) return;
      try {
        const res = await apiFetch(`/squads/${id}`);
        if (cancelledRef.current) return;
        const sq = res.data?.squad ?? res.data;
        if (sq?.status === 'locked') {
          setPaymentSuccess(true);
          setPolling(false);
          return;
        }
      } catch { /* transient error — keep polling */ }
    }
    if (cancelledRef.current) return;
    // Timed out WITHOUT backend confirmation. Do not claim the property is secured —
    // the payment may still be settling, or it may have failed. Show a pending state.
    setPaymentPending(true);
    setPolling(false);
  }, [id]);

  // One-shot status re-check for the "Check again" button on the pending screen.
  const recheckStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/squads/${id}`);
      const sq = res.data?.squad ?? res.data;
      if (sq?.status === 'locked') {
        setPaymentPending(false);
        setPaymentSuccess(true);
      }
    } catch { /* leave pending state as-is */ }
  }, [id]);

  // Calculate token amount
  let baseRent = property?.rent_amount || 0;
  if (property?.property_type === 'pg' && selectedRoomId) {
    const room = rooms.find(r => r.id === selectedRoomId);
    if (room) baseRent = room.rent_amount;
  }

  const tokenPercentage = property?.token_percentage || 5;
  const tokenAmount = (baseRent * tokenPercentage) / 100;
  const memberCount = squad?.current_member_count || 1;
  const memberShare = tokenAmount / memberCount;

  // Derived: is current user the squad leader?
  const isLeader = members.some(
    (m: any) => m.user_id === user?.id && m.role === 'leader'
  );

  const handlePayment = async () => {
    if (!razorpayReady) {
      setError('Payment SDK is not loaded yet. Please wait a moment and try again.');
      return;
    }
    // Idempotency guard: ignore re-entrant clicks while a submission is in flight.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setProcessing(true);

    try {
      const payload: any = { payment_model: paymentModel };
      if (property?.property_type === 'pg') {
        if (!selectedRoomId) throw new Error('Please select a room.');
        payload.room_id = selectedRoomId;
      }

      const res = await apiFetch(`/payments/squads/${id}/pay-token`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const { order_id, amount, currency } = res.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(amount * 100), // Razorpay expects paise (integer)
        currency: currency || 'INR',
        name: 'BachelorsSpace',
        description: 'Token Booking Payment',
        order_id: order_id,
        handler: function () {
          // Payment captured — start polling for backend confirmation via webhook
          submittingRef.current = false;
          setProcessing(false);
          pollForLock();
        },
        modal: {
          ondismiss: function () {
            submittingRef.current = false;
            setProcessing(false);
          },
        },
        theme: { color: '#6c63ff' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed. Please try again.');
        submittingRef.current = false;
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      submittingRef.current = false;
      setProcessing(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className={styles.container}>
        <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Loading payment details...</div>
      </main>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!squad || !property) {
    return (
      <main className={styles.container}>
        <div style={{ color: '#ff5f56', textAlign: 'center' }}>
          {error || 'Could not load squad or property details.'}
        </div>
      </main>
    );
  }

  // ── Leader guard ─────────────────────────────────────────────────────────────
  if (!isLeader) {
    return (
      <main className={styles.container}>
        <div className={styles.loginCard} style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 className={styles.title} style={{ fontSize: '1.2rem' }}>Leaders Only</h2>
          <p className={styles.subtitle}>Only the squad leader can initiate the token payment.</p>
          <Link href={`/squad/${id}`} className={styles.submitBtn} style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
            ← Back to Squad
          </Link>
        </div>
      </main>
    );
  }

  // ── Status guard ─────────────────────────────────────────────────────────────
  if (!paymentSuccess && !paymentPending && !polling && squad.status !== 'payment_pending') {
    return (
      <main className={styles.container}>
        <div className={styles.loginCard} style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 className={styles.title} style={{ fontSize: '1.2rem' }}>Invalid Status</h2>
          <p className={styles.subtitle}>This squad is not in a state to make a token payment. Current status: {squad.status.replace('_', ' ')}</p>
          <Link href={`/squad/${id}`} className={styles.submitBtn} style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
            ← Back to Squad
          </Link>
        </div>
      </main>
    );
  }

  // ── Payment success screen ───────────────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <main className={styles.container}>
        <div className={styles.loginCard} style={{ textAlign: 'center', maxWidth: '460px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h1 className={styles.title}>Property Secured!</h1>
          <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
            Your token payment was successful. <strong>{property.title}</strong> is now reserved for your squad.
            The landlord will be notified.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', marginBottom: '2rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Token Paid</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>₹{tokenAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment Model</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{paymentModel === 'leader_pays_all' ? 'Leader Pays All' : 'Split Evenly'}</span>
            </div>
          </div>
          <Link href={`/squad/${id}`} className={styles.submitBtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
            View Squad →
          </Link>
        </div>
      </main>
    );
  }

  // ── Pending confirmation (payment received, backend not yet confirmed) ───────
  if (paymentPending) {
    return (
      <main className={styles.container}>
        <div className={styles.loginCard} style={{ textAlign: 'center', maxWidth: '460px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⌛</div>
          <h1 className={styles.title} style={{ fontSize: '1.4rem' }}>Confirming Your Payment</h1>
          <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
            We&apos;ve received your payment request and are waiting for the bank to confirm it.
            This can take a few minutes. Your squad will be locked automatically once the payment
            is verified — we&apos;ll notify you. You have <strong>not</strong> been charged twice.
          </p>
          <button
            className={styles.submitBtn}
            onClick={recheckStatus}
            style={{ marginBottom: '0.75rem' }}
          >
            Check again
          </button>
          <Link href={`/squad/${id}`} className={styles.backButton} style={{ display: 'inline-block', textDecoration: 'none' }}>
            ← Back to Squad
          </Link>
        </div>
      </main>
    );
  }

  // ── Polling state (waiting for webhook confirmation) ─────────────────────────
  if (polling) {
    return (
      <main className={styles.container}>
        <div className={styles.loginCard} style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
          <h2 className={styles.title} style={{ fontSize: '1.3rem' }}>Confirming Payment...</h2>
          <p className={styles.subtitle}>Please wait while we confirm your payment with our servers. This usually takes a few seconds.</p>
        </div>
      </main>
    );
  }

  // ── Main payment form ────────────────────────────────────────────────────────
  return (
    <main className={styles.container}>
      <Link href={`/squad/${id}`} className={styles.backButton}>
        <span style={{ transition: 'transform 0.2s ease', display: 'inline-block' }}>←</span>
        <span>Back to Squad</span>
      </Link>

      <div className={styles.loginCard} style={{ maxWidth: '500px' }}>
        <h1 className={styles.title}>Book Property</h1>
        <p className={styles.subtitle}>Pay the token amount to lock your space.</p>

        {error && <div style={{ color: '#ff5f56', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        {/* Property Summary */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{property.title}</h3>

          {property.property_type === 'pg' && rooms.length > 0 && (
            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
              <label className={styles.label}>Select Room</label>
              <select
                className={styles.input}
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.room_type} (₹{r.rent_amount}/mo)</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            <span>Monthly Rent:</span>
            <span>₹{baseRent.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            <span>Token Percentage:</span>
            <span>{tokenPercentage}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: '1.2rem' }}>
            <span>Total Token Amount:</span>
            <span>₹{tokenAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Model */}
        <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
          <label className={styles.label}>Payment Splitting Strategy</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentModel"
                style={{ marginTop: '3px' }}
                checked={paymentModel === 'leader_pays_all'}
                onChange={() => setPaymentModel('leader_pays_all')}
              />
              <div>
                <div style={{ color: '#fff', fontWeight: 500 }}>Leader Pays All</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>You pay the full token amount right now.</div>
              </div>
            </label>
            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentModel"
                style={{ marginTop: '3px' }}
                checked={paymentModel === 'split_evenly'}
                onChange={() => setPaymentModel('split_evenly')}
              />
              <div>
                <div style={{ color: '#fff', fontWeight: 500 }}>Split Evenly</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  You pay the full amount via the gateway. Each of the {memberCount} members owes{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.8)' }}>₹{memberShare.toFixed(2)}</strong> — settle externally before paying.
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          className={styles.submitBtn}
          onClick={handlePayment}
          disabled={processing || tokenAmount <= 0 || !razorpayReady}
        >
          {processing ? 'Opening Payment...' : `Pay ₹${tokenAmount.toFixed(2)} Now`}
        </button>

        {!razorpayReady && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.75rem' }}>
            Loading payment SDK...
          </p>
        )}
      </div>
    </main>
  );
}
