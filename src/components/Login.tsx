import { signInWithGoogle, logout } from "../auth/auth";
import { auth } from "../firebaseConfig";
import { useEffect, useState } from "react";
import "./Login.css";

export default function Login() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="auth-container">
      {user ? (
        <div className="user-info">
          <img src={user.photoURL || ''} alt="Profile" className="profile-pic" />
          <p>Welcome, {user.displayName || user.email}</p>
          <button onClick={logout} className="auth-button logout">
            Sign Out
          </button>
        </div>
      ) : (
        <button onClick={signInWithGoogle} className="auth-button google">
          <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt="Google logo" className="google-logo" />
          Sign in with Google
        </button>
      )}
    </div>
  );
}
