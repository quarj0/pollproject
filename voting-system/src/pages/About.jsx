import { motion } from "framer-motion";
import Metadata from "../components/Metadata";

const About = () => {
  const seoData = {
    title: "About Cast Sure - Our Mission and Values",
    description: "Learn about Cast Sure's mission to revolutionize digital voting. Discover our commitment to security, accessibility, and innovation in poll management.",
    keywords: "digital voting platform, secure voting system, online polling, Cast Sure mission, voting technology",
    canonical: "https://castsure.com/about"
  };

  return (
    <>
      <Metadata {...seoData} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-50 py-12"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 font-montserrat">About Cast Sure</h1>
            
            <div className="prose lg:prose-xl">
              <p className="text-gray-600 mb-6 font-lato">
                Cast Sure is a professional-grade digital voting platform engineered to transform the way
                organizations conduct polls and elections. We&apos;re committed to providing enterprise-level
                security while maintaining an intuitive, user-friendly experience.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-gray-800 font-montserrat">Our Mission</h2>
              <p className="text-gray-600 mb-6 font-lato">
                Our mission is to revolutionize digital voting by providing organizations with a secure,
                scalable, and user-friendly platform. We&apos;re dedicated to ensuring the integrity of every
                vote while making the process seamless for both organizers and participants.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-gray-800 font-montserrat">Our Values</h2>
              <ul className="list-disc pl-6 text-gray-600 mb-6 font-lato">
                <li className="mb-2">
                  <span className="font-semibold">Enterprise Security</span> - Industry-leading protection for your voting data
                </li>
                <li className="mb-2">
                  <span className="font-semibold">Universal Accessibility</span> - Ensuring everyone can participate easily
                </li>
                <li className="mb-2">
                  <span className="font-semibold">Complete Transparency</span> - Open communication about our security and processes
                </li>
                <li className="mb-2">
                  <span className="font-semibold">Continuous Innovation</span> - Regular updates and improvements based on user feedback
                </li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-gray-800 font-montserrat">Technology & Security</h2>
              <p className="text-gray-600 mb-6 font-lato">
                Cast Sure is built on cutting-edge technology, featuring end-to-end encryption,
                blockchain-based verification, and real-time monitoring. Our platform meets the highest
                industry standards for digital voting security and reliability.
              </p>

              <div className="bg-primary-50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-800 font-montserrat">Why Choose Cast Sure?</h3>
                <ul className="space-y-2 text-secondary-700 font-lato">
                  <li>✓ Enterprise-grade security protocols</li>
                  <li>✓ Real-time results and analytics</li>
                  <li>✓ Customizable voting experiences</li>
                  <li>✓ 24/7 technical support</li>
                  <li>✓ Mobile-friendly interface</li>
                </ul>
              </div>

              <h2 className="text-2xl font-semibold mb-4 text-gray-800 font-montserrat">Our Team</h2>
              <p className="text-gray-600 font-lato">
                Behind Cast Sure is a team of dedicated professionals with expertise in cybersecurity,
                software development, and user experience design. We&apos;re committed to delivering the most
                reliable and user-friendly voting platform for organizations worldwide.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default About;
