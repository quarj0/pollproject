import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../apis/api";
import { FaSearch, FaPlus, FaCalendarAlt, FaArchive } from "react-icons/fa";

const DashBoard = () => {
  const [upcomingPolls, setUpcomingPolls] = useState([]);
  const [pastPolls, setPastPolls] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("polls/list/");

        const currentDateTime = new Date();
        const filteredUpcomingPolls = response.data.filter((poll) => {
          const endTime = new Date(poll.end_time).getTime();
          return currentDateTime <= endTime;
        });

        const filteredPastPolls = response.data.filter(
          (poll) => new Date(poll.start_time) <= currentDateTime
        );

        setUpcomingPolls(filteredUpcomingPolls);
        setPastPolls(filteredPastPolls);
      } catch (error) {
        console.error("Error fetching polls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredPolls = upcomingPolls.filter((poll) =>
    poll.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4">
            Welcome to Your Dashboard
          </h1>
          <p className="text-lg opacity-90">
            Manage your polls and view results all in one place
          </p>
          <motion.div
            className="mt-6 flex gap-4 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              to="/create-poll"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              <FaPlus className="mr-2" />
              Create New Poll
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="py-8 border-b bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="relative max-w-2xl mx-auto">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search polls..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              onChange={handleSearch}
            />
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              className="bg-white p-6 rounded-lg shadow-sm"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-2">Active Polls</h3>
              <p className="text-3xl font-bold text-primary-600">
                {upcomingPolls.length}
              </p>
            </motion.div>
            <motion.div
              className="bg-white p-6 rounded-lg shadow-sm"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-2">Past Polls</h3>
              <p className="text-3xl font-bold text-primary-600">
                {pastPolls.length}
              </p>
            </motion.div>
            <motion.div
              className="bg-white p-6 rounded-lg shadow-sm"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-2">Total Polls</h3>
              <p className="text-3xl font-bold text-primary-600">
                {upcomingPolls.length + pastPolls.length}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <FaCalendarAlt className="mr-2 text-primary-600" />
              Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
            >
              {filteredPolls.map((poll) => (
                <motion.div
                  key={poll.id}
                  variants={item}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link to={`/polls/${poll.id}/contestants`}>
                    <img
                      src={(poll.poll_image)}
                      alt={poll.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {poll.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {poll.description}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <FaCalendarAlt className="mr-2" />
                        <span>
                          {new Date(poll.end_time).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && filteredPolls.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No upcoming events found
              </h3>
              <p className="text-gray-500">
                Create a new poll or check back later
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Past Events */}
      <section className="py-8 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <FaArchive className="mr-2 text-primary-600" />
              Past Events
            </h2>
            <Link
              to="/past/events"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </Link>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
          >
            {pastPolls.slice(0, 3).map((poll) => (
              <motion.div
                key={poll.id}
                variants={item}
                className="bg-white rounded-lg shadow-sm overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
              >
                <img
                  src={
                    poll.poll_image
                      ? `http://localhost:8000${poll.poll_image}`
                      : "https://via.placeholder.com/300"
                  }
                  alt={poll.title}
                  className="w-full h-48 object-cover filter grayscale"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{poll.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {poll.description}
                  </p>
                  <Link
                    to={`/poll/${poll.id}/results`}
                    className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    View Results
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default DashBoard;

