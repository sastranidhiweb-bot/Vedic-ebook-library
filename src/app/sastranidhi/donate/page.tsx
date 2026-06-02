import { useEffect, useState } from 'react';
import axios from 'axios';
import { load } from '@cashfreepayments/cashfree-js';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

type CashfreeCheckout = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget: '_modal' | '_self';
  }) => Promise<unknown>;
};

export default function DonatePage() {
  const navigate = useNavigate();
  const [showThankYou, setShowThankYou] = useState(false);
  const [donateAmount, setDonateAmount] = useState(100);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cashfree, setCashfree] = useState<CashfreeCheckout | null>(null);

  useEffect(() => {
    async function initSDK() {
      const sdk = await load({ mode: import.meta.env.VITE_CASHFREE_MODE === 'PROD' ? 'production' : 'sandbox' });
      setCashfree(sdk as CashfreeCheckout);
    }
    initSDK();
  }, []);

  const getSessionId = async (amount: number): Promise<string | null> => {
    try {
      const user_details = {
        customer_id: donorPhone || 'donor',
        customer_phone: donorPhone,
        customer_name: donorName,
        customer_email: donorEmail
      };

      const res = await axios.get('/api/payment', {
        params: { user_details, amount }
      });

      if (res.data?.payment_session_id) {
        return res.data.payment_session_id;
      }

      setError('Could not create payment session.');
      return null;
    } catch {
      setError('Error creating payment session.');
      return null;
    }
  };

  const handleDonate = async () => {
    setError('');

    if (!donorName.trim() || !donorEmail.trim() || !donorPhone.trim() || !donateAmount || donateAmount < 1) {
      setError('Please fill all fields correctly.');
      return;
    }

    setLoading(true);
    const sessionId = await getSessionId(donateAmount);
    setLoading(false);

    if (!sessionId || !sessionId.trim() || !cashfree) {
      setError('Payment session could not be created. Please try again.');
      return;
    }

    const checkoutOptions = {
      paymentSessionId: sessionId,
      redirectTarget: '_modal' as const,
    };

    cashfree.checkout(checkoutOptions).then(() => {
      setDonorName('');
      setDonorEmail('');
      setDonorPhone('');
      setDonateAmount(100);
      setError('');
      setShowThankYou(true);
    }).catch(() => {
      setError('Payment modal failed to open. Please try again.');
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f5f2' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          zIndex: 100,
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: '1550px',
            margin: '0 auto',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <BookOpen style={{ color: '#fff', width: 30, height: 30 }} />
            <button
              onClick={() => navigate('/sastranidhi')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '30px',
                fontWeight: 700,
                fontFamily: 'serif',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                padding: 0,
              }}
            >
              Śāstra Nidhi
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/sastranidhi')}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(90deg, #c47a3f 0%, #a05a2c 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Home
            </button>

            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(90deg, #1abc9c 0%, #16a085 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <section style={{ width: '100%', maxWidth: 460, background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(160,90,44,0.07)' }}>
          <h2 style={{ color: '#7a9c5c', fontWeight: 'bold', fontSize: '1.35rem' }}>Support Us</h2>
          <p style={{ color: '#3d5a1a', marginTop: 8, marginBottom: 14 }}>
            Fill the form below to continue your donation.
          </p>

          <form onSubmit={e => { e.preventDefault(); handleDonate(); }}>
            <input
              type="text"
              placeholder="Name"
              value={donorName}
              onChange={e => setDonorName(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 6, border: '1px solid #a05a2c', color: '#1f2937', background: '#fff' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={donorEmail}
              onChange={e => setDonorEmail(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 6, border: '1px solid #a05a2c', color: '#1f2937', background: '#fff' }}
            />
            <input
              type="tel"
              placeholder="Phone"
              value={donorPhone}
              onChange={e => setDonorPhone(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 6, border: '1px solid #a05a2c', color: '#1f2937', background: '#fff' }}
            />
            <input
              type="number"
              min="1"
              placeholder="Amount (₹)"
              value={donateAmount}
              onChange={e => setDonateAmount(Number(e.target.value))}
              required
              style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 6, border: '1px solid #a05a2c', color: '#1f2937', background: '#fff' }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#a05a2c', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
            >
              {loading ? 'Processing...' : 'Donate'}
            </button>

            {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
          </form>

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/sastranidhi" style={{ color: '#7a9c5c', textDecoration: 'underline' }}>
              Back
            </Link>
          </div>
        </section>
      </main>

      {showThankYou && (
        <div style={{ background: 'rgba(0,0,0,0.25)', zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', padding: 32, textAlign: 'center' }}>
            <h5 style={{ color: '#7a9c5c', fontWeight: 'bold', fontSize: '1.5rem' }}>Thank You!</h5>
            <p style={{ margin: '16px 0', color: '#3d5a1a' }}>Your donation has been initiated. We appreciate your support!</p>
            <button style={{ borderRadius: 8, background: '#7a9c5c', color: '#fff', fontWeight: 'bold', padding: '10px 28px', border: 'none', fontSize: '1.08rem' }} onClick={() => setShowThankYou(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
