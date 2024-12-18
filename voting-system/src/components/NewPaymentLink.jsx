import { useState } from "react";
import axiosInstance from "../apis/api";
import { Link } from "react-router-dom";
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

const NewPaymentLink = ({ authTokens }) => {
  const [pollId, setPollId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pollId.trim()) {
      setError("Please enter a valid Poll ID or name.");
      return;
    }

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.get(
        `/payment/poll/${pollId}/link/`,
        {
          headers: {
            Authorization: `Bearer ${authTokens.access}`,
          },
        }
      );

      setMessage(
        <span>
          Payment link created successfully. Click{" "}
          <a
            href={response.data.payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            here
          </a>{" "}
          to proceed.
        </span>
      );
    } catch (error) {
      setLoading(false);
      console.error("Error details:", error);
      if (error.response && error.response.data) {
        const serverError =
          error.response.data.non_field_errors?.[0] ||
          error.response.data.detail;
        setError(serverError || "Server returned an unknown error.");
      } else if (error.request) {
        setError("No response from the server. Please check your connection.");
      } else {
        setError(`Request error: ${error.message}`);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center mb-4">
        <Link to="/dashboard" className="text-blue-500">
          <FaArrowAltCircleLeft className="text-xl" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 ml-2">
          Generate Payment Link
        </h2>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Success or Error Messages */}
        <Message type="success" message={message} />
        <Message type="error" message={error} />
        <div className="mb-4">
          <label htmlFor="pollId" className="block text-gray-700">
            Poll Name or ID
          </label>
          <input
            id="pollId"
            type="text"
            value={pollId}
            onChange={(e) => setPollId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter Poll Name or ID"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 text-white rounded ${
              loading ? "bg-gray-400" : "bg-blue-500"
            }`}
            disabled={loading}
          >
            {loading ? "Processing..." : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
};

NewPaymentLink.propTypes = {
  authTokens: PropTypes.object.isRequired,
};

Message.propTypes = {
  type: PropTypes.string.isRequired,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
};

export default NewPaymentLink;
