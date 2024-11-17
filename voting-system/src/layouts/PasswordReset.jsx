import { useState } from "react";
import Message from "../components/Message";
import axiosInstance from "../apis/api";

const PasswordResetRequestPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await axiosInstance.post("auth/reset/password/", { email });
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (err) {
      console.error(err);
      setError("Error sending reset email");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Password Reset
        </h2>

        <Message type="success" message={message} />
        <Message type="error" message={error} />

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
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 transition"
          >
            Send Reset Link
          </button>
          <div className="text-center">
            <a href="/login" className="text-blue-500">
              Back to Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetRequestPage;
