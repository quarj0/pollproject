import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowAltCircleLeft } from "react-icons/fa";
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
  const [votes, setVotes] = useState(1);
  const [voterCode, setVoterCode] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [pollType, setPollType] = useState("");
  const [groupedContestants, setGroupedContestants] = useState({});
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

  useEffect(() => {
    if (contestants.length > 0) {
      const grouped = contestants.reduce((acc, contestant) => {
        const category = contestant.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(contestant);
        return acc;
      }, {});
      setGroupedContestants(grouped);
    }
  }, [contestants]);

  const openModal = (nomineeCode) => {
    setSelectedNominee(nomineeCode);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setVotes(1);
    setSelectedNominee(null);
    setVoterCode("");
  };

  const handlePayment = async () => {
    setError("");
    setSuccess("");

    if (votes < 1) {
      setError("Please enter a valid number of votes.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nominee_code: selectedNominee,
        votes,
        voter_code: voterCode,
      };

      const endpoint =
        pollType === "creator-pay"
          ? `vote/creator-pay/${pollId}/`
          : `vote/voters-pay/${pollId}/`;

      const response = await axiosInstance.post(endpoint, payload);
      if (pollType === "voters-pay") {
        setPaymentUrl(response.data.payment_url);
      } else {
        setSuccess("Vote cast successfully.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "An error occurred during payment."
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

  const filteredContestants = contestants.filter((contestant) =>
    contestant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-500 to-teal-500 text-white py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">{pollTitle}</h1>
        </div>
      </header>

      <main className="py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Contestants</h2>
          <input
            type="text"
            placeholder="Search contestants"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-6"
          />

          {Object.keys(groupedContestants).length > 0 ? (
            Object.keys(groupedContestants).map((category) => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold text-teal-600 mb-4">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {groupedContestants[category].map((contestant) => (
                    <div
                      key={contestant.nominee_code}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300"
                    >
                      <img
                        src={`http://localhost:8000${
                          contestant.image || "/default-placeholder.png"
                        }`}
                        alt={contestant.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold">
                          {contestant.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2">
                          Nominee Code: {contestant.nominee_code}
                        </p>
                        <button
                          className="mt-4 w-1/2 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-900 transition"
                          onClick={() => openModal(contestant.nominee_code)}
                        >
                          Vote for {contestant.nominee_code}
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

          <div className="mt-6 text-center">
            <Link
              to={`/poll/${pollId}/results`}
              className="bg-teal-600 text-white py-2 px-6 rounded-lg hover:bg-teal-900 transition"
            >
              View Results
            </Link>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            {success && (
              <p className="text-center text-green-600 font-medium">
                {success}
              </p>
            )}
            {error && (
              <p className="text-center text-red-600 font-medium">{error}</p>
            )}

            {pollType === "voters-pay" ? (
              <>
                <h3 className="text-xl font-semibold mb-4">
                  Enter Number of Votes
                </h3>
                <input
                  type="number"
                  value={votes}
                  onChange={(e) => setVotes(e.target.value)}
                  min="1"
                  placeholder="Number of votes"
                  className="w-full px-4 py-2 border rounded-lg mb-4"
                />
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-4">
                  Enter Your Voter Code
                </h3>
                <input
                  type="text"
                  value={voterCode}
                  onChange={(e) => setVoterCode(e.target.value)}
                  placeholder="Voter code"
                  className="w-full px-4 py-2 border rounded-lg mb-4"
                />
              </>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                disabled={loading}
              >
                {loading ? "Processing..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link
        to={"/home"}
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <FaArrowAltCircleLeft className="mx-3" />
        Back
      </Link>
    </div>
  );
};

export default ContestantsPage;
