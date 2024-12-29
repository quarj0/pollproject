import { useState } from "react";
import axiosInstance from "../apis/api";

const PollCreation = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    poll_type: "",
    image: null,
    expected_voters: "",
    voting_fee: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [setupFee, setSetupFee] = useState(0);
  const [responseData, setResponseData] = useState(null);

  const calculateSetupFee = (expectedVoters) => {
    if (expectedVoters <= 20) return 25;
    if (expectedVoters <= 60) return 25;
    if (expectedVoters <= 100) return 35;
    if (expectedVoters <= 200) return 50;
    return 0; // Should not reach here due to validation
  };

  // Handle changes for form inputs
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    if (name === "expected_voters") {
      const expectedVoters = parseInt(value);
      if (expectedVoters >= 20 && expectedVoters <= 200) {
        const fee = calculateSetupFee(expectedVoters);
        setSetupFee(fee);
        setErrors((prev) => ({ ...prev, expected_voters: "" }));
      } else {
        setSetupFee(0);
        setErrors((prev) => ({
          ...prev,
          expected_voters: "Expected voters must be between 20 and 200.",
        }));
      }
    }
  };

  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = "Title is required.";
    if (!formData.description)
      newErrors.description = "Description is required.";
    if (!formData.start_time) newErrors.start_time = "Start time is required.";
    if (!formData.end_time) newErrors.end_time = "End time is required.";
    if (!formData.poll_type) newErrors.poll_type = "Poll type is required.";
    if (formData.poll_type === "creator-pay") {
      const expectedVoters = parseInt(formData.expected_voters);
      if (!expectedVoters || expectedVoters < 20 || expectedVoters > 200) {
        newErrors.expected_voters =
          "Expected voters must be between 20 and 200.";
      }
    }
    if (formData.poll_type === "voters-pay" && !formData.voting_fee) {
      newErrors.voting_fee = "Voting fee is required.";
    }
    if (formData.image && formData.image.size > 3 * 1024 * 1024) {
      newErrors.image = "Image size must be less than 3MB.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submissionData = new FormData();
    submissionData.append("title", formData.title);
    submissionData.append("description", formData.description);
    submissionData.append("start_time", formData.start_time);
    submissionData.append("end_time", formData.end_time);
    submissionData.append("poll_type", formData.poll_type);
    if (formData.image) submissionData.append("image", formData.image);
    if (formData.poll_type === "creator-pay") {
      submissionData.append("expected_voters", formData.expected_voters);
    }
    if (formData.poll_type === "voters-pay") {
      submissionData.append("voting_fee", formData.voting_fee);
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("polls/create/", submissionData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResponseData(res.data);
      console.log("Poll created successfully:", res.data);
    } catch (err) {
      const apiErrors = err.response?.data || {};
      setErrors((prev) => ({
        ...prev,
        ...Object.keys(apiErrors).reduce((acc, field) => {
          acc[field] = apiErrors[field];
          return acc;
        }, {}),
      }));
      setResponseData("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Create a Poll</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-medium">Poll Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full border rounded p-2"
          />
          {errors.title && <p className="text-red-500">{errors.title}</p>}
        </div>
        <div className="mb-4">
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full border rounded p-2"
          ></textarea>
          {errors.description && (
            <p className="text-red-500">{errors.description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-medium">Start Time</label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              className="w-full border rounded p-2"
            />
            {errors.start_time && (
              <p className="text-red-500">{errors.start_time}</p>
            )}
          </div>
          <div>
            <label className="block font-medium">End Time</label>
            <input
              type="datetime-local"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              className="w-full border rounded p-2"
            />
            {errors.end_time && (
              <p className="text-red-500">{errors.end_time}</p>
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className="block font-medium">Poll Type</label>
          <select
            name="poll_type"
            value={formData.poll_type}
            onChange={handleInputChange}
            className="w-full border rounded p-2"
          >
            <option value="">Select Poll Type</option>
            <option value="voters-pay">Voter-Pay</option>
            <option value="creator-pay">Creator-Pay</option>
          </select>
          {errors.poll_type && (
            <p className="text-red-500">{errors.poll_type}</p>
          )}
        </div>
        {formData.poll_type === "creator-pay" && (
          <div className="mb-4">
            <label className="block font-medium">Expected Voters</label>
            <input
              type="number"
              name="expected_voters"
              value={formData.expected_voters}
              onChange={handleInputChange}
              className="w-full border rounded p-2"
              min="20"
              max="200"
            />
            {errors.expected_voters && (
              <p className="text-red-500">{errors.expected_voters}</p>
            )}
            {setupFee > 0 && (
              <p className="text-green-500 mt-2">
                Total Setup Fee: GHS {setupFee}
              </p>
            )}
          </div>
        )}
        {formData.poll_type === "voters-pay" && (
          <div className="mb-4">
            <label className="block font-medium">Voting Fee</label>
            <input
              type="number"
              name="voting_fee"
              value={formData.voting_fee}
              onChange={handleInputChange}
              className="w-full border rounded p-2"
            />
            {errors.voting_fee && (
              <p className="text-red-500">{errors.voting_fee}</p>
            )}
          </div>
        )}
        <div className="mb-4">
          <label className="block font-medium">Poll Image</label>
          <input
            type="file"
            name="image"
            accept="image/jpg, image/png"
            onChange={handleInputChange}
            className="w-full border rounded p-2"
          />
          {formData.image && (
            <img
              src={URL.createObjectURL(formData.image)}
              alt="Poll Preview"
              className="mt-2 h-32 w-32 object-cover"
            />
          )}
          {errors.image && <p className="text-red-500">{errors.image}</p>}
        </div>

        {errors.contestants && (
          <p className="text-red-500">{errors.contestants}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`bg-green-500 text-white px-4 py-2 rounded ${
            loading ? "animate-pulse" : ""
          }`}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
      {responseData ? (
        <div className="mt-6 p-4 bg-gray-100 rounded shadow">
          <h2 className="text-xl font-bold mb-4">{responseData.message}</h2>

          <p>
            <strong>USSD Code:</strong> {responseData.ussd_code}
          </p>

          <p>
            <strong>Payment Link:</strong>{" "}
            <a
              href={responseData.payment_link || null}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Complete Payment
            </a>
          </p>
          <p>
            <strong>Download Voter Codes:</strong>{" "}
            <a
              href={`${`http://localhost:8000`}${
                responseData.download_voter_codes || null
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Download
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default PollCreation;
