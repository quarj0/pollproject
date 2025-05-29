import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaEnvelope, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import axiosInstance from "../apis/api";
import votelap from "../assets/votelablogo.png";

const PasswordResetRequestPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await axiosInstance.post("auth/reset/password/", { email });
      setMessage("Password reset email sent. Please check your inbox.");
      setEmail(""); // Clear email field after successful submission
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Email address not found.");
      } else if (err.response?.status === 400) {
        setError("Please enter a valid email address.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 to-blue-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <img
            src={votelap}
            alt="VoteLab Logo"
            className="w-24 h-24 mx-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-white mb-2">
            Reset Your Password
          </h2>
          <p className="text-gray-200">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {/* Reset Form Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 text-green-600 p-4 rounded-lg mb-6"
            >
              {message}
            </motion.div>
          )}

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
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter your email address"
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
              <span>{loading ? "Sending..." : "Send Reset Link"}</span>
              {!loading && <FaArrowRight className="ml-2" />}
            </motion.button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PasswordResetRequestPage;
