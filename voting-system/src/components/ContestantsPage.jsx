import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosInstance from "../apis/api";

const ContestantsPage = () => {
  const { pollId } = useParams();
  const [contestants, setContestants] = useState([]);
  const [pollTitle, setPollTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [votes, setVotes] = useState("");
  const [voterCode, setVoterCode] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [pollType, setPollType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPollDetails = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`polls/${pollId}/`);
        setPollTitle(response.data.title);
        setPollType(response.data.poll_type);
      } catch {
        setError("Error fetching poll details.");
      } finally {
        setLoading(false);
      }
    };

    const fetchContestants = async () => {
      try {
        const response = await axiosInstance.get(
          `polls/${pollId}/contestants/`
        );
        setContestants(response.data.contestants);
      } catch {
        setError("Error fetching contestants.");
      }
    };

    fetchPollDetails();
    fetchContestants();
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

  const openModal = (nomineeCode) => {
    setSelectedNominee(nomineeCode);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setVotes("");
    setVoterCode("");
    setSelectedNominee(null);
  };

  const handlePayment = async () => {
    setError("");
    setSuccess("");

    if (pollType === "voters-pay" && votes < 1) {
      setError("Please enter a valid number of votes.");
      return;
    }

    if (pollType === "creator-pay" && !voterCode) {
      setError("Please enter a valid voter code.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nominee_code: selectedNominee,
        ...(pollType === "voters-pay" ? { votes } : { voter_code: voterCode }),
      };

      const endpoint =
        pollType === "creator-pay"
          ? `vote/creator-pay/${pollId}/`
          : `vote/voter-pay/${pollId}/`;

      const response = await axiosInstance.post(endpoint, payload);

      if (pollType === "voters-pay") {
        setPaymentUrl(response.data.payment_url);
      } else {
        setSuccess("Vote cast successfully.");
        closeModal(); // Reset the form for creator-pay
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "An error occurred during the vote process."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  }, [paymentUrl]);

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

          {Object.keys(groupedContestants).length > 0 ? (
            Object.keys(groupedContestants).map((category) => (
              <div key={category} className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {groupedContestants[category].map((contestant) => (
                    <div
                      key={contestant.nominee_code}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition duration-300 overflow-hidden"
                    >
                      <img
                        src={
                          contestant.image
                            ? `http://localhost:8000${contestant.image}`
                            : "https://via.placeholder.com/300"
                        }
                        alt={contestant.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900">
                          {contestant.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Nominee Code: {contestant.nominee_code}
                        </p>
                        <button
                          onClick={() => openModal(contestant.nominee_code)}
                          className="mt-4 w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-800 transition"
                        >
                          Vote
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No contestants found.</p>
          )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-xl font-bold mb-4">Submit Your Vote</h3>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}

            {/* Conditional rendering based on pollType */}
            {pollType === "voters-pay" ? (
              <input
                type="number"
                value={votes}
                onChange={(e) => setVotes(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border rounded-lg mb-4"
                placeholder="Number of Votes"
              />
            ) : pollType === "creator-pay" ? (
              <input
                type="text"
                value={voterCode}
                onChange={(e) => setVoterCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-4"
                placeholder="Voter Code"
              />
            ) : null}

            <div className="flex justify-between">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                disabled={
                  loading ||
                  (pollType === "voters-pay" && votes < 1) ||
                  (pollType === "creator-pay" && !voterCode)
                }
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
