import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";
import axiosInstance from "../apis/api";
import votelap from "../assets/votelablogo.png";

const LoginPage = ({ login }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post("auth/login/", {
        email,
        password,
      });

      if (response.data) {
        login(response.data);
        navigate("/dashboard");
      }
    } catch (error) {
      if (error.response?.data) {
        const serverError = error.response.data.non_field_errors?.[0] ||
                          error.response.data.detail;
        setError(serverError || "Login failed. Please try again.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-teal-800 to-blue-950">
      {/* Left Section - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 text-white"
      >
        <img
          src={votelap}
          alt="VoteLab Logo"
          className="w-32 h-32 md:w-48 md:h-48 object-contain mb-8"
        />
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome Back!</h1>
        <p className="text-lg md:text-xl text-center max-w-md">
          Login to manage your polls and see what your audience thinks.
        </p>
      </motion.div>

      {/* Right Section - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full md:w-1/2 flex justify-center items-center p-8"
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Sign In</h2>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-600 p-4 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold flex items-center justify-center space-x-2 ${
                loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700"
              } transition-colors duration-200`}
            >
              <span>{loading ? "Signing in..." : "Sign In"}</span>
              {!loading && <FaArrowRight className="ml-2" />}
            </motion.button>

            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 space-y-4 sm:space-y-0">
              <Link
                to="/password/reset"
                className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
              >
                Forgot your password?
              </Link>
              <Link
                to="/register"
                className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
              >
                Don&apos;t have an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

LoginPage.propTypes = {
  login: PropTypes.func.isRequired,
};

export default LoginPage;
