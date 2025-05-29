import { useState, useEffect } from "react";
import PropTypes from "prop-types";
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
import Footer from "./layouts/Footer";
import CreatePoll from "./components/CreatePoll";
import PastPolls from "./components/PastPolls";
import UpcomingPolls from "./components/UpcomingPolls";
import ContestantsPage from "./components/ContestantsPage";
import DashBoard from "./components/Dashboard";
import Settings from "./layouts/Settings";
import NewPaymentLink from "./components/NewPaymentLink";
import ResultsPage from "./layouts/ResultsPage";
import PollManagement from "./layouts/PollManagement";
import UpdateContestant from "./components/UpdateContestant";
import PaymentCompletion from "./layouts/PaymentVerification";
import AddContestant from "./components/ContestantField";
import EditContestant from "./components/EditContestant";
import NotFoundPage from "./layouts/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Services from "./pages/Services";
import Breadcrumb from "./components/Breadcrumb";
import EditPoll from "./components/EditPoll";

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
          const response = await axiosInstance.get("auth/user/", {
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
    Navigate("/login");
  };

  if (loading)
    return (
      <div>
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );

  const PrivateRoute = ({ children }) => {
    return authTokens ? children : <Navigate to="/login" />;
  };

  PrivateRoute.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Conditionally render Navbar */}
        {authTokens && (
          <Navbar
            authTokens={authTokens}
            logout={logout}
            isAuthenticated={!!authTokens}
            user={user}
          />
        )}
        <Breadcrumb />
        <div>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/events" element={<UpcomingPolls />} />

            <Route
              path="/payment/verify/:reference"
              element={<PaymentCompletion />}
            />
            <Route
              path="/polls/:pollId/contestants"
              element={<ContestantsPage />}
            />

            <Route
              path="/polls/:pollId/contestants/:contestantId/edit"
              element={<EditContestant />}
            />

            <Route path="/manage-polls" element={<PollManagement />} />
            <Route
              path="/create/:pollId/contestants"
              element={<AddContestant />}
            />
            <Route path="/edit/poll/:pollId" element={<EditPoll />} />
            <Route
              path="/edit/contestant/:contestantId"
              element={<UpdateContestant />}
            />

            <Route path="/past/events" element={<PastPolls />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/login"
              element={
                authTokens ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Login login={login} />
                )
              }
            />

            <Route path="/dashboard" element={<DashBoard />} />
            <Route path="/payment/new" element={<NewPaymentLink />} />
            <Route path="/poll/:pollId/results" element={<ResultsPage />} />
            <Route path="/poll/:pollId" element={<ResultsPage />} />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings authTokens={authTokens} />
                </PrivateRoute>
              }
            />

            {/* Footer Routes */}
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/services" element={<Services />} />

            <Route
              path="/password/reset"
              element={<PasswordResetRequestPage />}
            />
            <Route
              path="/auth/reset/password/:uidb64/:token"
              element={<PasswordResetConfirmPage />}
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile user={user} authTokens={authTokens} />
                </PrivateRoute>
              }
            />
            <Route
              path="/create-poll"
              element={
                <PrivateRoute>
                  <CreatePoll authTokens={authTokens} />
                </PrivateRoute>
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/services" element={<Services />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
