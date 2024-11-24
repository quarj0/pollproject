import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../apis/api";
import LaptopImage from "../assets/laptopandphone.png";

const Homepage = () => {
  const [upcomingPolls, setUpcomingPolls] = useState([]);
  const [pastPolls, setPastPolls] = useState([]);

  // Fetch the first three upcoming/ongoing polls and past polls
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("polls/list/");

        // Filter and slice polls
        const currentDateTime = new Date();
        const filteredUpcomingPolls = response.data
          .filter((poll) => {
            const startTime = new Date(poll.start_time);
            const endTime = new Date(poll.end_time);
            return currentDateTime >= startTime && currentDateTime <= endTime;
          })
          .slice(0, 3);

        const filteredPastPolls = response.data
          .filter((poll) => new Date(poll.start_time) <= currentDateTime)
          .slice(0, 10);

        setUpcomingPolls(filteredUpcomingPolls);
        setPastPolls(filteredPastPolls);
      } catch (error) {
        console.error("Error fetching polls:", error);
      }
    };

    fetchPolls();
  }, []);

  return (
    <div>
      {/* Search Bar */}
      <section className="py-10 bg-gray-50">
        <div className="container mx-auto px-4">
          <p className="font-mono text-center text-gray-500 my-1 text-sm md:text-base">
            Search for your specific poll with the name
          </p>
          <div className="flex justify-center mt-4">
            <input
              type="text"
              // value={searchTerm}
              // onChange={handleSearch}
              placeholder="Search for polls..."
              className="w-full max-w-lg px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </section>

      {/* Events Section */}
      {/* Upcoming Events Section */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/events"
              className="text-yellow-600 border-2 border-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-500 hover:text-white transition-all"
            >
              All Events
            </Link>
            <h2 className="text-2xl md:text-3xl font-bold text-center">
              Upcoming Events
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {upcomingPolls.map((poll) => (
              <Link
                to={`/polls/${poll.id}/contestants`}
                key={poll.title}
                className="relative h-64 md:h-80 w-full cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <img
                  src={
                    poll.poll_image
                      ? `http://localhost:8000${poll.poll_image}`
                      : "https://via.placeholder.com/300"
                  }
                  alt={poll.title}
                  className="absolute inset-0 object-cover w-full h-full rounded-xl shadow-lg"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 text-white flex flex-col justify-between p-4 rounded-xl">
                  <h3 className="text-lg font-bold">{poll.title}</h3>
                  <p className="text-sm">{poll.description}</p>
                  <span className="text-xs">
                    {new Date(poll.start_time).toLocaleDateString()} -{" "}
                    {new Date(poll.start_time).toLocaleTimeString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-teal-800 to-blue-950 text-white py-10 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-16">
          {/* Left Section: Text */}
          <div className="md:w-1/2 text-center md:text-left">
            <h2 className="text-6xl font-bold mb-4 font-poppins">
              Create Your <span className="text-yellow-500">Event</span> Today
            </h2>
            <p className="mb-6 text-lg">
              Create an interactive poll and engage with your audience in
              real-time.
            </p>
            <a
              href="/register"
              className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition"
            >
              Register Now
            </a>
          </div>

          {/* Right Section: Image */}
          <div className="md:w-1/2 flex justify-center mt-6 md:mt-0">
            <img
              src={LaptopImage}
              alt="Join Us Illustration"
              className="w-full max-w-md rounded-2xl"
            />
          </div>
        </div>
      </section>

      {/* Past Events Section */}

      {/* Past Events Section */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/past/events"
              className="text-yellow-600 border-2 border-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-500 hover:text-white transition-all"
            >
              All Events
            </Link>
            <h2 className="text-2xl md:text-3xl font-bold text-center">
              Past Events
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pastPolls.map((poll) => (
              <div
                key={poll.title}
                className="relative h-64 md:h-80 w-full cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <img
                  src={`http://localhost:8000/${poll.poll_image}`}
                  alt={poll.title}
                  className="absolute inset-0 object-cover w-full h-full rounded-xl shadow-lg"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 text-white flex flex-col justify-between p-4 rounded-xl">
                  <h3 className="text-lg font-bold">{poll.title}</h3>
                  <p className="text-sm">{poll.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
