import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../apis/api";
import { FaArrowAltCircleLeft } from "react-icons/fa";
import avatar from "../assets/user-icon.jpg";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import CustomBarLabel from "./CustomBarLabel";

const ResultsPage = () => {
  // Get the pollId from the URL parameters
  const { pollId } = useParams();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch results whenever pollId changes
  useEffect(() => {
    fetchResults();
  }, [pollId]);

  // Function to fetch results for the specific pollId
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/vote/results/${pollId}`);
      const processedResults = processResults(response.data);
      setResults(processedResults);
    } catch (error) {
      console.error("Error fetching results:", error);
      setError(
        error.response?.data?.message ||
          "Failed to fetch results. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  // Function to process and aggregate results
  const processResults = (data) => {
    const resultMap = new Map();
    data.forEach((item) => {
      if (resultMap.has(item.name)) {
        const existing = resultMap.get(item.name);
        existing.vote_count += item.vote_count || 0;
      } else {
        resultMap.set(item.name, {
          name: item.name,
          image: item.image || avatar,
          vote_count: item.vote_count || 0,
        });
      }
    });
    return Array.from(resultMap.values()).sort(
      (a, b) => b.vote_count - a.vote_count
    );
  };

  // Function to generate dynamic colors for the chart
  const getDynamicColor = (index, total) =>
    `hsl(${(index * 360) / total}, 70%, 50%)`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-500 to-blue-500 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Poll Results</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-10">
        <div className="container mx-auto px-4">
          {loading ? (
            <p className="text-center text-gray-500">Loading results...</p>
          ) : error ? (
            <div className="text-center">
              <p className="text-red-500">{error}</p>
              <button
                className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
                onClick={fetchResults}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Bar Chart Section */}
              <section className="mb-10">
                <h2 className="text-xl font-bold mb-4">Results Overview</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={results}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="vote_count"
                      animationDuration={800}
                      label={<CustomBarLabel results={results} />}
                    >
                      {results.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getDynamicColor(index, results.length)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>

              {/* Pie Chart Section */}
              <section className="mb-10">
                <h2 className="text-xl font-bold mb-4">Vote Distribution</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={results}
                      dataKey="vote_count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={(entry) =>
                        `${entry.name}: ${entry.vote_count} (${(
                          (entry.vote_count /
                            results.reduce(
                              (acc, item) => acc + item.vote_count,
                              0
                            )) *
                          100
                        ).toFixed(2)}%)`
                      }
                      animationDuration={800}
                    >
                      {results.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getDynamicColor(index, results.length)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </section>

              {/* Table Section */}
              <section>
                <h2 className="text-xl font-bold mb-4">Detailed Results</h2>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2">Name</th>
                      <th className="border border-gray-300 px-4 py-2">
                        Votes
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        Image
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-100">
                        <td className="border border-gray-300 px-4 py-2">
                          {result.name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.vote_count}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <img
                            src={result.image || avatar}
                            alt={`${result.name}`}
                            className="w-10 h-10 object-cover rounded-full"
                            loading="lazy"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      </main>
      <Link
        to={"/home"}
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <FaArrowAltCircleLeft className="mx-3" />
        Back
      </Link>
    </div>
  );
};

export default ResultsPage;
