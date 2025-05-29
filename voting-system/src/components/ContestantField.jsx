import PropTypes from "prop-types";
import axiosInstance from "../apis/api";
import { useState } from "react";
import { useParams } from "react-router-dom";

const AddContestants = () => {
  const { pollId } = useParams();

  const [contestants, setContestants] = useState([
    { name: "", category: "", image: null, preview: null },
  ]);

  const handleChange = (index, key, value) => {
    const newContestants = [...contestants];
    newContestants[index][key] = value;
    setContestants(newContestants);
  };

  const handleRemove = (index) => {
    const newContestants = [...contestants];
    newContestants.splice(index, 1);
    setContestants(newContestants);
  };

  const handleAdd = () => {
    setContestants([...contestants, { name: "", category: "", image: null }]);
  };

  const handleSubmit = async () => {
    let isValid = true;

    // Validate each contestant's data
    contestants.forEach((contestant, index) => {
      if (!contestant.name || !contestant.category) {
        isValid = false;
        alert(
          `Please fill out both name and category for contestant ${index + 1}`
        );
      }
    });

    if (!isValid) return;

    try {
      // Submit each contestant as a separate request
      for (const contestant of contestants) {
        const formData = new FormData();
        formData.append("poll", pollId);
        formData.append("name", contestant.name);
        formData.append("category", contestant.category);
        if (contestant.image) {
          formData.append("image", contestant.image);
        }

        const response = await axiosInstance.post(
          `polls/${pollId}/contestants/create/`,
          formData
        );
        console.log("Contestant added:", response.data);
      }

      alert("All contestants added successfully!");
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        const messages = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
          .join("\n");
        alert(`Errors:\n${messages}`);
      } else {
        alert("Failed to add contestants. Please try again.");
      }
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Add Contestants for Poll {pollId}
      </h1>
      {contestants.map((contestant, index) => (
        <ContestantField
          key={index}
          index={index}
          contestant={contestant}
          handleChange={handleChange}
          handleRemove={handleRemove}
        />
      ))}
      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={handleAdd}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
        >
          Add Contestant
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

const ContestantField = ({ index, contestant, handleChange, handleRemove }) => {
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleChange(index, "image", file);
      handleChange(index, "preview", (file));
    }
  };

  return (
    <div className="p-6 border rounded-lg mb-6 shadow-sm bg-white">
      <div className="mb-4">
        <label
          htmlFor={`name-${index}`}
          className="block font-semibold text-gray-700"
        >
          Name
        </label>
        <input
          id={`name-${index}`}
          type="text"
          value={contestant.name}
          onChange={(e) => handleChange(index, "name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor={`category-${index}`}
          className="block font-semibold text-gray-700"
        >
          Category
        </label>
        <input
          id={`category-${index}`}
          type="text"
          value={contestant.category}
          onChange={(e) => handleChange(index, "category", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor={`image-${index}`}
          className="block font-semibold text-gray-700"
        >
          Image
        </label>
        <input
          id={`image-${index}`}
          type="file"
          accept="image/jpg, image/jpeg, image/png"
          onChange={handleImageChange}
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {contestant.preview && (
          <img
            src={contestant.preview}
            alt="Contestant Preview"
            className="mt-4 h-32 w-32 object-cover rounded-lg shadow-sm"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => handleRemove(index)}
        className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
      >
        Remove Contestant
      </button>
    </div>
  );
};

ContestantField.propTypes = {
  index: PropTypes.number.isRequired,
  contestant: PropTypes.shape({
    name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    image: PropTypes.object,
    preview: PropTypes.string,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  handleRemove: PropTypes.func.isRequired,
};

export default AddContestants;
