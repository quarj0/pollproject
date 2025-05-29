import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { FaUser, FaPhone, FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";
import axiosInstance from "../apis/api";
import votelap from "../assets/votelablogo.png";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    accountNumber: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!/^\d+$/.test(formData.accountNumber)) {
      setError("Phone number must contain only numeric digits.");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post("auth/register/", {
        username: formData.username,
        account_number: formData.accountNumber,
        email: formData.email,
        password: formData.password,
      });

      navigate("/login");
    } catch (error) {
      if (error.response?.data) {
        const serverError = error.response.data.non_field_errors?.[0] ||
                          error.response.data.detail;
        setError(serverError || "Registration failed. Please try again.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    {
      label: "Username",
      name: "username",
      type: "text",
      icon: <FaUser />,
      placeholder: "Choose a username",
    },
    {
      label: "Phone Number",
      name: "accountNumber",
      type: "tel",
      icon: <FaPhone />,
      placeholder: "Enter your phone number",
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      icon: <FaEnvelope />,
      placeholder: "Enter your email",
    },
    {
      label: "Password",
      name: "password",
      type: "password",
      icon: <FaLock />,
      placeholder: "Choose a password",
    },
  ];

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
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
          Create Your Account
        </h1>
        <p className="text-lg md:text-xl text-center max-w-md">
          Join VoteLab today and start creating engaging polls for your audience.
        </p>
      </motion.div>

      {/* Right Section - Registration Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full md:w-1/2 flex justify-center items-center p-8"
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Sign Up</h2>

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
            {inputFields.map((field) => (
              <div key={field.name}>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  {field.label}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {field.icon}
                  </div>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder={field.placeholder}
                    required
                  />
                </div>
              </div>
            ))}

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
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
              {!loading && <FaArrowRight className="ml-2" />}
            </motion.button>

            <p className="text-center text-gray-600 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
