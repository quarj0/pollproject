import { useState, useEffect } from "react";
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
  const [polls, setPolls] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(true);

  useEffect(() => {
    axiosInstance
      .get("/polls/list/", {
        headers: {
          Authorization: `Bearer ${authTokens.access}`,
        },
      })
      .then((response) => {
        setPolls(response.data);
        console.log(response.data);
        setLoadingPolls(false);
      })
      .catch(() => {
        setError("Failed to load polls.");
        setLoadingPolls(false);
      });
  }, [authTokens]);

  const handleCreateLink = async (pollId) => {
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
      if (error.response && error.response.data) {
        const serverError =
          error.response.data.non_field_errors?.[0] ||
          error.response.data.detail;
        setError(serverError || "Failed to create payment link.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center mb-4">
        <Link to="/dashboard" className="text-blue-500">
          <FaArrowAltCircleLeft className="text-xl" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 ml-2">
          Create Payment Link
        </h2>
      </div>
      <Message type="success" message={message} />
      <Message type="error" message={error} />
      {loadingPolls ? (
        <p>Loading polls...</p>
      ) : (
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Your Polls</h3>
          {polls.length === 0 ? (
            <p className="text-gray-700">No polls available.</p>
          ) : (
            <ul className="space-y-4">
              {polls.map((poll) => (
                <li key={poll.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <h4 className="text-lg font-semibold">{poll.name}</h4>
                    <p className="text-gray-600">{poll.description}</p>
                  </div>
                  <button
                    onClick={() => handleCreateLink(poll.id)}
                    className={`px-4 py-2 text-white rounded ${
                      loading ? "bg-gray-400" : "bg-blue-500"
                    }`}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Create Link"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

NewPaymentLink.propTypes = {
  authTokens: PropTypes.object.isRequired,
};

Message.propTypes = {
  type: PropTypes.string.isRequired,
  message: PropTypes.string,
};

export default NewPaymentLink;
