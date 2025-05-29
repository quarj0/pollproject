import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { FaUser, FaEnvelope, FaPhone, FaEdit, FaWallet, FaHistory, FaArrowRight } from "react-icons/fa";
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="space-y-4">
          <div className="animate-pulse w-48 h-48 bg-gray-200 rounded-full mx-auto"></div>
          <div className="animate-pulse h-4 w-40 bg-gray-200 rounded mx-auto"></div>
          <div className="animate-pulse h-4 w-32 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <div className="w-32 h-32 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FaUser className="w-16 h-16 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{user?.username}</h1>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        {/* Profile Information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUpdateModalOpen(true)}
              className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex items-center"
            >
              <FaEdit className="mr-2" />
              Edit Profile
            </motion.button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <FaUser className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-gray-600">Username:</span>
              <span className="ml-2 font-medium">{user?.username}</span>
            </div>
            <div className="flex items-center">
              <FaEnvelope className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center">
              <FaPhone className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-gray-600">Phone Number:</span>
              <span className="ml-2 font-medium">{user?.account_number || "N/A"}</span>
            </div>
          </div>
        </motion.div>

        {/* Balance Information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Account Balance</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setPollId(user.poll_id);
                setIsWithdrawModalOpen(true);
              }}
              className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex items-center"
            >
              <FaWallet className="mr-2" />
              Withdraw
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-green-700">GHS {availableBalance || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Total Withdrawn</p>
              <p className="text-2xl font-bold text-blue-700">GHS {totalWithdrawn || 0}</p>
            </div>
          </div>
        </motion.div>

        {/* Payment History */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <FaHistory className="mr-2 text-gray-400" />
              Payment History
            </h2>
          </div>

          {paymentHistory && paymentHistory.results?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poll ID</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentHistory.results.map((payment, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.transaction_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.poll_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GHS {payment.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {payment.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => fetchPaymentHistory(paymentHistory.previous)}
                  disabled={!paymentHistory.previous}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors flex items-center"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchPaymentHistory(paymentHistory.next)}
                  disabled={!paymentHistory.next}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors flex items-center"
                >
                  Next
                  <FaArrowRight className="ml-2" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No payment history available
            </div>
          )}
        </motion.div>
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
