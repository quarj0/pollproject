import PropTypes from "prop-types";

const ContestantField = ({ index, contestant, handleChange, handleRemove }) => {
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleChange(index, "image", event);
      handleChange(index, "preview", URL.createObjectURL(file));
    }
  };

  return (
    <div className="p-4 border rounded mb-4">
      <div className="mb-4">
        <label htmlFor={`name-${index}`} className="block font-medium">
          Name
        </label>
        <input
          id={`name-${index}`}
          type="text"
          value={contestant.name}
          onChange={(e) => handleChange(index, "name", e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>
      <div className="mb-4">
        <label htmlFor={`category-${index}`} className="block font-medium">
          Category
        </label>
        <input
          id={`category-${index}`}
          type="text"
          value={contestant.category}
          onChange={(e) => handleChange(index, "category", e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>
      <div className="mb-4">
        <label htmlFor={`image-${index}`} className="block font-medium">
          Image
        </label>
        <input
          id={`image-${index}`}
          type="file"
          accept="image/jpg, image/png"
          onChange={handleImageChange} // Handle image file changes
          className="w-full border rounded p-2"
        />
        {contestant.preview && (
          <img
            src={contestant.preview}
            alt="Contestant Preview"
            className="mt-2 h-32 w-32 object-cover"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => handleRemove(index)}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
      >
        Remove Contestant
      </button>
    </div>
  );
};

ContestantField.propTypes = {
  index: PropTypes.number.isRequired,
  contestant: PropTypes.shape({
    category: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    preview: PropTypes.string,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  handleRemove: PropTypes.func.isRequired,
};

export default ContestantField;
