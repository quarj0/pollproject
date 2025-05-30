import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";

const PaymentLinkGenerator = () => {
  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [paymentLink, setPaymentLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axiosInstance.get("/polls/list/", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        setPolls(response.data);
      } catch {
        setError("Failed to fetch polls.");
      }
    };

    fetchPolls();
  }, []);

  const fetchPaymentLink = async () => {
    if (!selectedPollId) {
      setError("Please select a poll.");
      return;
    }

    setLoading(true);
    setError("");
    setPaymentLink("");

    try {
      const response = await axiosInstance.get(
        `/payment/poll/${selectedPollId}/link/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.data?.payment_link) {
        setPaymentLink(response.data.payment_link);
      } else {
        setError(response.data?.message || "An unexpected error occurred.");
      }
    } catch {
      setError("Failed to fetch payment link. Check poll type and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Generate New Payment Link
      </h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <select
        value={selectedPollId || ""}
        onChange={(e) => setSelectedPollId(e.target.value)}
        className="mb-4 px-4 py-2 border rounded-md"
      >
        <option value="" disabled>
          Select a Poll
        </option>
        {polls.map((poll) => (
          <option key={poll.id} value={poll.id}>
            {poll.title}
          </option>
        ))}
      </select>
      {paymentLink ? (
        <div className="bg-green-100 p-4 rounded-md shadow-inner">
          <p className="text-accent-700 font-medium mb-2">
            Payment link successfully generated:
          </p>
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-words"
          >
            Proceed to Payment
          </a>
        </div>
      ) : (
        <button
          onClick={fetchPaymentLink}
          className="px-6 py-3 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 transition duration-300 ease-in-out"
          disabled={loading}
        >
          {loading ? "Generating Link..." : "Generate Payment Link"}
        </button>
      )}
    </div>
  );
};

export default PaymentLinkGenerator;
