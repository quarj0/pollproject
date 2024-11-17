import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./layouts/Navbar";
import Login from "./layouts/Login";
import HomePage from "./components/Homepage";
import Profile from "./components/Profile";
import RegisterPage from "./layouts/Register";
import PasswordResetConfirmPage from "./layouts/PasswordResetConfirm";
import PasswordResetRequestPage from "./layouts/PasswordReset";
import axiosInstance from "./apis/api";

const App = () => {
  const [authTokens, setAuthTokens] = useState(() => {
    const storedTokens = localStorage.getItem("access");
    return storedTokens ? { access: storedTokens } : null;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshAuthToken = async () => {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const response = await axiosInstance.post("token/refresh/", {
            refresh,
          });
          const newTokens = response.data;
          setAuthTokens(newTokens);
          localStorage.setItem("access", newTokens.access);
          localStorage.setItem("refresh", newTokens.refresh);
        } catch (error) {
          console.error("Token refresh failed:", error);
          logout();
        }
      }
    };

    const fetchUser = async () => {
      if (authTokens) {
        try {
          const response = await axiosInstance.get("auth/user", {
            headers: {
              Authorization: `Bearer ${authTokens.access}`,
            },
          });
          setUser(response.data);
        } catch (error) {
          console.error("Error fetching user data:", error);
          await refreshAuthToken();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [authTokens]);

  const login = (tokens) => {
    setAuthTokens(tokens);
    localStorage.setItem("access", tokens.access);
    localStorage.setItem("refresh", tokens.refresh);
  };

  const logout = () => {
    setAuthTokens(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar isAuthenticated={!!authTokens} user={user} onLogout={logout} />
        <div className="max-w-7xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/login"
              element={
                authTokens ? (
                  <Navigate to="/profile" />
                ) : (
                  <Login login={login} />
                )
              }
            />
            <Route path="/password/reset" element={<PasswordResetRequestPage />} />
            <Route path="/password/reset/confirm" element={<PasswordResetConfirmPage />} />
            <Route
              path="/profile"
              element={
                authTokens ? (
                  user ? (
                    <Profile user={user} authTokens={authTokens} />
                  ) : (
                    <div>Loading...</div>
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
