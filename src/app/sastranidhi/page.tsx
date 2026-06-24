import { useState } from 'react';
import HomeLanding from '../../components/HomeLanding';
import Login from '../../components/Login';
import { usePageMeta } from '../../lib/usePageMeta';

export default function SastraNidhi() {
  const [showLogin, setShowLogin] = useState(false);

  usePageMeta(
    'Sastra Nidhi',
    'Sastra Nidhi — support and access the Vedic Library collection of sacred scriptures and spiritual literature.'
  );

  return showLogin ? (
    <Login onLoginSuccess={() => setShowLogin(false)} />
  ) : (
    <HomeLanding onLoginClick={() => setShowLogin(true)} />
  );
}
