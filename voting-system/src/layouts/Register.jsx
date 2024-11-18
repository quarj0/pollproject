import { useState } from "react";
import axiosInstance from "../apis/api";
import { useNavigate } from "react-router-dom";
import votelap from "../assets/votelap.jpg";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate account number (digits only)
    if (!/^\d+$/.test(accountNumber)) {
      setLoading(false);
      setError("Account number must contain only numeric digits.");
      return;
    }

    try {
      await axiosInstance.post("auth/register/", {
        username,
        account_number: accountNumber,
        email,
        password,
      });

      navigate("/login");
    } catch (error) {
      setLoading(false);
      if (error.response && error.response.data) {
        const serverError =
          error.response.data.non_field_errors?.[0] ||
          error.response.data.detail;
        setError(serverError || "Registration failed. Please try again.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
      {/* Image Section */}
      <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8">
        <img
          src={votelap}
          alt="logo"
          className="max-w-md mb-6 rounded-lg shadow-lg"
        />
        <p className="text-center px-4 text-white">
          VoteLap is a secure online voting platform that allows you to cast
          your votes from anywhere in the world.
        </p>
      </div>

      {/* Form Section */}
      <div className="w-full md:w-1/2 bg-white p-8 shadow-lg rounded-lg animate-slideIn">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Register an Account
        </h2>

        {error && (
          <p className="text-red-600 text-center bg-red-100 p-2 rounded mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Phone Number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-lg text-white font-bold transition-transform ${
              loading
                ? "bg-gray-500"
                : "bg-blue-500 hover:bg-blue-600 hover:scale-105"
            }`}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-blue-500 hover:underline font-medium"
          >
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
