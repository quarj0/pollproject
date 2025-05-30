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
        const response = await axiosInstance.get(
          `/payment/verify/${reference}/`
        );
        
        // Check if we have a successful response with a message and redirect_url
        if (response.status === 200 && response.data.message) {
          setStatus("Success!");
          setMessage(response.data.message);
          
          // Clear payment details from session storage
          sessionStorage.removeItem('paymentDetails');
          
          // Get redirect URL from response or default to dashboard
          const redirectUrl = response.data.redirect_url || '/dashboard';
          
          // Redirect to the appropriate page
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);
        } else {
          // If verification fails and we haven't reached max retries
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            // Wait 2 seconds before retrying
            setTimeout(() => {
              verifyPayment();
            }, 2000);
          } else {
            setStatus("Error");
            setMessage("Payment verification failed after multiple attempts.");
          }
        }
      } catch (err) {
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          // Wait 2 seconds before retrying
          setTimeout(() => {
            verifyPayment();
          }, 2000);
        } else {
          setStatus("Error");
          setMessage(
            err.response?.data?.message || "Payment verification failed."
          );
        }
      } finally {
        if (retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    };

    verifyPayment();
  }, [reference, navigate, retryCount]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-lg text-blue-600 animate-pulse mb-2">
            Verifying payment, please wait...
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-600">
              Attempt {retryCount} of {maxRetries}
            </p>
          )}
        </div>
      </div>
    );

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
        {status === "Success!" && (
          <button
            className="w-full mt-6 px-4 py-2 text-white bg-green-500 hover:bg-green-600 rounded-md transition"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </button>
        )}
        {status === "Error" && (
          <div className="space-y-4 mt-6">
            <button
              className="w-full px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition"
              onClick={() => {
                setLoading(true);
                setRetryCount(0);
                setStatus("Verifying...");
              }}
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
