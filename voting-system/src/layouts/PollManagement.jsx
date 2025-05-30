import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../apis/api";

const PollManagement = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'ended', 'upcoming'
  const [pollContestants, setPollContestants] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const res = await axiosInstance.get("/polls/list/");
        setPolls(res.data);
        // Fetch contestants for each poll
        res.data.forEach(poll => {
          fetchContestantsForPoll(poll.id);
        });
      } catch {
        setError("Failed to fetch polls. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  const fetchContestantsForPoll = async (pollId) => {
    try {
      const res = await axiosInstance.get(`/polls/${pollId}/contestants/`);
      setPollContestants(prev => ({
        ...prev,
        [pollId]: res.data
      }));
    } catch (error) {
      console.error(`Failed to fetch contestants for poll ${pollId}:`, error);
    }
  };

  const getPollStatus = (poll) => {
    const now = new Date();
    const startTime = new Date(poll.start_time);
    const endTime = new Date(poll.end_time);

    if (now < startTime) return 'upcoming';
    if (now > endTime) return 'ended';
    return 'active';
  };

  const getTimeRemaining = (poll) => {
    const now = new Date();
    const startTime = new Date(poll.start_time);
    const endTime = new Date(poll.end_time);

    if (now < startTime) {
      const diff = startTime - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `Starts in ${days} days`;
    }

    if (now < endTime) {
      const diff = endTime - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `${days}d ${hours}h remaining`;
    }

    return 'Ended';
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm("Are you sure you want to delete this poll?")) return;
    try {
      await axiosInstance.delete(`/polls/${pollId}/delete/`);
      setPolls((prev) => prev.filter((poll) => poll.id !== pollId));
      // Also remove contestants data for this poll
      setPollContestants(prev => {
        const newState = { ...prev };
        delete newState[pollId];
        return newState;
      });
    } catch {
      alert("Failed to delete the poll. Please try again.");
    }
  };

  const handleDeleteContestant = async (pollId, contestantId) => {
    if (!window.confirm("Are you sure you want to delete this contestant?")) return;
    try {
      await axiosInstance.delete(`/polls/${pollId}/contestants/${contestantId}/delete/`);
      // Update the contestants list after deletion
      setPollContestants(prev => ({
        ...prev,
        [pollId]: prev[pollId].filter(c => c.id !== contestantId)
      }));
    } catch (error) {
      console.error('Delete error:', error.response?.data || error.message);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Failed to delete the contestant. Please try again.");
      }
    }
  };

  const handleCreateContestant = (pollId) => {
    navigate(`/create/${pollId}/contestants/`);
  };

  const handleEditPoll = (pollId) => {
    navigate(`/edit/poll/${pollId}`);
  };

  const handleEditContestant = (pollId, contestantId) => {
    navigate(`/polls/${pollId}/contestants/${contestantId}/edit`);
  };

  const filteredPolls = polls.filter(poll => {
    if (filter === 'all') return true;
    return getPollStatus(poll) === filter;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Polls</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Polls</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>
          <a
            href="/create-poll"
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
          >
            Create New Poll
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="loader border-4 border-t-4 border-gray-300 h-12 w-12 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 mt-4 rounded"
          >
            Retry
          </button>
        </div>
      ) : filteredPolls.length === 0 ? (
        <p className="text-center text-gray-700 py-8">No polls found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Poll Type</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolls.map((poll, index) => {
                const status = getPollStatus(poll);
                const isEnded = status === 'ended';
                const contestants = pollContestants[poll.id] || [];
                
                return (
                  <React.Fragment key={poll.id}>
                    <tr className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-gray-100`}>
                      <td className="p-3">
                        <div className="font-medium">{poll.title}</div>
                        <div className="text-sm text-gray-500">
                          {contestants.length} contestants
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(status)}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div>Start: {new Date(poll.start_time).toLocaleString()}</div>
                          <div>End: {new Date(poll.end_time).toLocaleString()}</div>
                          <div className="text-xs font-medium mt-1">
                            {getTimeRemaining(poll)}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{poll.poll_type}</td>
                      <td className="p-3">
                        <div className="flex flex-col items-center space-y-2">
                          {!isEnded && (
                            <>
                              <button
                                onClick={() => handleCreateContestant(poll.id)}
                                className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 w-full"
                                title={isEnded ? "Cannot add contestants to ended polls" : "Add a new contestant"}
                              >
                                Add Contestant
                              </button>
                              <button
                                onClick={() => navigate(`/polls/${poll.id}/manage-contestants`)}
                                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 w-full"
                              >
                                Manage Contestants ({pollContestants[poll.id]?.length || 0})
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEditPoll(poll.id)}
                            className={`${
                              isEnded ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                            } text-white px-3 py-1 rounded w-full`}
                            disabled={isEnded}
                            title={isEnded ? "Cannot edit ended polls" : "Edit poll details"}
                          >
                            Edit Poll
                          </button>
                          <button
                            onClick={() => handleDelete(poll.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 w-full"
                            title="Delete this poll"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PollManagement;
