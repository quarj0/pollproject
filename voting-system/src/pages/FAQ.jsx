import { useState } from "react";
import { motion } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";

const FAQs= () => {
  const faqs = [
    {
      question: "What is Cast Sure?",
      answer: "Cast Sure is a secure online voting platform that allows organizations to create and manage polls, elections, and surveys. Our platform ensures the integrity and confidentiality of every vote while providing a user-friendly experience."
    },
    {
      question: "How secure is the voting system?",
      answer: "We implement industry-standard security measures including end-to-end encryption, secure user authentication, and vote verification systems. Our platform is regularly audited to ensure the highest level of security for all users."
    },
    {
      question: "Can I create multiple polls?",
      answer: "Yes! You can create multiple polls based on your subscription plan. Each poll can have different settings, voting periods, and participant groups."
    },
    {
      question: "How do I track voting results?",
      answer: "You can track voting results in real-time through our dashboard. Results are presented with clear visualizations and can be exported in various formats."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept various payment methods including credit/debit cards, mobile money, and bank transfers. All payments are processed securely through our payment gateway."
    }
  ];

  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 py-12"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">
            Frequently Asked Questions
          </h1>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  className="w-full text-left px-6 py-4 flex justify-between items-center focus:outline-none"
                  onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <FaChevronDown
                    className={`text-gray-500 transition-transform ${
                      activeIndex === index ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="px-6 pb-4"
                  >
                    <p className="text-gray-600">{faq.answer}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Still have questions?{" "}
              <a
                href="mailto:support@votelab.com"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FAQs;
