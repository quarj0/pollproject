import { motion } from "framer-motion";

const About = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 py-12"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">About Us</h1>
          
          <div className="prose lg:prose-xl">
            <p className="text-gray-600 mb-6">
              Votelab is a cutting-edge voting platform designed to streamline the process of creating,
              managing, and participating in polls and elections. We believe in making voting accessible,
              secure, and efficient for everyone.
            </p>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Our Mission</h2>
            <p className="text-gray-600 mb-6">
              Our mission is to modernize voting systems and make them more accessible to organizations
              of all sizes. We provide a secure, user-friendly platform that ensures the integrity of
              every vote while making the process as simple as possible for both organizers and voters.
            </p>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Our Values</h2>
            <ul className="list-disc pl-6 text-gray-600 mb-6">
              <li>Security - We prioritize the protection of voter data and poll integrity</li>
              <li>Accessibility - Making voting available to everyone, everywhere</li>
              <li>Transparency - Clear, honest communication about our processes</li>
              <li>Innovation - Continuously improving our platform</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Our Team</h2>
            <p className="text-gray-600">
              Our team consists of dedicated professionals committed to revolutionizing the voting
              experience. With expertise in cybersecurity, software development, and user experience
              design, we work together to deliver the best possible platform for our users.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default About;
