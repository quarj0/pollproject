import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../apis/api";

const LoginPage = ({ login }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      const response = await axiosInstance.post("auth/login/", {
        email,
        password,
      });

      if (response.data) {
        login(response.data);
        alert(response.data.message || "Login successful!");
        navigate("/dashboard");
      } else {
        setError(response.data.message || "Invalid credentials");
      }
    } catch (error) {
      if (error.response && error.response.data) {
        const serverError =
          error.response.data.non_field_errors?.[0] ||
          error.response.data.detail;
        setError(serverError || "Login failed. Please try again.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Left Section */}
      <div className="w-full md:w-1/2 bg-blue-500 text-white flex flex-col justify-center items-center p-4 md:p-0">
        <img
          src="https://www.pngkey.com/png/full/114-1149878_polling-clipart-voting-system-voting-system-logo.png"
          alt="Logo"
          className="w-24 h-24 md:w-40 md:h-40 mb-4"
        />
        <h1 className="text-2xl md:text-4xl font-bold">Welcome Back!</h1>
        <p className="mt-4 text-sm md:text-lg">
          Login to access your manage your polls.
        </p>
      </div>

      {/* Right Section */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold font-lato mb-4 text-gray-700 text-center">
            Login
          </h2>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-2 text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-gray-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
            >
              Login
            </button>
          </form>
          <div className="flex justify-between items-center mt-4">
            <a href="/password/reset/" className="text-blue-500">
              Forgot Password?
            </a>
            <a href="/register" className="text-blue-500">
              Register
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

LoginPage.propTypes = {
  login: PropTypes.func.isRequired,
};

export default LoginPage;
