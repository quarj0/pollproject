import { motion } from "framer-motion";
import { FaShieldAlt, FaChartLine, FaUsers, FaHeadset } from "react-icons/fa";
import { Helmet } from "react-helmet-async";

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
    <>
      <Helmet>
        <title>Services | Cast Sure - Professional Voting & Poll Management</title>
        <meta
          name="description"
          content="Explore Cast Sure's comprehensive voting and poll management services. Featuring secure voting systems, real-time analytics, multi-user management, and 24/7 support."
        />
        <meta
          name="keywords"
          content="voting system, poll management, secure voting, real-time analytics, multi-user management, voting services"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Cast Sure Voting Services",
            "provider": {
              "@type": "Organization",
              "name": "Cast Sure"
            },
            "serviceType": "Voting System",
            "description": "Professional voting and poll management services including secure voting systems, real-time analytics, and multi-user management."
          })}
        </script>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-50 py-12"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-gray-900">
                Our Services
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover our comprehensive range of voting and poll management
                services designed to meet your organization&apos;s needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
                >
                  <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                    <service.icon className="w-7 h-7 text-secondary-600" />
                  </div>
                  <h3 className="text-2xl font-montserrat font-semibold mb-3 text-gray-900">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 font-lato leading-relaxed">
                    {service.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-16 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-10">
                <h2 className="text-3xl font-montserrat font-bold mb-8 text-gray-900">
                  Why Choose Cast Sure?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-primary-50 p-6 rounded-xl">
                    <h3 className="font-montserrat font-semibold text-xl mb-4 text-gray-900">
                      For Organizations
                    </h3>
                    <ul className="space-y-3 text-gray-700 font-lato">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Advanced poll creation and management
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Fully customizable voting parameters
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Comprehensive analytics dashboard
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Enterprise-grade security
                      </li>
                    </ul>
                  </div>
                  <div className="bg-primary-50 p-6 rounded-xl">
                    <h3 className="font-montserrat font-semibold text-xl mb-4 text-gray-900">
                      For Voters
                    </h3>
                    <ul className="space-y-3 text-gray-700 font-lato">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Intuitive, modern interface
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Seamless mobile experience
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Quick, secure voting process
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        Live result tracking
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <p className="text-lg text-gray-600 font-lato mb-6">
                Ready to transform your voting experience with Cast Sure?
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-primary-600 text-white font-montserrat font-semibold px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors duration-300"
              >
                Get Started Today
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Services;
