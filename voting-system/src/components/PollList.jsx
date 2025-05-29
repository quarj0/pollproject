import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";

const PollsList = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState(new Set());

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("polls/list/");
        setPolls(response.data);
      } catch (error) {
        setError("Error fetching polls. Please try again later.");
        console.error("Error fetching polls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const handleImageError = (id) => {
    setImageErrors(prev => new Set([...prev, id]));
  };

  const renderContestants = (contestants, pollType) => {
    return (
      <ul className="list-disc pl-5 space-y-4">
        {contestants.map((contestant) => (
          <li key={contestant.id} className="flex items-start space-x-4">
            <div className="w-16 h-16 relative bg-gray-100 rounded-md overflow-hidden">
              <img
                src={(contestant.image || contestant.image?.url) || "https://via.placeholder.com/300"}
                alt={contestant.name || "Contestant"}
                className={`w-full h-full object-cover ${imageErrors.has(contestant.id) ? 'opacity-50' : ''}`}
                onError={() => handleImageError(contestant.id)}
              />
              {imageErrors.has(contestant.id) && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <span className="text-sm">No Image</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-md font-semibold">{contestant.name}</p>
              {pollType === "creator-pay" && (
                <p className="text-sm text-gray-600">
                  Nominee Code: {contestant.nominee_code}
                </p>
              )}
              <button
                className="mt-2 bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600 transition duration-200"
                onClick={() => console.log(`Vote for ${contestant.name}`)}
              >
                Vote
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderPollDetails = (poll) => (
    <div
      key={poll.id}
      className="p-4 border rounded-md shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <h3 className="text-lg font-bold">{poll.title}</h3>
      <p className="text-sm text-gray-700">
        {poll.description || "No description available."}
      </p>
      <div className="relative w-full h-48 bg-gray-100 rounded-md mt-4 overflow-hidden">
        <img
          src={(poll.poll_image) || "https://via.placeholder.com/300"}
          alt={poll.title || "Poll"}
          className={`w-full h-full object-cover ${imageErrors.has(poll.id) ? 'opacity-50' : ''}`}
          onError={() => handleImageError(poll.id)}
        />
        {imageErrors.has(poll.id) && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <span>No Image Available</span>
          </div>
        )}
      </div>
      <p className="text-sm mt-2">
        Start Time: {new Date(poll.start_time).toLocaleString()}
      </p>
      <p className="text-sm">
        End Time: {new Date(poll.end_time).toLocaleString()}
      </p>
      <p className="text-sm">
        Poll Type: {poll.poll_type === "voters-pay" ? "Voter Pays" : "Creator Pays"}
      </p>
      {poll.poll_type === "voters-pay" && (
        <p className="text-sm">Voting Fee: ${poll.voting_fee}</p>
      )}
      {poll.poll_type === "creator-pay" && (
        <p className="text-sm">
          Expected Voters: {poll.expected_voters || "N/A"}
        </p>
      )}
      <div className="mt-4">
        <h4 className="text-md font-semibold">Contestants:</h4>
        {renderContestants(poll.contestants || [], poll.poll_type)}
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-center">Loading polls...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* Active Polls */}
      {polls.filter(poll => new Date(poll.start_time) <= new Date() && new Date(poll.end_time) >= new Date()).length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Active Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.filter(poll => new Date(poll.start_time) <= new Date() && new Date(poll.end_time) >= new Date()).map(renderPollDetails)}
          </div>
        </div>
      )}

      {/* Upcoming Polls */}
      {polls.filter(poll => new Date(poll.start_time) > new Date()).length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Upcoming Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.filter(poll => new Date(poll.start_time) > new Date()).map(renderPollDetails)}
          </div>
        </div>
      )}

      {/* Ended Polls */}
      {polls.filter(poll => new Date(poll.end_time) < new Date()).length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Ended Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.filter(poll => new Date(poll.end_time) < new Date()).map(renderPollDetails)}
          </div>
        </div>
      )}
    </div>
  );
};

export default PollsList;
