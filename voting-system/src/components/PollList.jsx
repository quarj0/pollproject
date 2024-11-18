import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";

const PollsList = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("polls/list/");
        setPolls(response.data);
      } catch (error) {
        console.error("Error fetching polls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const currentDate = new Date();

  // Separate polls into active, upcoming, and ended
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

  const renderContestants = (contestants, pollType) => {
    const placeholderImage = "https://via.placeholder.com/150";

    return (
      <ul className="list-disc pl-5">
        {contestants.map((contestant) => (
          <li key={contestant.id} className="mb-4 flex items-start space-x-4">
            <img
              src={contestant.image || placeholderImage}
              alt={contestant.name}
              className="w-16 h-16 object-cover rounded-md"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {contestant.name} ({contestant.category}) - {contestant.award}
                </span>
                <button
                  className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600 transition duration-200"
                  onClick={() => console.log(`Vote for ${contestant.name}`)}
                >
                  Vote
                </button>
              </div>
              {pollType === "creator-pay" && (
                <p className="text-sm text-gray-600">
                  Nominee Code: {contestant.nominee_code}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderPollDetails = (poll) => (
    <div className="p-4 border rounded-md">
      <h3 className="text-md font-semibold">{poll.title}</h3>
      <p>Description: {poll.description}</p>
      <p>Start Time: {new Date(poll.start_time).toLocaleString()}</p>
      <p>End Time: {new Date(poll.end_time).toLocaleString()}</p>
      <p>
        Poll Type:{" "}
        {poll.poll_type === "voters-pay" ? "Voter Pays" : "Creator Pays"}
      </p>
      {poll.poll_type === "voters-pay" && <p>Voting Fee: ${poll.voting_fee}</p>}
      {poll.poll_type === "creator-pay" && (
        <p>Expected Voters: {poll.expected_voters || "N/A"}</p>
      )}
      <div className="mt-4">
        <h4 className="text-md font-semibold">Contestants:</h4>
        {renderContestants(poll.contestants, poll.poll_type)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      {/* Active Polls */}
      {activePolls.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Active Polls</h2>
          <div className="space-y-4">
            {activePolls.map((poll) => renderPollDetails(poll))}
          </div>
        </div>
      )}

      {/* Upcoming Polls */}
      {upcomingPolls.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Upcoming Polls</h2>
          <div className="space-y-4">
            {upcomingPolls.map((poll) => renderPollDetails(poll))}
          </div>
        </div>
      )}

      {/* Ended Polls */}
      {endedPolls.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Ended Polls</h2>
          <div className="space-y-4">
            {endedPolls.map((poll) => (
              <div key={poll.id} className="p-4 border rounded-md">
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
