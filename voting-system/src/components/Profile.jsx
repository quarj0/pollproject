import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import axiosInstance from "../apis/api";
import UpdateUserModal from "./UpdateUserModal";
import WithdrawModal from "./WithdrawModal";

const Profile = ({ authTokens }) => {
  const [user, setUser] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(null);
  const [totalWithdrawn, setTotalWithdrawn] = useState(null);
  const [pollId, setPollId] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const fetchPaymentHistory = useCallback(
    async (url = "payment/history") => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(url, {
          headers: {
            Authorization: `Bearer ${authTokens.access}`,
          },
        });
        setPaymentHistory(response.data);
      } catch (error) {
        setError("Failed to load payment history.");
        console.error("Error fetching payment history:", error);
      } finally {
        setLoading(false);
      }
    },
    [authTokens.access]
  );

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("auth/user/", {
        headers: {
          Authorization: `Bearer ${authTokens.access}`,
        },
      });
      setUser(response.data);
      setPollId(response.data.poll_id);
    } catch (error) {
      setError("Failed to load user data.");
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, [authTokens.access]);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await axiosInstance.get("payment/account/balance", {
        headers: {
          Authorization: `Bearer ${authTokens.access}`,
        },
      });
      setAvailableBalance(response.data.available_balance);
      setTotalWithdrawn(response.data.total_withdrawn);
    } catch (error) {
      setError("Failed to load balance data.");
      console.error("Error fetching balance:", error);
    }
  }, [authTokens.access]);

  useEffect(() => {
    fetchUser();
    fetchBalance();
    fetchPaymentHistory();
  }, [authTokens, fetchBalance, fetchUser, fetchPaymentHistory]);

  const handleProfileUpdate = () => {
    fetchUser();
    setIsUpdateModalOpen(false);
  };

  const handleWithdraw = (data) => {
    console.log("Withdrawal successful:", data);
    fetchBalance();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading user profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Profile</h1>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="p-6 border rounded-md shadow-md mb-6 bg-white">
        <h3 className="text-xl font-semibold mb-2">
          Username: {user?.username}
        </h3>
        <p className="text-gray-700">Email: {user?.email}</p>
        <p className="text-gray-700">
          Phone Number: {user?.account_number || "N/A"}
        </p>
        <button
          onClick={() => setIsUpdateModalOpen(true)}
          className="px-4 py-2 bg-gray-200 rounded mt-4"
        >
          Update Profile
        </button>
      </div>

      <div className="p-6 border rounded-md shadow-md mb-6 bg-white">
        <h3 className="text-xl font-semibold mb-2">Balance</h3>
        <p className="text-gray-700">Available: {availableBalance || 0}</p>
        <p className="text-gray-700">Withdrawn: {totalWithdrawn || 0}</p>
        <button
          onClick={() => {
            setPollId(user.poll_id);
            setIsWithdrawModalOpen(true);
          }}
          className="px-4 py-2 bg-gray-200 rounded mt-4"
        >
          Withdraw
        </button>
      </div>

      <div className="p-6 border rounded-md shadow-md bg-white">
        <h3 className="text-xl font-semibold mb-4">Payment History</h3>
        {paymentHistory && paymentHistory.results?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Transaction Type</th>
                  <th className="py-2 px-4 border-b">Poll ID</th>
                  <th className="py-2 px-4 border-b">Amount</th>
                  <th className="py-2 px-4 border-b">Success</th>
                  <th className="py-2 px-4 border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.results.map((payment, index) => (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">
                      {payment.transaction_type}
                    </td>
                    <td className="py-2 px-4 border-b">{payment.poll_id}</td>
                    <td className="py-2 px-4 border-b">{payment.amount}</td>
                    <td className="py-2 px-4 border-b">
                      {payment.success ? "Yes" : "No"}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {new Date(payment.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => fetchPaymentHistory(paymentHistory.previous)}
                disabled={!paymentHistory.previous}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchPaymentHistory(paymentHistory.next)}
                disabled={!paymentHistory.next}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700">No payment history available.</p>
        )}
      </div>

      {isUpdateModalOpen && (
        <UpdateUserModal
          authTokens={authTokens}
          onClose={() => setIsUpdateModalOpen(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
      {isWithdrawModalOpen && (
        <WithdrawModal
          pollId={pollId}
          onClose={() => setIsWithdrawModalOpen(false)}
          onWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
};

Profile.propTypes = {
  authTokens: PropTypes.shape({
    access: PropTypes.string.isRequired,
  }).isRequired,
};

export default Profile;
