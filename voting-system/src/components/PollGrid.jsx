import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import PollCardSkeleton from './skeletons/PollCardSkeleton';

const PollGrid = ({ 
  polls, 
  loading, 
  emptyMessage = "No polls found", 
  error = null,
  renderItem 
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load polls</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <PollCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!polls.length) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{emptyMessage}</h3>
          <p className="text-gray-500">Check back later for new polls</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      {polls.map((poll, index) => (
        <motion.div
          key={poll.id || index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          {renderItem(poll)}
        </motion.div>
      ))}
    </motion.div>
  );
};

PollGrid.propTypes = {
  polls: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  error: PropTypes.string,
  renderItem: PropTypes.func.isRequired,
};

export default PollGrid;
