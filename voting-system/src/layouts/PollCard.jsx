import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCalendarAlt, FaUserFriends, FaVoteYea } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";

const PollCard = ({ item, linkTo }) => {
  const { title, description, image, endTime, totalVotes, pollType } = item;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    },
    hover: { 
      y: -5,
      boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)",
      transition: { duration: 0.2 }
    }
  };

  const imageVariants = {
    hover: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="bg-white rounded-xl overflow-hidden shadow-soft-xl"
    >
      <Link to={linkTo} className="block">
        <div className="relative h-48 overflow-hidden">
          <motion.img
            variants={imageVariants}
            src={(image)}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium
              ${pollType === 'voters-pay' ? 'bg-accent-500' : 'bg-secondary-500'} text-white
            `}>
              {pollType === 'voters-pay' ? 'Voters Pay' : 'Creator Pay'}
            </span>
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
            {title}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-2">
            {description}
          </p>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <FaCalendarAlt className="mr-2" />
              <span>
                {endTime && formatDistanceToNow(new Date(endTime), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center">
              <FaVoteYea className="mr-2" />
              <span>{totalVotes || 0} votes</span>
            </div>
          </div>
        </div>
        
        <div className="px-5 py-4 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center text-secondary-600">
            <FaUserFriends className="mr-2" />
            <span className="font-medium">Join Now</span>
          </div>
          <motion.div
            whileHover={{ x: 5 }}
            className="text-secondary-600"
          >
            →
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
};

PollCard.propTypes = {
  item: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.string,
    startTime: PropTypes.string,
    endTime: PropTypes.string,
    totalVotes: PropTypes.number,
    pollType: PropTypes.oneOf(['voters-pay', 'creator-pay'])
  }).isRequired,
  linkTo: PropTypes.string.isRequired
};

export default PollCard;
