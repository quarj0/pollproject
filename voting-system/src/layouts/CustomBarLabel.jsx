import PropTypes from "prop-types";
import avatar from "../assets/user-icon.jpg";

const CustomBarLabel = ({ x, y, width, index, results }) => {
  const imageUrl = results[index]?.image || avatar;

  if (!imageUrl) return null;

  return (
    <g>
      <image
        href={imageUrl}
        x={x + width / 2 - 15}
        y={y - 40}
        height="30"
        width="30"
        style={{ borderRadius: "50%" }}
      />
    </g>
  );
};

CustomBarLabel.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      image: PropTypes.string,
      vote_count: PropTypes.number.isRequired,
    })
  ).isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

export default CustomBarLabel;
