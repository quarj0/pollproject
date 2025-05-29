import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../apis/api";
import { format } from "date-fns";
import { getImageUrl } from '../utils/imageHelper';

const EditPoll = () => {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [poll, setPoll] = useState({
    title: "",
    description: "",
    poll_image: null,
    preview: null,
    start_time: "",
    end_time: "",
  });
  const [retryCount, setRetryCount] = useState(0);
  const [modifiedFields, setModifiedFields] = useState(new Set());

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get(`/polls/${pollId}/`);
        
        if (!response?.data) {
          throw new Error("No data received from server");
        }

        const pollData = response.data;

        // Set default dates if missing
        const now = new Date();
        const tomorrow = new Date(now.setDate(now.getDate() + 1));
        
        const startDate = pollData.start_time ? new Date(pollData.start_time) : now;
        const endDate = pollData.end_time ? new Date(pollData.end_time) : tomorrow;

        // Validate dates
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const formattedStartTime = format(startDate, "yyyy-MM-dd'T'HH:mm");
          const formattedEndTime = format(endDate, "yyyy-MM-dd'T'HH:mm");

          setPoll({
            title: pollData.title || '',
            description: pollData.description || '',
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            preview: pollData.poll_image ? getImageUrl(pollData.poll_image) : null,
            poll_image: null,
          });
        } else {
          throw new Error("Invalid date format received from server");
        }
      } catch (err) {
        console.error("Poll fetch error:", err);
        setError(
          err.response?.data?.detail || 
          err.response?.data?.message || 
          "Failed to load poll data. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [pollId, retryCount]);

  // Add retry function
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setModifiedFields(prev => new Set([...prev, name]));
    
    if (files && files[0]) {
      setPoll(prev => ({
        ...prev,
        poll_image: files[0],
        preview: URL.createObjectURL(files[0])
      }));
    } else {
      setPoll(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Only include modified fields
      modifiedFields.forEach(field => {
        if (field === 'poll_image' && poll.poll_image) {
          formData.append(field, poll.poll_image);
        } else if (field === 'start_time' || field === 'end_time') {
          // Format dates for API
          const date = new Date(poll[field]);
          formData.append(field, date.toISOString());
        } else if (poll[field] !== null && field !== 'preview') {
          formData.append(field, poll[field]);
        }
      });

      // Don't submit if no fields were modified
      if (modifiedFields.size === 0) {
        navigate('/dashboard');
        return;
      }

      await axiosInstance.patch(`/polls/${pollId}/update/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      navigate('/dashboard');
    } catch (err) {
      const errorMessages = [];
      if (err.response?.data) {
        Object.entries(err.response.data).forEach(([field, errors]) => {
          errorMessages.push(`${field}: ${errors.join(', ')}`);
        });
      }
      setError(errorMessages.length > 0 ? errorMessages.join('\n') : "Failed to update poll");
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading poll details...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 p-4 rounded-lg mb-4">
        <p className="text-red-500">{error}</p>
        <p className="text-sm text-gray-600 mt-2">
          There was a problem fetching the poll details. Please try again.
        </p>
      </div>
      <div className="flex space-x-4">
        <button 
          onClick={handleRetry} 
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Retry
        </button>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={poll.title}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            
          />
        </div>

        <div>
          <label className="block mb-2">Description</label>
          <textarea
            name="description"
            value={poll.description}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="4"
            
          />
        </div>

        <div>
          <label className="block mb-2">Start Time</label>
          <input
            type="datetime-local"
            name="start_time"
            value={poll.start_time}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            
          />
        </div>

        <div>
          <label className="block mb-2">End Time</label>
          <input
            type="datetime-local"
            name="end_time"
            value={poll.end_time}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            
          />
        </div>

        <div>
          <label className="block mb-2">Poll Image</label>
          <input
            type="file"
            name="poll_image"
            onChange={handleChange}
            accept="image/*"
            className="w-full p-2 border rounded"
          />
          {poll.preview && (
            <div className="mt-2">
              <img 
                src={poll.preview} 
                alt="Poll Preview" 
                className="max-w-xs rounded shadow-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-image.png'; // Add a placeholder image
                }}
              />
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded">
            Update Poll
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')}
            className="bg-gray-500 text-white px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPoll;
