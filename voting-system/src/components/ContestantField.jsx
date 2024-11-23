import PropTypes from "prop-types";

const ContestantField = ({ index, contestant, handleChange, handleRemove }) => {
return (
    <div className="border rounded p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Contestant {index + 1}</h3>
            <button
                type="button"
                onClick={() => handleRemove(index)}
                className="bg-red-500 text-white px-2 py-1 rounded"
            >
                Remove
            </button>
        </div>
        <div className="mb-4">
            <label className="block font-medium">Category</label>
            <input
                type="text"
                value={contestant.category}
                onChange={(e) => handleChange(index, "category", e.target.value)}
                className="w-full border rounded p-2"
            />
        </div>
        <div className="mb-4">
            <label className="block font-medium">Name</label>
            <input
                type="text"
                value={contestant.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
                className="w-full border rounded p-2"
            />
        </div>
        <div className="mb-4">
            <label className="block font-medium">Award</label>
            <input
                type="text"
                value={contestant.award}
                onChange={(e) => handleChange(index, "award", e.target.value)}
                className="w-full border rounded p-2"
            />
        </div>
        <div className="mb-4">
            <label className="block font-medium">Image</label>
            <input
                type="file"
                accept="image/jpeg, image/png"
                onChange={(e) => handleChange(index, "image", e)}
                className="w-full border rounded p-2"
            />
            {contestant.preview && (
                <img
                    src={contestant.preview}
                    alt={`Contestant ${index + 1}`}
                    className="mt-2 w-32 h-32 object-cover rounded"
                />
            )}
        </div>
    </div>
);
};

ContestantField.propTypes = {
  index: PropTypes.number.isRequired,
  contestant: PropTypes.shape({
    category: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    award: PropTypes.string.isRequired,
    preview: PropTypes.string,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  handleRemove: PropTypes.func.isRequired,
};

export default ContestantField;
