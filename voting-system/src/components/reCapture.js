import { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import axios from "axios";

const ReCapture = () => {
  const [captcha, setCaptcha] = useState(false);
  const [recaptchaResponse, setRecaptchaResponse] = useState("");
  const [information, setInformation] = useState("");
  const recaptchaRef = useRef(null);

  const verifyCallback = (response) => {
    if (response) {
      setCaptcha(true);
      setRecaptchaResponse(response);
    }
  };

  const expiredCallback = () => {
    setCaptcha(false);
    setRecaptchaResponse("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captcha) {
      alert("Please complete the ReCAPTCHA to submit.");
      return;
    }

    const data = {
      information: information,
      "g-recaptcha-response": recaptchaResponse,
    };

    try {
      await axios.post("http://localhost:8000/auth/recaptcha", data);
      setInformation("");
      recaptchaRef.current.reset(); 
    } catch (error) {
      console.log(error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="recaptcha-container">
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey="6Ldnv4EqAAAAAPV4RDub8i8oVyn-Jyf0J3m_RMuX"
          theme="dark"
          size="normal"
          badge="inline"
          onChange={verifyCallback}
          onExpired={expiredCallback}
        />
      </div>

      <div className="form-group">
        <textarea
          value={information}
          onChange={(e) => setInformation(e.target.value)}
          placeholder="Enter your information"
          required
        />
      </div>

      <button type="submit" disabled={!captcha}>
        Submit
      </button>
    </form>
  );
};

export default ReCapture;
