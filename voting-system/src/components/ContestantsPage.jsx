import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import axiosInstance from "../apis/api";

const ContestantsPage = () => {
  const { pollId } = useParams(); 
  const [contestants, setContestants] = useState([]);
  const [pollTitle, setPollTitle] = useState("");

  useEffect(() => {
    // Fetch contestants for the specific poll
    const fetchContestants = async () => {
      try {
        const response = await axiosInstance.get(
          `polls/${pollId}/contestants/`
        );
        setContestants(response.data.contestants);
        setPollTitle(response.data.poll_title);
      } catch (error) {
        console.error("Error fetching contestants:", error);
      }
    };

    fetchContestants();
  }, [pollId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-500 to-teal-500 text-white py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-white hover:text-gray-200 transition"
          >
            <FaArrowLeft className="text-lg" />
            <span className="text-sm md:text-base font-medium">Back</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">{pollTitle}</h1>
        </div>
      </header>

      {/* Contestants Section */}
      <main className="py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Contestants</h2>

          {contestants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {contestants.map((contestant) => (
                <div
                  key={contestant.nominee_code}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300"
                >
                  <img
                          src={`http://localhost:8000/${contestant.image}`}
                          {...console.log(contestants)}
                    alt={contestant.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{contestant.name}</h3>

                    <p className="text-xs text-gray-500 mt-2">
                      Nominee Code: {contestant.nominee_code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No contestants found.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default ContestantsPage;
