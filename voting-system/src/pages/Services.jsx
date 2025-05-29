import { motion } from "framer-motion";
import { FaShieldAlt, FaChartLine, FaUsers, FaHeadset } from "react-icons/fa";

const Services = () => {
  const services = [
    {
      icon: FaShieldAlt,
      title: "Secure Voting System",
      description:
        "State-of-the-art encryption and security measures to ensure the integrity and confidentiality of every vote.",
    },
    {
      icon: FaChartLine,
      title: "Real-time Analytics",
      description:
        "Get instant insights with our comprehensive analytics dashboard. Track voting patterns and engagement in real-time.",
    },
    {
      icon: FaUsers,
      title: "Multi-user Management",
      description:
        "Create and manage multiple user roles with different permissions. Perfect for organizations of any size.",
    },
    {
      icon: FaHeadset,
      title: "24/7 Support",
      description:
        "Our dedicated support team is available around the clock to help you with any questions or issues.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 py-12"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-gray-900">Our Services</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our comprehensive range of voting and poll management services
              designed to meet your organization&apos;s needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">
                  {service.title}
                </h3>
                <p className="text-gray-600">{service.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Why Choose Our Services?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">
                    For Organizations
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    <li>Easy poll creation and management</li>
                    <li>Customizable voting parameters</li>
                    <li>Detailed reporting and analytics</li>
                    <li>Secure user authentication</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">For Voters</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    <li>User-friendly interface</li>
                    <li>Mobile-responsive design</li>
                    <li>Quick and easy voting process</li>
                    <li>Real-time result viewing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Ready to get started with our services?
            </p>
            <a
              href="/contact"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Contact Us Today
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Services;
