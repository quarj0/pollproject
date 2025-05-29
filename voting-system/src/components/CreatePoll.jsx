import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaImage,
  FaCalendarAlt,
  FaClock,
  FaDollarSign,
  FaCheck,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";
import axiosInstance from "../apis/api";

const steps = [
  { title: "Basic Info", description: "Enter poll title and description" },
  { title: "Timing", description: "Set start and end times" },
  { title: "Type & Fees", description: "Choose poll type and set fees" },
  { title: "Preview", description: "Review your poll details" },
];

const CreatePoll = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    poll_type: "",
    expected_voters: "",
    voting_fee: "",
    image: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [setupFee, setSetupFee] = useState(0);
  const [responseData, setResponseData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Calculate setup fee for creator-pay polls
    if (name === "expected_voters" && formData.poll_type === "creator-pay") {
      const expectedVoters = Number(value);
      let fee = 0;
      
      if (expectedVoters >= 20) {
        // 20-100 voters: 1.5 GHS per voter
        if (expectedVoters <= 100) {
          fee = expectedVoters * 1.5;
        }
        // 101-350 voters: 0.75 GHS per voter
        else if (expectedVoters <= 350) {
          fee = expectedVoters * 0.8;
        }
      }
      
      setSetupFee(fee);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    switch (step) {
      case 0:
        if (!formData.title) newErrors.title = "Title is required";
        if (!formData.description)
          newErrors.description = "Description is required";
        break;
      case 1:
        if (!formData.start_time) newErrors.start_time = "Start time is required";
        if (!formData.end_time) newErrors.end_time = "End time is required";
        if (new Date(formData.end_time) <= new Date(formData.start_time)) {
          newErrors.end_time = "End time must be after start time";
        }
        break;
      case 2:
        if (!formData.poll_type) newErrors.poll_type = "Poll type is required";
        if (formData.poll_type === "creator-pay" && !formData.expected_voters) {
          newErrors.expected_voters = "Expected voters is required";
        }
        if (formData.poll_type === "voters-pay" && !formData.voting_fee) {
          newErrors.voting_fee = "Voting fee is required";
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    const submissionData = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key]) {
        submissionData.append(key, formData[key]);
      }
    });

    setLoading(true);
    try {
      const res = await axiosInstance.post("polls/create/", submissionData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResponseData(res.data);
    } catch (err) {
      const apiErrors = err.response?.data || {};
      setErrors((prev) => ({
        ...prev,
        ...Object.keys(apiErrors).reduce((acc, field) => {
          acc[field] = apiErrors[field];
          return acc;
        }, {}),
      }));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poll Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter poll title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter poll description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poll Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <FaImage className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="image-upload"
                      className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500"
                    >
                      <span>Upload an image</span>
                      <input
                        id="image-upload"
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
              {formData.image && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="h-32 w-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaCalendarAlt className="inline mr-2" />
                Start Time
              </label>
              <input
                type="datetime-local"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-500">{errors.start_time}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaClock className="inline mr-2" />
                End Time
              </label>
              <input
                type="datetime-local"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-500">{errors.end_time}</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poll Type
              </label>
              <select
                name="poll_type"
                value={formData.poll_type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Poll Type</option>
                <option value="voters-pay">Voter-Pay</option>
                <option value="creator-pay">Creator-Pay</option>
              </select>
              {errors.poll_type && (
                <p className="mt-1 text-sm text-red-500">{errors.poll_type}</p>
              )}
            </div>
            {formData.poll_type === "creator-pay" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaDollarSign className="inline mr-2" />
                  Expected Voters
                </label>
                <input
                  type="number"
                  name="expected_voters"
                  value={formData.expected_voters}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="20"
                  max="200"
                />
                {errors.expected_voters && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.expected_voters}
                  </p>
                )}
                {setupFee > 0 && (
                  <p className="mt-2 text-sm text-green-600">
                    Total Setup Fee: GHS {setupFee}
                  </p>
                )}
              </div>
            )}
            {formData.poll_type === "voters-pay" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaDollarSign className="inline mr-2" />
                  Voting Fee
                </label>
                <input
                  type="number"
                  name="voting_fee"
                  value={formData.voting_fee}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.voting_fee && (
                  <p className="mt-1 text-sm text-red-500">{errors.voting_fee}</p>
                )}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Poll Details Preview
              </h3>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Description
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formData.description}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Start Time
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.start_time).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      End Time
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.end_time).toLocaleString()}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Poll Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formData.poll_type === "voters-pay"
                      ? "Voter-Pay"
                      : "Creator-Pay"}
                  </dd>
                </div>
                {formData.poll_type === "creator-pay" && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Setup Fee
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">GHS {setupFee}</dd>
                  </div>
                )}
                {formData.poll_type === "voters-pay" && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Voting Fee
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      GHS {formData.voting_fee}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (responseData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <FaCheck className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {responseData.message}
          </h2>
          <div className="space-y-4">
            {responseData.ussd_code && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium">USSD Code</p>
                <p className="text-lg text-primary-600">
                  {responseData.ussd_code}
                </p>
              </div>
            )}
            {responseData.payment_link && (
              <div>
                <p className="font-medium mb-2">Payment Link</p>
                <a
                  href={responseData.payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Complete Payment
                  <FaArrowRight className="ml-2" />
                </a>
              </div>
            )}
            {responseData.download_voter_codes && (
              <div>
                <p className="font-medium mb-2">Voter Codes</p>
                <a
                  href={`http://localhost:8000${responseData.download_voter_codes}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Download Codes
                  <FaArrowRight className="ml-2" />
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center w-full">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className={`flex items-center ${
                  index < steps.length - 1 ? "w-full" : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    index <= currentStep
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                <div
                  className={`ml-2 ${
                    index === currentStep ? "font-medium" : "text-gray-500"
                  }`}
                >
                  {step.title}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-full mx-4 h-0.5 bg-gray-200"></div>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Form Content */}
        <motion.div
          className="bg-white rounded-xl shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold mb-1">
                {steps[currentStep].title}
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                {steps[currentStep].description}
              </p>
              <form
                onSubmit={
                  currentStep === steps.length - 1 ? handleSubmit : (e) =>
                    e.preventDefault()
                }
              >
                {renderStepContent()}
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 ${
                      currentStep === 0 ? "invisible" : ""
                    }`}
                  >
                    <FaArrowLeft className="mr-2" />
                    Previous
                  </button>
                  <button
                    type={
                      currentStep === steps.length - 1 ? "submit" : "button"
                    }
                    onClick={
                      currentStep === steps.length - 1 ? undefined : nextStep
                    }
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {currentStep === steps.length - 1 ? (
                      loading ? (
                        "Creating..."
                      ) : (
                        "Create Poll"
                      )
                    ) : (
                      <>
                        Next
                        <FaArrowRight className="ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatePoll;
