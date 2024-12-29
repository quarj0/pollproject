import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const PollCard = ({ item, linkTo, placeholderImage }) => {
  const { title, description, image } = item;

  return (
    <Link
      to={linkTo}
      className="relative h-64 md:h-80 w-full cursor-pointer hover:scale-105 transition-transform duration-300"
    >
      <img
        src={image ? `http://localhost:8000${image}` : placeholderImage}
        alt={title}
        className="absolute inset-0 object-cover w-full h-full rounded-xl shadow-lg"
      />
      <div className="absolute inset-0 bg-black bg-opacity-50 text-white flex flex-col justify-between p-4 rounded-xl">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm">{description}</p>
      </div>
    </Link>
  );
};

PollCard.defaultProps = {
  placeholderImage: "https://via.placeholder.com/300",
};

PollCard.propTypes = {
  item: PropTypes.object.isRequired,
  linkTo: PropTypes.string.isRequired,
  placeholderImage: PropTypes.string,
};

export default PollCard;
