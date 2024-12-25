import { useState } from "react";
import axiosInstance from "../apis/api";
import { useNavigate } from "react-router-dom";
import votelap from "../assets/votelablogo.png";

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

    if (!/^\d+$/.test(accountNumber)) {
      setLoading(false);
      setError("Phone number must contain only numeric digits.");
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
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-br from-teal-800 to-blue-950">
      {/* Image Section */}
      <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8">
        <img
          src={votelap}
          alt="VoteLab Logo"
          className="max-w-sm mb-6 rounded-lg shadow-xl animate-fadeIn"
        />
        <h1 className="text-4xl font-bold text-white mb-2">VoteLab</h1>
        <p className="text-center px-4 text-white text-lg italic">
          Innovating the way you vote. <br/>Register now and create polls to get your audience&apos;s opinion.
        </p>
      </div>

      {/* Form Section */}
      <div className="w-full md:w-1/2 bg-white p-10 shadow-lg rounded-xl animate-fadeIn">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
          Create an Account
        </h2>

        {error && (
          <p className="text-red-600 bg-red-100 border border-red-300 p-3 rounded-md text-center mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-gray-700 font-medium mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 focus:outline-none"
              placeholder="Enter your username"
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label
              htmlFor="accountNumber"
              className="block text-gray-700 font-medium mb-2"
            >
              Phone Number
            </label>
            <input
              id="accountNumber"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 focus:outline-none"
              placeholder="Enter your phone number"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 font-medium mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 focus:outline-none"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 font-medium mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition ${
              loading
                ? "bg-orange-500"
                : "bg-teal-600 hover:bg-teal-700 hover:scale-105"
            }`}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-teal-600 hover:underline font-medium"
          >
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
