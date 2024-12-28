import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance from "../apis/api";

const PaymentCompletion = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const reference = queryParams.get("reference");

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
          setStatus("Success");
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

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Payment Completion</h1>
      <p>Status: {status}</p>
      {message && <p>{message}</p>}
    </div>
  );
};

export default PaymentCompletion;
