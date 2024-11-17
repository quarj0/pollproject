import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axiosInstance from "../apis/api";

const Profile = ({ user, authTokens }) => {
  const [balance, setBalance] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Fetch account balance
  useEffect(() => {
    axiosInstance
      .get("payment/account/balance", {
        headers: {
          Authorization: `Bearer ${authTokens.access}`,
        },
      })
      .then((response) => {
        setBalance(response.data.balance);
      })
      .catch((error) => {
        console.error("Error fetching balance:", error);
        setError("Failed to fetch account balance.");
      });
  }, [authTokens]);

  // Fetch payment history
  useEffect(() => {
    axiosInstance
      .get("payment/history/", {
        headers: {
          Authorization: `Bearer ${authTokens.access}`,
        },
      })
      .then((response) => {
        setPaymentHistory(response.data.history || []);
      })
      .catch((error) => {
        console.error("Error fetching payment history:", error);
        setError("Failed to fetch payment history.");
      });
  }, [authTokens]);

  const handleWithdraw = () => {
    if (withdrawAmount <= 0 || isNaN(withdrawAmount)) {
      setError("Please enter a valid amount.");
      return;
    }

    if (withdrawAmount > balance) {
      setError("Insufficient balance.");
      return;
    }

    setLoading(true);

    axiosInstance
      .post(
        `payment/account/${user.poll_id}/withdraw/`,
        { amount: withdrawAmount },
        {
          headers: {
            Authorization: `Bearer ${authTokens.access}`,
          },
        }
      )
      .then(() => {
        setSuccessMessage("Withdrawal successful.");
        setBalance(balance - withdrawAmount);
        setWithdrawAmount(0);
      })
      .catch((error) => {
        console.error("Error during withdrawal:", error);
        setError(
          error.response?.data?.detail ||
            "Withdrawal failed due to network error."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const formattedBalance = balance
    ? new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
      }).format(balance)
    : "Loading...";

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-semibold mb-4">
        Hi, {user?.username || "User"}
      </h1>

      {/* Account Balance */}
      <div className="mb-4">
        <p className="text-l">
          <strong>Account Balance:</strong> {formattedBalance}
        </p>
      </div>

      {/* Withdraw Funds */}
      <div className="mb-4">
        <h2 className="text-lg font-medium">Withdraw Funds</h2>
        <input
          type="number"
          className="border p-2 rounded w-full"
          placeholder="Enter amount to withdraw"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
        />
        <button
          className={`bg-blue-600 text-white p-2 mt-2 rounded w-full ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleWithdraw}
          disabled={loading}
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>
      </div>

      {/* Payment History */}
      <div className="mb-4">
        <h2 className="text-lg font-medium">Payment History</h2>
        {paymentHistory.length > 0 ? (
          <ul className="list-disc pl-5">
            {paymentHistory.map((payment, index) => (
              <li key={index}>
                <strong>{payment.type}:</strong> {payment.amount} GHS on{" "}
                {new Date(payment.date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No payment history available.</p>
        )}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-200 p-2 rounded mt-4 text-red-600">{error}</div>
      )}
      {successMessage && (
        <div className="bg-green-200 p-2 rounded mt-4 text-green-600">
          {successMessage}
        </div>
      )}

      {/* Edit Profile Button */}
      <div className="mt-4">
        <button className="bg-yellow-500 text-white p-2 rounded w-full">
          Edit Profile
        </button>
      </div>
    </div>
  );
};

Profile.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string.isRequired,
    poll_id: PropTypes.number.isRequired,
  }),
  authTokens: PropTypes.shape({
    access: PropTypes.string.isRequired,
  }).isRequired,
};

export default Profile;
