import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";

const PollsList = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const currentDate = new Date();

  // Separate polls into categories
  const upcomingPolls = polls.filter(
    (poll) => new Date(poll.start_time) > currentDate
  );
  const endedPolls = polls.filter(
    (poll) => new Date(poll.end_time) < currentDate
  );
  const activePolls = polls.filter(
    (poll) =>
      new Date(poll.start_time) <= currentDate &&
      new Date(poll.end_time) >= currentDate
  );

  if (loading) {
    return <div className="text-center">Loading polls...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  const renderContestants = (contestants, pollType) => {
    const placeholderImage = "https://via.placeholder.com/150";

    return (
      <ul className="list-disc pl-5 space-y-4">
        {contestants.map((contestant) => (
          <li key={contestant.id} className="flex items-start space-x-4">
            <img
              src={contestant["contestants_images"] || placeholderImage}
              alt={contestant.name || "Contestant"}
              className="w-16 h-16 object-cover rounded-md"
            />
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
      <img
        src={poll["poll_image"] || "https://via.placeholder.com/300"}
        alt={poll.title || "Poll"}
        className="w-full h-48 object-cover rounded-md mt-4"
      />
      <p className="text-sm mt-2">
        Start Time: {new Date(poll.start_time).toLocaleString()}
      </p>
      <p className="text-sm">
        End Time: {new Date(poll.end_time).toLocaleString()}
      </p>
      <p className="text-sm">
        Poll Type:{" "}
        {poll.poll_type === "voters-pay" ? "Voter Pays" : "Creator Pays"}
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* Active Polls */}
      {activePolls.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Active Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePolls.map((poll) => renderPollDetails(poll))}
          </div>
        </div>
      )}

      {/* Upcoming Polls */}
      {upcomingPolls.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Upcoming Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingPolls.map((poll) => renderPollDetails(poll))}
          </div>
        </div>
      )}

      {/* Ended Polls */}
      {endedPolls.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Ended Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {endedPolls.map((poll) => (
              <div
                key={poll.id}
                className="p-4 border rounded-md shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <h3 className="text-md font-semibold">{poll.title}</h3>
                <p>Start Time: {new Date(poll.start_time).toLocaleString()}</p>
                <p>End Time: {new Date(poll.end_time).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PollsList;
