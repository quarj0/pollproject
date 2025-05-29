import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../apis/api";
import {
  FaArrowLeft,
  FaChartBar,
  FaChartPie,
  FaTable,
  FaTrophy,
  FaVoteYea,
} from "react-icons/fa";
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

const ResultsPage = () => {
  const { pollId } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("bar");
  const [pollDetails, setPollDetails] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const [resultsResponse, pollResponse] = await Promise.all([
        axiosInstance.get(`/vote/results/${pollId}/`),
        axiosInstance.get(`/polls/${pollId}/`),
      ]);

      // Check if we have results array in the response
      const resultsData = resultsResponse.data.results || resultsResponse.data;
      const processedResults = processResults(resultsData);
      setResults(processedResults);
      setPollDetails(pollResponse.data);
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

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // WebSocket setup for real-time results
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/poll/${pollId}/`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.poll_results) {
          setResults(processResults(data.poll_results));
        } else {
          setResults(processResults(data));
        }
      } catch (e) {
        console.error("Error processing WebSocket message:", e);
        setError("Error processing live results data.");
      }
    };

    return () => {
      ws.close();
    };
  }, [pollId]);

  const processResults = (data) => {
    if (!data) return [];

    // If data has categories structure
    if (data.categories) {
      const allResults = [];
      Object.values(data.categories).forEach((categoryResults) => {
        categoryResults.forEach((result) => {
          allResults.push({
            name: result.name,
            image: result.image ? `http://localhost:8000${result.image}` : avatar,
            vote_count: result.vote_count || 0,
            category: result.category,
          });
        });
      });
      return allResults.sort((a, b) => b.vote_count - a.vote_count);
    }

    // If data is a flat array
    if (Array.isArray(data)) {
      const resultMap = new Map();
      data.forEach((item) => {
        const contestant = item.contestant || item;
        const voteCount = item.total_votes || item.vote_count || 0;
        if (resultMap.has(contestant.name)) {
          const existing = resultMap.get(contestant.name);
          existing.vote_count += voteCount;
        } else {
          resultMap.set(contestant.name, {
            name: contestant.name,
            image: contestant.image ? `http://localhost:8000${contestant.image}` : avatar,
            vote_count: voteCount,
          });
        }
      });
      return Array.from(resultMap.values()).sort((a, b) => b.vote_count - a.vote_count);
    }

    // If data is an object with poll_title, total_votes format
    if (data.poll_title && data.categories) {
      const allResults = [];
      Object.entries(data.categories).forEach(([category, results]) => {
        results.forEach((result) => {
          allResults.push({
            name: result.name,
            image: result.image || avatar,
            vote_count: result.vote_count || 0,
            category,
          });
        });
      });
      return allResults.sort((a, b) => b.vote_count - a.vote_count);
    }

    return [];
  };

  const getDynamicColor = (index, total) =>
    `hsl(${(index * 360) / total}, 70%, 50%)`;

  const getVotePercentage = (votes) => {
    const totalVotes = results.reduce(
      (acc, result) => acc + result.vote_count,
      0
    );
    return totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  const renderChart = () => {
    switch (activeTab) {
      case "bar":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <FaChartBar className="mr-2 text-primary-600" />
              Results Overview
            </h2>
            <ResponsiveContainer
              width="100%"
              height={400}
              className="animate__animated animate__fadeIn"
            >
              <BarChart
                data={results}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="vote_count"
                  animationDuration={1500}
                  label={{ position: "top" }}
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
          </motion.div>
        );

      case "pie":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <FaChartPie className="mr-2 text-primary-600" />
              Vote Distribution
            </h2>
            <ResponsiveContainer
              width="100%"
              height={400}
              className="animate__animated animate__fadeIn"
            >
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value, name) => [
                    `${value} votes (${getVotePercentage(value)}%)`,
                    name,
                  ]}
                />
                <Legend />
                <Pie
                  data={results}
                  dataKey="vote_count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                    index,
                  }) => {
                    const RADIAN = Math.PI / 180;
                    const radius =
                      25 + innerRadius + (outerRadius - innerRadius);
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill={getDynamicColor(index, results.length)}
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                      >
                        {getVotePercentage(value)}%
                      </text>
                    );
                  }}
                  animationDuration={1500}
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
          </motion.div>
        );

      case "table":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <FaTable className="mr-2 text-primary-600" />
              Detailed Results
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Rank
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Contestant
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Votes
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <motion.tr
                      key={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={result.image}
                              alt={result.name}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {result.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="text-sm text-gray-900"
                        >
                          {result.vote_count}
                        </motion.div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getVotePercentage(result.vote_count)}%
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 px-4"
      >
        <div className="container mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">
            {pollDetails?.title || "Poll Results"}
          </h1>
          {pollDetails && (
            <p className="mt-2 text-white/80">{pollDetails.description}</p>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading results...</p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchResults}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-xl shadow-sm p-6"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Votes</p>
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-3xl font-bold mt-1"
                    >
                      {results.reduce(
                        (acc, result) => acc + result.vote_count,
                        0
                      )}
                    </motion.h3>
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <FaVoteYea className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white rounded-xl shadow-sm p-6"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Contestants</p>
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-3xl font-bold mt-1"
                    >
                      {results.length}
                    </motion.h3>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaTable className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white rounded-xl shadow-sm p-6"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Leading Contestant</p>
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-3xl font-bold mt-1"
                    >
                      {results[0]?.name || "No votes yet"}
                    </motion.h3>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <FaTrophy className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Visualization Controls */}
            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("bar")}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeTab === "bar"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FaChartBar className="mr-2" />
                Bar Chart
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("pie")}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeTab === "pie"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FaChartPie className="mr-2" />
                Pie Chart
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("table")}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeTab === "table"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FaTable className="mr-2" />
                Table View
              </motion.button>
            </div>

            {/* Chart/Table Display */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderChart()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
