import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../apis/api";

const PaymentCompletion = () => {
  const { reference: urlReference } = useParams();
  const navigate = useNavigate();
  const [reference, setReference] = useState(urlReference || "");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (urlReference) {
      handleVerify(urlReference);
    }
    // eslint-disable-next-line
  }, [urlReference]);

  const handleVerify = async (ref) => {
    setStatus("Verifying...");
    setMessage("");
    setLoading(true);
    setRetryCount(0);
    if (!ref || ref === "undefined") {
      setStatus("Error");
      setMessage("Please enter a valid payment reference.");
      setLoading(false);
      return;
    }
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        if (attempts === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const response = await axiosInstance.get(`/payment/verify/${ref}/`);
        if (response.status === 200) {
          setStatus("Success!");
          setMessage(response.data.message || "Payment verified successfully.");
          setLoading(false);
          return;
        } else {
          throw new Error("Verification response not successful");
        }
      } catch (err) {
        attempts++;
        if (attempts >= maxRetries) {
          setStatus("Error");
          setMessage(
            err.response?.data?.message || 
            err.response?.data?.error || 
            "Payment verification failed. Please contact support if payment was debited."
          );
          setLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleVerify(reference.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4 text-primary-700">Payment Verification</h1>
        <form onSubmit={handleFormSubmit} className="mb-4 flex flex-col gap-2">
          <label htmlFor="reference" className="text-sm font-medium text-gray-700">Enter Payment Reference</label>
          <input
            id="reference"
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g. vote-10-36-abc123"
            required
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium mt-2"
            disabled={loading || !reference.trim()}
          >
            {loading ? "Verifying..." : "Verify Payment"}
          </button>
        </form>
        {status && (
          <h2 className={`text-xl font-semibold text-center mb-2 ${status === "Success!" ? "text-green-600" : status === "Error" ? "text-red-600" : "text-gray-700"}`}>{status}</h2>
        )}
        {message && <p className="text-center text-gray-600 mb-2">{message}</p>}
        {status === "Success!" && !loading && (
          <div className="space-y-4 mt-6">
            <button
              className="w-full px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition"
              onClick={() => navigate(-1)}
            >
              Go Back
            </button>
          </div>
        )}
        {status === "Error" && !loading && (
          <div className="space-y-4 mt-6">
            <button
              className="w-full px-4 py-2 text-white bg-gray-500 hover:bg-gray-600 rounded-md transition"
              onClick={() => setStatus("")}
            >
              Try Another Reference
            </button>
            <button
              className="w-full px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCompletion;
