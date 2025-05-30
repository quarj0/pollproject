import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";
import { Link } from "react-router-dom";
import { FaArrowAltCircleLeft } from "react-icons/fa";
import { format } from "date-fns";

const UpcomingPolls = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("polls/list/");
        setPolls(response.data);
      } catch (error) {
        console.error("Error fetching polls:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const currentDate = new Date();

  const upcomingPolls = polls.filter((poll) => {
    const endTime = new Date(poll.end_time).getTime();
    return currentDate <= endTime;
  });

  const truncateText = (text, maxLength = 100) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  if (loading) {
    return (
      <div className="text-center text-gray-500">Loading upcoming polls...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-gray-500 py-48">
        <p>Failed to load polls. Please try again later.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white py-2 px-4 rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (upcomingPolls.length === 0) {
    return (
      <div className="text-center text-gray-500 py-48">
        <h1 className="">No upcoming polls found.</h1>
        <Link to={"/dashboard"} className="text-blue-500 text-center">
          Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Upcoming Polls
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upcomingPolls.map((poll) => (
          <div
            key={poll.id}
            className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <img
              src={poll.poll_image}
              alt={`Image for ${poll.title}`}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 truncate">
                {poll.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Ends: {format(new Date(poll.end_time), "PPpp")}
              </p>
              <p className="my-3 text-gray-700">
                {truncateText(poll.description, 150)}
              </p>
              <Link
                className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-600 transition duration-200"
                to={`/polls/${poll.id}/contestants`}
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      <Link
        to={"/dashboard"}
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <FaArrowAltCircleLeft className="mr-2" />
        Back
      </Link>
    </div>
  );
};

export default UpcomingPolls;
