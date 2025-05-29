import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";
import { useParams, useNavigate } from "react-router-dom";

const UpdateContestant = () => {
  const { contestantId, pollId } = useParams();
  const [contestant, setContestant] = useState({
    name: "",
    category: "",
    image: null,
    preview: null,
  });
  const [pollDetails, setPollDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pollRes, contestantRes] = await Promise.all([
          axiosInstance.get(`/polls/${pollId}/`),
          axiosInstance.get(`/polls/${pollId}/contestants/${contestantId}/`),
        ]);

        // Check if poll can be edited
        const startTime = new Date(pollRes.data.start_time);
        if (startTime <= new Date() || pollRes.data.has_votes) {
          setError(
            "This poll cannot be edited. It has either started or has votes."
          );
          return;
        }

        setPollDetails(pollRes.data);
        setContestant({
          name: contestantRes.data.name,
          category: contestantRes.data.category,
          image: null,
          preview: contestantRes.data.image || null,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pollId, contestantId]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setContestant((prev) => ({
        ...prev,
        image: files[0],
        preview: (files[0]),
      }));
    } else {
      setContestant((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Check if poll is still editable
    if (pollDetails && (new Date(pollDetails.start_time) <= new Date() || pollDetails.has_votes)) {
      setError("This poll cannot be edited anymore.");
      return;
    }

    const formData = new FormData();
    formData.append("name", contestant.name);
    formData.append("category", contestant.category);
    if (contestant.image) {
      formData.append("image", contestant.image);
    }

    try {
      await axiosInstance.patch(
        `/polls/${pollId}/contestants/${contestantId}/update/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      navigate(`/polls/${pollId}/contestants/`);
    } catch {
      setError("Failed to update the contestant.");
    }
  };

  if (loading) return <p>Loading contestant...</p>;
  if (error)
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
        <div className="text-red-500 p-4 bg-red-50 rounded mb-4">{error}</div>
        <button
          onClick={() => navigate(`/polls/${pollId}/contestants/`)}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Back to Contestants
        </button>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Update Contestant</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={contestant.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Category</label>
          <input
            type="text"
            name="category"
            value={contestant.category}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Contestant Image</label>
          <input
            type="file"
            accept="image/*"
            name="image"
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
          {(contestant.preview || contestant.image) && (
            <img
              src={contestant.preview || contestant.image || contestant.image?.url}
              alt="Contestant Preview"
              className="mt-2 h-32 w-32 object-cover"
            />
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Update Contestant
        </button>
      </form>
    </div>
  );
};

export default UpdateContestant;