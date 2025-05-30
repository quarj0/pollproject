import { motion } from "framer-motion";
import { FaShieldAlt, FaLock, FaUserShield, FaCookieBite } from "react-icons/fa";

const PrivacyPolicy = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 py-12"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">Privacy Policy</h1>
          
          <div className="prose lg:prose-xl">
          

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FaShieldAlt className="text-secondary-600 text-xl mr-2" />
                <h2 className="text-2xl font-semibold text-gray-800">Information We Collect</h2>
              </div>
              <p className="text-gray-600">
                We collect information that you provide directly to us, including your name, email address,
                and any other information you choose to provide. We also automatically collect certain
                information about your device when you use our services.
              </p>
            </section>

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FaLock className="text-secondary-600 text-xl mr-2" />
                <h2 className="text-2xl font-semibold text-gray-800">How We Use Your Information</h2>
              </div>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To allow you to participate in interactive features when you choose to do so</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information to improve our Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FaUserShield className="text-secondary-600 text-xl mr-2" />
                <h2 className="text-2xl font-semibold text-gray-800">Data Protection</h2>
              </div>
              <p className="text-gray-600">
                We implement appropriate technical and organizational security measures to protect your
                personal data against accidental or unlawful destruction, loss, alteration, and
                unauthorized disclosure or access.
              </p>
            </section>

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FaCookieBite className="text-secondary-600 text-xl mr-2" />
                <h2 className="text-2xl font-semibold text-gray-800">Cookies</h2>
              </div>
              <p className="text-gray-600">
                We use cookies and similar tracking technologies to track activity on our Service and
                hold certain information. You can instruct your browser to refuse all cookies or to
                indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Contact Us</h2>
              <p className="text-gray-600">
                If you have any questions about this Privacy Policy, please contact us at:{" "}
                <a
                  href="mailto:support@castsure.vote"
                  className="text-secondary-600 hover:text-secondary-700"
                >
                  support@castsure.vote
                </a>
              </p>  
            </section>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PrivacyPolicy;
