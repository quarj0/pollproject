import { useState } from "react";
import axiosInstance from "../apis/api";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowAltCircleLeft } from "react-icons/fa";
import PropTypes from "prop-types";

const Message = ({ type, message }) => {
  if (!message) return null;
  return (
    <div
      className={`p-3 mb-4 text-sm text-white rounded ${
        type === "success" ? "bg-green-500" : "bg-red-500"
      }`}
    >
      {message}
    </div>
  );
};

const Settings = ({ authTokens }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await axiosInstance.post("auth/reset/password/", { email });
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setError("Email not found!.");
      } else if (err.response?.status === 400) {
        setError("Invalid email format. Please enter a valid email.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };


  const handleDeleteAccount = async () => {
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await axiosInstance.delete("auth/user/delete/", {
        headers: {
          Authorization: `Bearer ${authTokens.access}`,
        },
      });
      setMessage("Account deleted successfully.");

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      if (error.response && error.response.data) {
        const serverError =
          error.response.data.non_field_errors?.[0] ||
          error.response.data.detail;
        setError(serverError || "Account deletion failed. Please try again.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center mb-4">
          <Link to="/dashboard" className="text-blue-500 text-lg">
            <FaArrowAltCircleLeft className="inline-block mr-2" /> Back
          </Link>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Account Settings
        </h2>

        <Message type="success" message={message} />
        <Message type="error" message={error} />

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 transition ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            disabled={loading}>
            {loading ? "Sending..." : "Reset Password"}
          </button>
        </form>

        {/* Delete Account Section */}
        <div className="mt-6">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className={`w-full bg-red-500 text-white py-3 rounded-md hover:bg-red-600 transition ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <p className="mb-4 text-gray-700">
                Are you sure you want to delete your account? This action cannot
                be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDeleteAccount}
                  className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

Settings.propTypes = {
  authTokens: PropTypes.object.isRequired,
};

Message.propTypes = {
  type: PropTypes.string,
  message: PropTypes.string,
};
