import { useState } from "react";
import axiosInstance from "../apis/api";
import PropTypes from "prop-types";

const VoterPayVote = ({ pollId, nomineeCode, onClose, onError }) => {
  const [voteCount, setVoteCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentLink, setPaymentLink] = useState("");

  const handleGeneratePaymentLink = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(`polls/${pollId}/payment/`, {
        nominee_code: nomineeCode,
        votes: parseInt(voteCount, 10),
      });

      setPaymentLink(response.data.payment_url);
    } catch (err) {
      const message = err.response?.data?.error || "An error occurred.";
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-80">
        <h3 className="text-xl font-semibold mb-4">Enter Vote Count</h3>
        <input
          type="number"
          value={voteCount}
          onChange={(e) => setVoteCount(e.target.value)}
          placeholder="Number of votes"
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {paymentLink ? (
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition"
          >
            Proceed to Payment
          </a>
        ) : (
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleGeneratePaymentLink}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              disabled={loading}
            >
              {loading ? "Processing..." : "Generate Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterPayVote;

VoterPayVote.propTypes = {
  pollId: PropTypes.number.isRequired,
  nomineeCode: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};
