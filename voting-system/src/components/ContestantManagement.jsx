import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../apis/api';

const ContestantManagement = () => {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPollAndContestants = async () => {
      try {
        const [pollRes, contestantsRes] = await Promise.all([
          axiosInstance.get(`/polls/${pollId}/`),
          axiosInstance.get(`/polls/${pollId}/contestants/`)
        ]);
        setPoll(pollRes.data.poll);
        setContestants(contestantsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchPollAndContestants();
  }, [pollId]);

  const handleDelete = async (contestantId) => {
    if (!window.confirm("Are you sure you want to delete this contestant?")) return;
    try {
      await axiosInstance.delete(`/polls/${pollId}/contestants/${contestantId}/delete/`);
      setContestants(prev => prev.filter(c => c.id !== contestantId));
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Failed to delete the contestant. Please try again.");
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-center py-8">
      <p className="text-red-500">{error}</p>
      <button 
        onClick={() => navigate('/manage-polls')}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Back to Poll Management
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{poll?.title}</h1>
          <p className="text-gray-600">Manage Contestants</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/manage-polls')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Polls
          </button>
          {!poll?.ended && (
            <button
              onClick={() => navigate(`/create/${pollId}/contestants`)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add New Contestant
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200 py-3 px-4 text-sm font-medium text-gray-700">
          <div className="col-span-1">Image</div>
          <div className="col-span-2">Name</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {contestants.map((contestant) => (
            <div key={contestant.id} className="grid grid-cols-8 py-4 px-4 items-center hover:bg-gray-50">
              <div className="col-span-1">
                <img 
                  src={contestant.contestant_image} 
                  alt={contestant.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              </div>
              <div className="col-span-2 font-medium text-gray-900">{contestant.name}</div>
              <div className="col-span-2 text-gray-600">{contestant.category}</div>
              <div className="col-span-2 text-right space-x-2">
                {!poll?.ended && (
                  <>
                    <button
                      onClick={() => navigate(`/polls/${pollId}/contestants/${contestant.id}/update`)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contestant.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {contestants.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No contestants found. Add some contestants to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestantManagement; 