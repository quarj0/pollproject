import {
  FaEnvelope,
  FaInstagram,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaPhone,
  FaTwitter,
  FaWhatsapp,
} from "react-icons/fa";
const Footer = () => {
  return (
    <footer className="py-10 bg-gradient-to-br from-gray-800 to-blue-950 text-white">
      <div className="container mx-auto px-6">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:justify-between text-center md:text-left space-y-10 md:space-y-0">
          {/* Quick Links */}
          <div>
            <h5 className="text-lg font-semibold mb-4">Quick Links</h5>
            <ul className="space-y-2">
              <li>
                <a
                  href="/home"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Services
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Other Links */}
          <div>
            <h5 className="text-lg font-semibold mb-4">Other Links</h5>
            <ul className="space-y-2">
              <li>
                <a
                  href="#privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#support"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="block justify-center md:justify-start ">
            <h5 className="text-lg font-semibold mb-4">Contact Us</h5>
            <p className="text-gray-400 mb-4">
              <FaMapMarkerAlt className="text-xl text-red-500 mx-1" />
              Ejisu, Kumasi-Accra Road Ghana
            </p>
            <p className="text-gray-400 mb-4">
              <FaEnvelope className="text-xl text-white mx-1" />
              guidemelearn.info@gmail.com
            </p>
            <p className="text-gray-400 mb-4">
              <FaPhone className="text-xl mx-1" /> (233) 559-537-405
            </p>
            <p className="text-gray-400">
              <FaWhatsapp className="text-green-500 text-xl" />
              (233) 595-603-554
            </p>
          </div>

          {/* Social Media */}
          <div>
            <h5 className="text-lg font-semibold mb-4">Follow Us</h5>
            <div className="flex justify-center md:justify-start space-x-4">
              <a
                href="https://instagram.com/quarjowusu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaInstagram className="text-2xl text-pink-500" />
              </a>
              <a
                href="https://x.com/quarjowusu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTwitter className="text-2xl text-blue-400" />
              </a>
              <a
                href="https://linkedin.com/in/quarjo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaLinkedinIn className="text-2xl text-blue-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Voting System. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
