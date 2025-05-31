import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTrophy, FaArrowLeft, FaVoteYea } from "react-icons/fa";
import axiosInstance from "../apis/api";

const ContestantsPage = () => {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [contestants, setContestants] = useState([]);
  const [pollTitle, setPollTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [votes, setVotes] = useState("");
  const [voterCode, setVoterCode] = useState("");
  const [pollType, setPollType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pollDescription, setPollDescription] = useState("");

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [contestantsResponse, pollResponse] = await Promise.all([
          axiosInstance.get(`polls/${pollId}/contestants/`),
          axiosInstance.get(`polls/${pollId}/`)
        ]);

        console.log('Poll Response:', pollResponse.data);
        const type = pollResponse.data.poll_type || pollResponse.data.poll?.poll_type || "";
        console.log('Setting poll type to:', type);

        setContestants(contestantsResponse.data);
        setPollTitle(pollResponse.data.title || "");
        setPollDescription(pollResponse.data.description || "");
        setPollType(type);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.response?.data?.message || error.response?.data?.detail || "Error fetching poll details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pollId]);

  const groupedContestants = contestants
    .filter(
      (contestant) =>
        contestant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contestant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contestant.nominee_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reduce((acc, contestant) => {
      const category = contestant.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(contestant);
      return acc;
    }, {});

  const handleVoteClick = (nomineeCode) => {
    setSelectedNominee(nomineeCode);
    setModalOpen(true);
    setError("");
    setSuccess("");
    setVotes("");
    setVoterCode("");
  };

  const handlePayment = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (pollType === "voters-pay" && (!votes || votes < 1)) {
        setError("Please enter a valid number of votes.");
        return;
      }

      if (pollType === "creator-pay" && !voterCode) {
        setError("Please enter a valid voter code.");
        return;
      }

      const payload = {
        nominee_code: selectedNominee,
        ...(pollType === "voters-pay" ? { 
          number_of_votes: parseInt(votes, 10)
        } : { 
          code: voterCode 
        }),
      };

      const endpoint = pollType === "creator-pay" 
        ? `vote/creator-pay/${pollId}/`
        : `vote/voter-pay/${pollId}/`;

      const response = await axiosInstance.post(endpoint, payload);

      if (pollType === "voters-pay" && response.data.payment_url) {
        // Store payment info in sessionStorage for verification
        sessionStorage.setItem('paymentDetails', JSON.stringify({
          pollId,
          nomineeCode: selectedNominee,
          votes,
          type: 'vote',
          reference: response.data.reference
        }));
        
        // Redirect to payment page
        window.location.href = response.data.payment_url;
      } else if (pollType === "creator-pay") {
        setSuccess("Vote cast successfully.");
        setTimeout(() => {
          setModalOpen(false);
          // clear input fields
          setVotes("");
          setVoterCode("");
          // Redirect to results after a short delay
          navigate('/poll/' + pollId + '/results');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.response?.data?.message || "An error occurred while processing your vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-800 text-white py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{pollTitle}</h1>
          {pollDescription && (
            <p className="text-white/80 max-w-2xl">{pollDescription}</p>
          )}
        </div>
      </header>

      <main className="py-12">
        <div className="container mx-auto px-4">
          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search contestants by name, category, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
              />
            </div>
          </div>

          {/* Advertisement Banner */}
          <div className="w-full flex justify-center mb-8">
            <div style={{ position: "relative" }}>
              <iframe 
                src="https://publisher.linkvertise.com/cdn/ads/LV-728x90/index.html" 
                frameBorder="0" 
                height="250" 
                width="300"
                title="Advertisement"
              />
              <a 
                href="https://publisher.linkvertise.com/ac/1251835" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
                aria-label="Advertisement Link"
              />
            </div>
          </div>

          {/* Contestants Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(groupedContestants).map(([category, categoryContestants]) => (
              <motion.div 
                key={category} 
                className="mb-12"
                variants={itemVariants}
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <FaTrophy className="text-teal-600 mr-2" />
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categoryContestants.map((contestant) => (
                    <motion.div
                      key={contestant.id}
                      variants={itemVariants}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      {contestant.contestant_image && (
                        <div className="relative h-48 w-48 mx-auto -mt-6 transform translate-y-6">
                          <img
                            src={contestant.contestant_image}
                            alt={contestant.name}
                            className="w-full h-full object-cover rounded-full ring-4 ring-white shadow-lg transform hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-4 pt-8 text-center">
                        <h3 className="text-xl font-semibold mb-3">{contestant.name}</h3>
                        <p className="text-gray-500 text-sm mb-4">Code: {contestant.nominee_code}</p>
                        <button
                          onClick={() => handleVoteClick(contestant.nominee_code)}
                          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white text-sm rounded-full hover:bg-teal-700 transition-colors space-x-1 shadow-md hover:shadow-lg"
                        >
                          <FaVoteYea className="w-4 h-4" />
                          <span>Vote</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Results Link */}
          <div className="mt-12 text-center">
            <Link
              to={`/poll/${pollId}/results`}
              className="inline-flex items-center px-8 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              View Live Results
              <FaTrophy className="ml-2" />
            </Link>
          </div>
        </div>
      </main>

      {/* Vote Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-96 max-w-[90%]"
            >
              <h3 className="text-2xl font-bold mb-4">Cast Your Vote</h3>
              {error && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="text-green-500 text-sm mb-4 bg-green-50 p-3 rounded-lg"
                >
                  {success}
                </motion.p>
              )}

              {pollType === "voters-pay" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Votes
                  </label>
                  <input
                    type="number"
                    value={votes}
                    onChange={(e) => setVotes(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="Enter number of votes"
                  />
                </div>
              )}

              {pollType === "creator-pay" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voter Code
                  </label>
                  <input
                    type="text"
                    value={voterCode}
                    onChange={(e) => setVoterCode(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="Enter your voter code"
                  />
                </div>
              )}

              <div className="flex justify-between mt-6 gap-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || (pollType === "voters-pay" && !votes) || (pollType === "creator-pay" && !voterCode)}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Submit Vote"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContestantsPage;
