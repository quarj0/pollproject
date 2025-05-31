import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";
import { Link } from "react-router-dom";
import { FaArrowAltCircleLeft, FaClock, FaUsers } from "react-icons/fa";
import { format } from "date-fns";
import CountdownTimer from "./CountdownTimer";
import { motion } from "framer-motion";

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
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const truncateText = (text, maxLength = 100) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading upcoming polls...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Failed to load polls. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white py-2 px-6 rounded-full hover:bg-blue-600 transition-colors shadow-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (upcomingPolls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-gray-600 mb-4">No upcoming polls found.</h1>
          <Link 
            to="/dashboard" 
            className="text-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
          >
            <FaArrowAltCircleLeft className="mr-2" />
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Upcoming Polls
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover and participate in our latest voting events. Don't miss out on having your say!
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {upcomingPolls.map((poll, index) => (
            <motion.div
              key={poll.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="relative">
                <img
                  src={poll.poll_image}
                  alt={`Image for ${poll.title}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full shadow-md">
                    {poll.poll_type === 'voters-pay' ? 'Voters Pay' : 'Creator Pay'}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-1">
                  {poll.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {poll.description}
                </p>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <CountdownTimer startTime={poll.start_time} endTime={poll.end_time} />
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <FaClock className="mr-2" />
                    <span className="text-xs">
                      {format(new Date(poll.start_time), "PPp")}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/polls/${poll.id}/contestants`}
                  className="block w-full text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg mt-4"
                >
                  View Contestants
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaArrowAltCircleLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UpcomingPolls;
