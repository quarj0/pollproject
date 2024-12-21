import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance from "../apis/api";

const PaymentCompletion = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const reference = queryParams.get("reference");
  const [status, setStatus] = useState("Verifying...");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const response = await axiosInstance.get(
          `/payment/verify/${reference}/`
        );
        if (response.status === 200) {
          setStatus("Success");
          setMessage(response.data.message);
        }
      } catch {
        setStatus("Error");
        setMessage("Payment verification failed.");
      }
    };

    if (reference) verifyPayment();
  }, [reference]);

  return (
    <div>
      <h1>Payment Completion</h1>
      <p>Status: {status}</p>
      {message && <p>{message}</p>}
    </div>
  );
};

export default PaymentCompletion;
