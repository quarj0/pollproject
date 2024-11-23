import PollImage from "../assets/rb_4190.png";
import PastPollImage from "../assets/voter-registeration.jpg";
import PollsList from "./PollList";
const Homepage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center h-screen flex items-center justify-end px-8"
        style={{ backgroundImage: `url(${PollImage})`, opacity: 0.6 }}
      >
        <div className="max-w-lg bg-white bg-opacity-70 p-8 rounded shadow-lg">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to PollMaster
          </h1>
          <p className="text-gray-600 mb-6">
            Create, vote, and explore exciting polls and events!
          </p>
          <a
            href="/create-poll"
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
          >
            Create Poll
          </a>
        </div>
      </section>
      <PollsList /> 

      {/* Search Bar */}
      <section className="py-10 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Search for an Event
          </h2>
          <form className="flex max-w-2xl mx-auto shadow-md">
            <input
              type="text"
              placeholder="Search for a poll or event..."
              className="w-full p-3 rounded-l border border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
            />
            <button className="bg-blue-600 text-white px-6 rounded-r hover:bg-blue-700 transition">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Live/Upcoming Events */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Upcoming & Ongoing Polls</h2>
            <a href="#upcoming" className="text-blue-600 hover:underline">
              View All
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Example Card */}
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="relative bg-cover bg-center rounded-lg overflow-hidden shadow-lg"
                style={{ backgroundImage: `url(${PastPollImage})` }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-50 p-4 flex flex-col justify-between">
                  <h3 className="text-white text-lg font-bold">
                    Poll Title {i + 1}
                  </h3>
                  <div className="text-sm text-gray-200">
                    <p>Category: Business</p>
                    <p>Ends in: 2 days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section id="register" className="py-10 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Want to Create Your Own Poll?
          </h2>
          <p className="mb-6">
            Register now and start creating exciting events and polls!
          </p>
          <a
            href="/register"
            className="bg-white text-blue-600 px-6 py-3 rounded shadow hover:bg-gray-100 transition"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* Past Events */}
      <section className="py-10 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Past Polls</h2>
            <a href="#past" className="text-blue-600 hover:underline">
              View All
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Example Card */}
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="relative bg-cover bg-center rounded-lg overflow-hidden shadow-lg"
                style={{
                  backgroundImage: "url('/path-to-past-poll-image.jpg')",
                }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-50 p-4 flex flex-col justify-between">
                  <h3 className="text-white text-lg font-bold">
                    Poll Title {i + 1}
                  </h3>
                  <div className="text-sm text-gray-200">
                    <p>Category: Sports</p>
                    <p>Ended: November 15, 2024</p>
                  </div>
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
