import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../apis/api";
import { Link } from "react-router-dom";
import Footer from "../layouts/Footer";
import { FaTrophy, FaUsers, FaCalendarAlt, FaClock } from "react-icons/fa";

const PastPolls = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); 
  const [searchTerm, setSearchTerm] = useState("");


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

  const filteredPolls = useMemo(() => {
    return polls
      .filter((poll) => !poll.active) 
      .filter((poll) => {
        if (filter === "all") return true;
        return poll.poll_type === filter;
      })
      .filter((poll) =>
        poll.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [polls, filter, searchTerm]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate - startDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} days, ${hours} hours`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-red-500 text-xl mb-4">{error}</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Past Polls</h1>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search polls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="creator-pay">Creator Pay</option>
              <option value="voters-pay">Voters Pay</option>
            </select>
          </div>

          {filteredPolls.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-xl text-gray-600">No past polls found.</h2>
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPolls.map((poll) => (
                <div
                  key={poll.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {poll.poll_image_url && (
                    <div className="relative h-48">
                      <img
                        src={poll.poll_image_url}
                        alt={poll.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                      <div className="absolute top-0 right-0 m-2 px-2 py-1 bg-blue-500 text-white text-sm rounded">
                        {poll.poll_type === "creator-pay" ? "Creator Pay" : "Voters Pay"}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 truncate">
                      {poll.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <FaCalendarAlt className="mr-2" />
                        <span className="text-sm">Started: {formatDate(poll.start_time)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FaClock className="mr-2" />
                        <span className="text-sm">Duration: {calculateDuration(poll.start_time, poll.end_time)}</span>
                      </div>
                      {poll.expected_voters && (
                        <div className="flex items-center text-gray-600">
                          <FaUsers className="mr-2" />
                          <span className="text-sm">Expected Voters: {poll.expected_voters}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <Link
                        to={`/poll/${poll.id}/results`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <FaTrophy className="mr-2" />
                        View Results
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PastPolls;
