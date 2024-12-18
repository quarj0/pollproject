import { useState } from "react";
import PropTypes from "prop-types";
import axiosInstance from "../apis/api";

const WithdrawModal = ({ pollId, onClose, onWithdraw }) => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axiosInstance.post(
        `/payment/account/${pollId}/withdraw/`,
        { amount },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      onWithdraw(response.data);
      onClose();
    } catch (error) {
      if (error.response && error.response.data) {
        const serverError =
          error.response.data.non_field_errors?.[0] ||
          error.response.data.detail;
        setError(serverError || "Withdrawal failed. Please try again.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-md shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Initiate Withdrawal</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              min="0"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Withdraw
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

WithdrawModal.propTypes = {
  pollId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onWithdraw: PropTypes.func.isRequired,
};

export default WithdrawModal;
