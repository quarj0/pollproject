import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
        setPollType(type);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Error fetching poll details.");
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
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while processing your vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-teal-600 text-white py-4">
        <div className="container-fluid mx-auto px-4">
          <h1 className="text-xl font-bold">{pollTitle}</h1>
        </div>
      </header>

      <main className="py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Contestants
          </h2>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search contestants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {Object.entries(groupedContestants).map(([category, categoryContestants]) => (
            <div key={category} className="mb-8">
              <h2 className="text-2xl font-bold mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryContestants.map((contestant) => (
                  <div key={contestant.id} className="bg-white rounded-lg shadow-md p-4">
                    {contestant.contestant_image && (
                      <img
                        src={contestant.contestant_image}
                        alt={contestant.name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h3 className="text-xl font-semibold mb-2">{contestant.name}</h3>
                    <p className="text-gray-600 mb-2">Code: {contestant.nominee_code}</p>
                    <button
                      onClick={() => handleVoteClick(contestant.nominee_code)}
                      className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition"
                    >
                      Vote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            to={`/poll/${pollId}/results`}
            className="bg-teal-600 text-white py-2 px-6 rounded-lg hover:bg-teal-900 transition"
          >
            View Results
          </Link>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 max-w-[90%]">
            <h3 className="text-xl font-bold mb-4">Submit Your Vote</h3>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {success && <p className="text-green-500 text-sm mb-4">{success}</p>}

            {pollType === "voters-pay" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Votes
                </label>
                <input
                  type="number"
                  value={votes}
                  onChange={(e) => setVotes(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter number of votes"
                />
              </div>
            )}

            {pollType === "creator-pay" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voter Code
                </label>
                <input
                  type="text"
                  value={voterCode}
                  onChange={(e) => setVoterCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter your voter code"
                />
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={loading || (pollType === "voters-pay" && !votes) || (pollType === "creator-pay" && !voterCode)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestantsPage;
