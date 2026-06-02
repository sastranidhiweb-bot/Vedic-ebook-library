import { useState } from 'react';
import HomeLanding from '../../components/HomeLanding';
import Login from '../../components/Login';

export default function SastraNidhi() {
  const [showLogin, setShowLogin] = useState(false);

  return showLogin ? (
    <Login onLoginSuccess={() => setShowLogin(false)} />
  ) : (
    <HomeLanding onLoginClick={() => setShowLogin(true)} />
  );
}
