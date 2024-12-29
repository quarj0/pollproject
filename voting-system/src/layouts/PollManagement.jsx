import { useEffect, useState } from "react";
import axiosInstance from "../apis/api";

const PollManagement = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const res = await axiosInstance.get("/polls/list/");
        setPolls(res.data);
      } catch {
        setError("Failed to fetch polls. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  const handleDelete = async (pollId) => {
    if (!window.confirm("Are you sure you want to delete this poll?")) return;
    try {
      await axiosInstance.delete(`/polls/${pollId}/delete/`);
      setPolls((prev) => prev.filter((poll) => poll.id !== pollId));
    } catch {
      alert("Failed to delete the poll. Please try again.");
    }
  };

  const handleCreateContestant = (pollId) => {
    window.location.href = `/create/${pollId}/contestants/`;
  };

  const handleEditPoll = (pollId) => {
    window.location.href = `/edit/poll/${pollId}`;
  };

  const handleEditContestant = (pollId) => {
    window.location.href = `/edit/contestant/${pollId}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Manage Polls</h1>

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
      ) : polls.length === 0 ? (
        <p className="text-center text-gray-700">No polls found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Start Time</th>
                <th className="p-3 text-left">End Time</th>
                <th className="p-3 text-left">Poll Type</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((poll, index) => (
                <tr
                  key={poll.id}
                  className={`${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-gray-100`}
                >
                  <td className="p-3">{poll.title}</td>
                  <td className="p-3">
                    {new Date(poll.start_time).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {new Date(poll.end_time).toLocaleString()}
                  </td>
                  <td className="p-3">{poll.poll_type}</td>

                  <td className="p-3 flex justify-center space-x-2">
                    <button
                      onClick={() => handleCreateContestant(poll.id)}
                      className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                    >
                      Add Contestant
                    </button>
                    <button
                      onClick={() => handleEditPoll(poll.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Edit Poll
                    </button>
                    <button
                      onClick={() => handleEditContestant(poll.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Edit Contestant
                    </button>
                    <button
                      onClick={() => handleDelete(poll.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6 text-center">
        <a
          href="/create-poll"
          className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600"
        >
          Create New Poll
        </a>
      </div>
    </div>
  );
};

export default PollManagement;
