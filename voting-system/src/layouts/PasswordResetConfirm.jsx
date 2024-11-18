import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../apis/api";

const PasswordResetConfirmPage = () => {
  const { uidb64, token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await axiosInstance.post(`/auth/reset/password/${uidb64}/${token}/`, {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setMessage("Password reset successfully!");
      navigate("/login");
    } catch (err) {
      console.error(err);
      const errorMessage =
        err.response?.data?.error || "Error resetting password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      {/* Form Card */}
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-3xl font-semibold mb-6 text-center">
          Reset Your Password
        </h2>
        {message && <p className="text-green-600 mb-4">{message}</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded w-full hover:bg-blue-600 transition duration-200"
            disabled={loading}
          >
            {loading ? "Processing..." : "Reset Password"}
          </button>
        </form>
      </div>

      {/* Ad Section */}
      <div className="mt-8">
        <div className="relative">
          <iframe
            src="https://publisher.linkvertise.com/cdn/ads/LV-728x90/index.html"
            frameBorder="0"
            height="90"
            width="728"
          ></iframe>
          <a
            href="https://publisher.linkvertise.com/ac/1251835"
            target="_blank"
            className="absolute top-0 bottom-0 left-0 right-0"
          ></a>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirmPage;
