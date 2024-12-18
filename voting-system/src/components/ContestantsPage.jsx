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
  const [voterCode, setVoterCode] = useState("");
  const [voteCount, setVoteCount] = useState("");

  useEffect(() => {
    const fetchContestants = async () => {
      try {
        const response = await axiosInstance.get(
          `polls/${pollId}/contestants/`
        );
        setContestants(response.data.contestants);
        setPollTitle(response.data.poll_title);
      } catch (error) {
        console.error("Error fetching contestants:", error);
      }
    };

    fetchContestants();
  }, [pollId]);

  const openModal = (nomineeCode) => {
    setSelectedNominee(nomineeCode);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setVoterCode("");
    setVoteCount("");
    setSelectedNominee(null);
  };

  const handleVote = async () => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      // Determine payload based on poll type
      const payload = pollId.startsWith("voters-pay")
        ? { nominee_code: selectedNominee, votes: parseInt(voteCount, 10) }
        : { code: voterCode, nominee_code: selectedNominee };

      // Send vote request
      const response = await axiosInstance.post(`vote/${pollId}/`, payload);

      setSuccess(response.data.message || "Vote cast successfully!");
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while voting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-500 to-teal-500 text-white py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">{pollTitle}</h1>
        </div>
      </header>

      {/* Contestants Section */}
      <main className="py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Contestants</h2>

          {/* Success or Error Messages */}

          {contestants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {contestants.map((contestant) => (
                <div
                  key={contestant.nominee_code}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300"
                >
                  <img
                    src={`http://localhost:8000${contestant.image}`}
                    alt={contestant.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{contestant.name}</h3>
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
          ) : (
            <p className="text-center text-gray-500">No contestants found.</p>
          )}
        </div>
      </main>

      {/* Modal */}
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
            <h3 className="text-xl font-semibold mb-4">
              {pollId.startsWith("voters-pay")
                ? "Enter Number of Votes"
                : "Enter Voter Code"}
            </h3>
            {pollId.startsWith("voters-pay") ? (
              <input
                type="number"
                value={voteCount}
                onChange={(e) => setVoteCount(e.target.value)}
                placeholder="Number of votes"
                className="w-full px-4 py-2 border rounded-lg mb-4"
              />
            ) : (
              <input
                type="text"
                value={voterCode}
                onChange={(e) => setVoterCode(e.target.value)}
                placeholder="Voter code"
                className="w-full px-4 py-2 border rounded-lg mb-4"
              />
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
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
        to={"/"}
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <FaArrowAltCircleLeft className="mx-3" />
        Back
      </Link>
    </div>
  );
};

export default ContestantsPage;
