import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const Terms = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 py-12"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">Terms of Service</h1>
          
          <div className="prose lg:prose-xl">
           

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">1. Acceptance of Terms</h2>
              <p className="text-gray-600">
                By accessing and using Cast Sure&apos;s services, you agree to be bound by these Terms of
                Service and all applicable laws and regulations. If you do not agree with any of these
                terms, you are prohibited from using or accessing our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">2. Use License</h2>
              <div className="flex items-start space-x-3 text-gray-600">
                <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                <p>
                  Permission is granted to temporarily use our platform for personal, non-commercial
                  transitory viewing only. This is the grant of a license, not a transfer of title.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">3. User Responsibilities</h2>
              <div className="space-y-4 text-gray-600">
                <p>As a user of our service, you agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modify or copy any materials from the platform</li>
                  <li>Use the service for any unlawful purpose</li>
                  <li>Attempt to decompile or reverse engineer any software</li>
                  <li>Remove any copyright or proprietary notations</li>
                  <li>Transfer the materials to another person or mirror the materials</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">4. Disclaimer</h2>
              <div className="flex items-start space-x-3 bg-yellow-50 p-4 rounded-lg">
                <FaExclamationTriangle className="text-yellow-500 mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  Our services are provided &quot;as is&quot;. We make no warranties, expressed or implied, and
                  hereby disclaim and negate all other warranties including, without limitation,
                  implied warranties or conditions of merchantability, fitness for a particular
                  purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">5. Limitations</h2>
              <p className="text-gray-600">
                In no event shall Castsure or its suppliers be liable for any damages (including,
                without limitation, damages for loss of data or profit, or due to business
                interruption) arising out of the use or inability to use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">6. Contact Information</h2>
              <p className="text-gray-600">
                If you have any questions about these Terms, please contact us at:{" "}
                <a
                  href="mailto:support@castsure.vote"
                  className="text-secondary-600 hover:text-secondary-700"
                >
                  legal@castsure.vote
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Terms;
