import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../apis/api";
import { FaArrowAltCircleLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

const PastPolls = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
  }

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("polls/list/");
        setPolls(response.data);
      } catch (error) {
        console.error("Error fetching polls:", error);
        setError("Failed to load polls. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const currentDateTime = useMemo(() => new Date(), []);

  const pastPolls = useMemo(
    () => polls.filter((poll) => new Date(poll.end_time) < currentDateTime),
    [polls, currentDateTime]
  );

  if (loading) {
    return (
      <div className="text-center text-gray-500">Loading past polls...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-48">
        <h1>{error}</h1>
        <Link to="/" className="text-blue-500">
          Back Home
        </Link>
      </div>
    );
  }

  if (pastPolls.length === 0) {
    return (
      <div className="text-center text-gray-500 py-48">
        <h1>No past polls found.</h1>
        <Link to="/dashboard" className="text-blue-500">
          Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Past Polls
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pastPolls.map((poll) => (
          <div
            key={poll.id}
            className="bg-gray-100 shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <img
              src={
                poll.poll_image
                  ? `http://localhost:8000${poll.poll_image}`
                  : "https://via.placeholder.com/300?text=No+Image+Available"
              }
              alt={poll.title || "Poll image"}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 truncate">
                {poll.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Ended: {new Date(poll.end_time).toLocaleString()}
              </p>
              <p className="mt-2 text-gray-700 line-clamp-3">
                {poll.description || "No description available."}
              </p>
              <button
                className="mt-4 w-full bg-gray-500 text-white py-2 px-4 rounded-md text-sm font-medium cursor-not-allowed"
                disabled
              >
                Event Ended
              </button>
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/dashboard"
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <FaArrowAltCircleLeft className="mr-2" /> Back
      </Link>
    </div>
  );
};

export default PastPolls;
