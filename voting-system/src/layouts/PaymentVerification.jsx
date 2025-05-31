import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../apis/api";

const PaymentCompletion = () => {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verifying...");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus("Error");
        setMessage("Payment reference is missing.");
        setLoading(false);
        return;
      }

      try {
        console.log("Verifying payment...", { reference, attempt: retryCount + 1 });
        
        // Add a small delay before first verification attempt to allow Paystack to process
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const response = await axiosInstance.get(`/payment/verify/${reference}/`);
        console.log("Verification response:", response.data);
        
        if (response.status === 200) {
          setStatus("Success!");
          setMessage(response.data.message || "Payment verified successfully.");
          
          // Clear payment details from session storage
          sessionStorage.removeItem('paymentDetails');
          
          // Get redirect URL from response or default to dashboard
          const redirectUrl = response.data.redirect_url || '/dashboard';
          console.log("Redirecting to:", redirectUrl);
          
          // Set loading to false before redirect
          setLoading(false);
          
          // Redirect after a short delay
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);
        } else {
          throw new Error("Verification response not successful");
        }
      } catch (err) {
        console.error("Verification error:", err);
        
        // If we get a 404 or 400, it means the payment is not yet processed
        // We should retry in this case
        if (retryCount < maxRetries) {
          console.log("Retrying verification...");
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            verifyPayment();
          }, 2000);
        } else {
          setStatus("Error");
          setMessage(
            err.response?.data?.message || 
            err.response?.data?.error || 
            "Payment verification failed. Please contact support if payment was deducted."
          );
          setLoading(false);
        }
      }
    };

    verifyPayment();
  }, [reference]);

  const handleRetry = () => {
    setLoading(true);
    setRetryCount(0);
    setStatus("Verifying...");
    setMessage("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1
          className={`text-2xl font-bold text-center ${
            status === "Success!"
              ? "text-green-600"
              : status === "Error"
              ? "text-red-600"
              : "text-gray-700"
          }`}
        >
          {status}
        </h1>
        <p className="mt-4 text-center text-gray-600">{message}</p>
        
        {loading && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Attempt {retryCount + 1} of {maxRetries}
            </p>
            <div className="mt-2 w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
        
        {status === "Error" && (
          <div className="space-y-4 mt-6">
            <button
              className="w-full px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition"
              onClick={handleRetry}
            >
              Try Again
            </button>
            <button
              className="w-full px-4 py-2 text-white bg-gray-500 hover:bg-gray-600 rounded-md transition"
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
