import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../apis/api";

const PaymentCompletion = () => {
  const { reference } = useParams();
  const [status, setStatus] = useState("Verifying...");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
        if (response.status === 200) {
          setStatus("Success!");
          setMessage(response.data.message);
        } else {
          setStatus("Error");
          setMessage("Payment verification failed.");
        }
      } catch (err) {
        setStatus("Error");
        setMessage(
          err.response?.data?.message || "Payment verification failed."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [reference]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg text-blue-600 animate-pulse">
          Verifying payment, please wait...
        </p>
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
            onClick={() => window.location.replace("/dashboard")}
          >
            Go to Dashboard
          </button>
        )}
        {status === "Error" && (
          <button
            className="w-full mt-6 px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-md transition"
            onClick={() =>
              window.location.replace(`/payment/verify/${reference}/`)
            }
          >
            Retry Payment
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentCompletion;
