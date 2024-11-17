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

  // Separate polls into upcoming and ended
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
    return <div>Loading polls...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Active Polls */}
      {activePolls.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Active Polls</h2>
          <div className="space-y-4">
            {activePolls.map((poll) => (
              <div key={poll.id} className="p-4 border rounded-md">
                <h3 className="text-md font-semibold">{poll.title}</h3>
                <p>Start Time: {new Date(poll.start_time).toLocaleString()}</p>
                <p>End Time: {new Date(poll.end_time).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Polls */}
      {upcomingPolls.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Upcoming Polls</h2>
          <div className="space-y-4">
            {upcomingPolls.map((poll) => (
              <div key={poll.id} className="p-4 border rounded-md">
                <h3 className="text-md font-semibold">{poll.title}</h3>
                <p>Start Time: {new Date(poll.start_time).toLocaleString()}</p>
                <p>End Time: {new Date(poll.end_time).toLocaleString()}</p>
              </div>
            ))}
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
