import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiChevronRight } from 'react-icons/hi';

const Breadcrumb = () => {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(path => path);

  const formatPath = (path) => {
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex px-5 py-3 text-gray-700 border border-gray-200 rounded-lg bg-gray-50 max-w-fit mx-4 mt-4"
      aria-label="Breadcrumb"
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            Home
          </Link>
        </li>
        {paths.map((path, index) => (
          <li key={index}>
            <div className="flex items-center">
              <HiChevronRight className="w-5 h-5 text-gray-400" />
              <Link
                to={`/${paths.slice(0, index + 1).join('/')}`}
                className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
              >
                {formatPath(path)}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </motion.nav>
  );
};

export default Breadcrumb;
