import PropTypes from "prop-types";
import { FaCopy, FaDownload, FaShareAlt } from "react-icons/fa";

const PollDetailsModal = ({ pollDetails, onClose }) => {
  const {
    poll_id,
    short_url,
    ussd_code,
    payment_link,
    download_voter_codes,
    message,
  } = pollDetails;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-center mb-4">Poll Details</h2>

        <p className="text-center text-gray-700 mb-6">{message}</p>

        <div className="space-y-4">
          {/* USSD Code */}
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
            <span>USSD Code:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{ussd_code}</span>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleCopy(ussd_code)}
              >
                <FaCopy />
              </button>
            </div>
          </div>

          {/* Payment Link */}
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
            <span>Payment Link:</span>
            <div className="flex items-center gap-2">
              <a
                href={payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pay Now
              </a>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleCopy(payment_link)}
              >
                <FaCopy />
              </button>
            </div>
          </div>

          {/* Download Voter Codes */}
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
            <span>Download Voter Codes:</span>
            <a
              href={`http://localhost:8000${download_voter_codes}`}
              download
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <FaDownload />
              Download
            </a>
          </div>

          {/* Poll ID */}
          {short_url ? (
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
              <span>Short URL:</span>
              <div className="flex items-center gap-2">
                <a
                  href={short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {short_url}
                </a>
                <button
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => handleCopy(short_url)}
                >
                  <FaCopy />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
              <span>Poll ID:</span>
              <span className="font-medium">{poll_id}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            onClick={onClose}
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Share <FaShareAlt className="inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PollDetailsModal;

PollDetailsModal.propTypes = {
  pollDetails: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
