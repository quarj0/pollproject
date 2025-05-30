import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../apis/api";
import { Link } from "react-router-dom";
import Footer from "../layouts/Footer"; 

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

  const pastPolls = useMemo(
    () => polls.filter((poll) => !poll.active),
    [polls]
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="space-y-8 max-w-6xl mx-auto p-6 flex-grow">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center font-montserrat">
          Past Polls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastPolls.map((poll) => (
            <div
              key={poll.id}
              className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <img
                src={poll.poll_image}
                alt={poll.title || "Poll image"}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 truncate font-montserrat">
                  {poll.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 font-lato">
                  Ended: {new Date(poll.end_time).toLocaleString()}
                </p>
                <p className="mt-3 text-gray-600 line-clamp-3 font-lato">
                  {poll.description || "No description available."}
                </p>
                <Link
                  to={`/poll/${poll.id}/results`}
                  className="mt-4 w-full bg-primary-600 text-white py-3 px-4 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors inline-block text-center font-montserrat"
                >
                  View Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PastPolls;
