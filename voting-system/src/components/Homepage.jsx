import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../apis/api";
import LaptopImage from "../assets/laptopandphone.png";
import PollCard from "../layouts/PollCard";
import VoteDemo from "./demo/VoteDemo";
import { FaVoteYea, FaChartLine, FaShieldAlt, FaMobileAlt } from "react-icons/fa";
import PropTypes from "prop-types";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div 
    className="p-6 bg-white rounded-xl shadow-soft-xl hover:shadow-soft-2xl transition-shadow"
    whileHover={{ y: -5 }}
  >
    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-primary-600" />
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </motion.div>
);

FeatureCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

const Homepage = () => {
  const [upcomingPolls, setUpcomingPolls] = useState([]);
  const [pastPolls, setPastPolls] = useState([]);
  const [filteredPolls, setFilteredPolls] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Fetch the first three upcoming/ongoing polls and past polls
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("polls/list/");

        const currentDateTime = new Date();
        const filteredUpcomingPolls = response.data
          .filter((poll) => {
            const endTime = new Date(poll.end_time).getTime();
            return currentDateTime <= endTime;
          })
          .slice(0, 3);

        const filteredPastPolls = response.data
          .filter((poll) => new Date(poll.start_time) <= currentDateTime)
          .slice(0, 10);

        setUpcomingPolls(filteredUpcomingPolls);
        setPastPolls(filteredPastPolls);
        setFilteredPolls(response.data); 
      } catch (error) {
        console.error("Error fetching polls:", error);
      }
    };

    fetchPolls();
  }, []);

  // Handle Search Input
  const handleSearch = (event) => {
    const searchValue = event.target.value.toLowerCase();
    setSearchTerm(searchValue);

    const combinedPolls = [...upcomingPolls, ...pastPolls];
    const searchResults = combinedPolls.filter((poll) =>
      poll.title.toLowerCase().includes(searchValue)
    );

    setFilteredPolls(searchResults);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-12 lg:pt-[120px] lg:pb-[90px]">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center -mx-4">
            <motion.div 
              className="w-full lg:w-1/2 px-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-12 lg:mb-0">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                  Create and Manage <br />
                  <span className="text-primary-600">Professional Polls</span> <br />
                  with Ease
                </h1>
                <p className="text-gray-600 text-lg mb-8 max-w-lg">
                  Create engaging polls, collect votes securely, and analyze results in real-time. Perfect for events, competitions, and decision-making.
                </p>
                <div className="flex flex-wrap items-center">
                  <Link
                    to="/register"
                    className="inline-flex px-8 py-4 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 mr-4 mb-4 lg:mb-0"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="#demo"
                    className="inline-flex px-8 py-4 text-base font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-lg transition-colors duration-200"
                  >
                    Watch Demo
                  </Link>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="w-full lg:w-1/2 px-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img
                src={LaptopImage}
                alt="Voting System Dashboard"
                className="rounded-xl shadow-soft-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Choose Our Platform</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience the most comprehensive and user-friendly voting system designed for modern needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={FaVoteYea}
              title="Easy Voting"
              description="Simple and intuitive voting process for all participants"
            />
            <FeatureCard
              icon={FaChartLine}
              title="Real-time Results"
              description="Watch live as votes come in with instant updates"
            />
            <FeatureCard
              icon={FaShieldAlt}
              title="Secure & Private"
              description="Enterprise-grade security to protect your data"
            />
            <FeatureCard
              icon={FaMobileAlt}
              title="Mobile Ready"
              description="Vote from any device with our responsive design"
            />
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo">
        <VoteDemo />
      </section>

      {/* Search Bar */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Find Active Polls</h2>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search for polls..."
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow duration-200 shadow-soft-xl"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {searchTerm && (
        <section className="py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
              Search Results
            </h2>
            {filteredPolls.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredPolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    item={{
                      title: poll.title,
                      description: poll.description,
                      image: poll.poll_image,
                    }}
                    linkTo={`/polls/${poll.id}/details`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                No polls match your search.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Active Polls Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
              <p className="text-gray-600">Discover and participate in our latest polls</p>
            </div>
            <Link
              to="/events"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg shadow-soft-xl hover:shadow-soft-2xl transition-shadow"
            >
              View All Events
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingPolls.map((poll) => (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <PollCard
                  item={{
                    title: poll.title,
                    description: poll.description,
                    image: poll.poll_image,
                  }}
                  linkTo={`/polls/${poll.id}/contestants`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to Create Your Next Poll?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-lg">
                Join thousands of organizers who trust our platform for their voting needs. Create your poll in minutes and engage with your audience.
              </p>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 bg-white text-primary-600 rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow"
                >
                  Get Started Free
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </motion.div>
            </motion.div>
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img
                src={LaptopImage}
                alt="Create Poll"
                className="rounded-xl shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Past Events Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Past Events</h2>
              <p className="text-gray-600">Explore our successfully completed polls</p>
            </div>
            <Link
              to="/past/events"
              className="inline-flex items-center px-6 py-3 bg-gray-50 text-gray-700 rounded-lg shadow-soft-xl hover:shadow-soft-2xl transition-shadow"
            >
              View Archive
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {pastPolls.map((poll) => (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <PollCard
                  item={{
                    title: poll.title,
                    description: poll.description,
                    image: poll.poll_image,
                  }}
                  linkTo={`/polls/${poll.id}/details`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
