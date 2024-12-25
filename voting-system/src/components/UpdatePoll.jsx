import { useState, useEffect } from "react";
import axiosInstance from "../apis/api";
import { useParams, useNavigate } from "react-router-dom";
import Message from "./Message";
import { FaArrowLeft } from "react-icons/fa";

const UpdatePoll = () => {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = useNavigate();

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const res = await axiosInstance.get(`/polls/${pollId}/`);
        setPoll(res.data);
        console.log(res.data);
      } catch (err) {
        setError("Failed to fetch poll details.");
        console.error(err); 
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();
  }, [pollId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.patch(`/polls/${pollId}/update/`, poll);
      history.push(`/polls/${pollId}/`);
    } catch {
      setError("Failed to update the poll.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPoll((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) return <p>Loading poll...</p>;
  if (error) return <p>{error}</p>;

  // Add a null check to ensure poll is fetched
  if (!poll) {
    return <p>Poll not found.</p>;
  }

  // If the poll is not active, show details instead of the form
  if (!poll.active) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
        <h1 className="text-2xl font-bold mb-4">Poll Details</h1>

        {poll.detail && <p className="text-red-500">{poll.detail}</p>}

        <div className="mb-4">
          <label className="block mb-2">Title</label>
          <p>{poll.title}</p>
        </div>
        <div className="mb-4">
          <label className="block mb-2">Description</label>
          <p>{poll.description}</p>
        </div>
        <div className="mb-4">
          <label className="block mb-2">Poll Image</label>
          <img
            src={`http://localhost:8000${poll.poll_image}`}
            alt="Poll Image"
            className="mt-2 h-32 w-32 object-cover"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Start Time</label>
          <p>{new Date(poll.start_time).toLocaleString()}</p>
        </div>
        <div className="mb-4">
          <label className="block mb-2">End Time</label>
          <p>{new Date(poll.end_time).toLocaleString()}</p>
        </div>
        <p className="text-red-500">This poll is not active.</p>
        <button
          onClick={() => history(`/manage-polls`)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          <FaArrowLeft className="inline-block" /> Go Back
        </button>
      </div>
    );
  }

  // If poll is active, allow updating
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Update Poll</h1>

      {poll.detail && <p className="text-red-500">{poll.detail}</p>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2">Title</label>

          <input
            type="text"
            name="title"
            value={poll.title}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Description</label>
          <textarea
            name="description"
            value={poll.description}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Poll Image</label>
          <input
            type="file"
            accept="image/jpg, image/png"
            onChange={(e) =>
              setPoll((prev) => ({
                ...prev,
                image: e.target.files[0],
                preview: URL.createObjectURL(e.target.files[0]),
              }))
            }
            className="w-full p-2 border border-gray-300 rounded"
          />
          {poll.preview && (
            <img
              src={poll.preview}
              alt="Poll Preview"
              className="mt-2 h-32 w-32 object-cover"
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-2">Start Time</label>
          <input
            type="datetime-local"
            name="start_time"
            value={poll.start_time}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">End Time</label>
          <input
            type="datetime-local"
            name="end_time"
            value={poll.end_time}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Update Poll
        </button>
        {Message && <Message type="error" message={error} />}
      </form>
    </div>
  );
};

export default UpdatePoll;
