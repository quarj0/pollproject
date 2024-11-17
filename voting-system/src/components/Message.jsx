import PropTypes from "prop-types";

const Message = ({ type, message }) => {
  if (!message) return null;

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  const textColor = type === "success" ? "text-white" : "text-white";

  return (
    <div
      className={`p-4 mb-4 rounded-md ${bgColor} ${textColor} max-w-md mx-auto`}
    >
      <p>{message}</p>
    </div>
  );
};

Message.propTypes = {
  type: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
};

export default Message;
