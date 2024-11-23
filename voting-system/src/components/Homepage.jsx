// import { useState } from "react";
import { Link } from "react-router-dom";
import LaptopImage from "../assets/laptopandphone.png"

const Homepage = () => {




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
            {[1, 2, 3].map((event) => (
              <div
                key={event}
                className="relative h-64 md:h-80 w-full cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <img
                  src={`https://via.placeholder.com/400x400`}
                  alt={`Event ${event}`}
                  className="absolute inset-0 object-cover w-full h-full rounded-xl shadow-lg"
                />
              </div>
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
              Past Events
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((event) => (
              <div
                key={event}
                className="relative h-64 md:h-80 w-full cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <img
                  src={`https://via.placeholder.com/400x400`}
                  alt={`Event ${event}`}
                  className="absolute inset-0 object-cover w-full h-full rounded-xl shadow-lg"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
