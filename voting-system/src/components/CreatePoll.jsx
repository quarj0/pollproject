import { useState } from "react";
import axiosInstance from "../apis/api";
import PropTypes from "prop-types";

const PollCreationForm = ({ authTokens }) => {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        poll_type: "",
        expected_voters: "",
        voting_fee: "",
    });
    const [image, setImage] = useState(null);
    const [contestants, setContestants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => setImage(e.target.files[0]);

    const handleContestantChange = (index, field, value) => {
        setContestants((prev) => {
            const updated = [...prev];
            if (field === "image") {
                updated[index][field] = value.target.files[0];
            } else {
                updated[index][field] = value;
            }
            return updated;
        });
    };

    const handleAddContestant = () => {
        setContestants([
            ...contestants,
            { name: "", category: "", award: "", nominee_code: "", image: null },
        ]);
    };

    const handleRemoveContestant = (index) => {
        setContestants((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const submissionData = new FormData();
            Object.entries(formData).forEach(([key, value]) =>
                submissionData.append(key, value)
            );
            if (image) submissionData.append("image", image);

            contestants.forEach((contestant, index) => {
                Object.entries(contestant).forEach(([key, value]) => {
                    if (key === "image" && value instanceof File) {
                        submissionData.append(`contestants[${index}][${key}]`, value);
                    } else if (value) {
                        submissionData.append(`contestants[${index}][${key}]`, value);
                    }
                });
            });

            if (!authTokens) {
                throw new Error("Invalid authentication token");
            }

            const res = await axiosInstance.post("polls/create/", submissionData, {
                headers: {
                    Authorization: `Bearer ${authTokens}`,
                },
            });

            setResponse(res.data);
            if (res.data.download_voter_codes) {
                window.location.href = res.data.download_voter_codes;
            }
        } catch (err) {
            setError(
                err.response?.data?.detail || "Failed to create poll. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white shadow rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Create a Poll</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block font-medium">Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full border rounded p-2"
                    />
                </div>
                <div className="mb-4">
                    <label className="block font-medium">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        className="w-full border rounded p-2"
                    ></textarea>
                </div>
                <div className="mb-4">
                    <label className="block font-medium">Start Time</label>
                    <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        required
                        className="w-full border rounded p-2"
                    />
                </div>
                <div className="mb-4">
                    <label className="block font-medium">End Time</label>
                    <input
                        type="datetime-local"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        required
                        className="w-full border rounded p-2"
                    />
                </div>

                <div className="mb-4">
                    <label className="block font-medium">Poll Type</label>
                    <select
                        name="poll_type"
                        value={formData.poll_type}
                        onChange={handleInputChange}
                        required
                        className="w-full border rounded p-2"
                    >
                        <option value="">Select Poll Type</option>
                        <option value="voters-pay">Voters Pay</option>
                        <option value="creator-pay">Creator Pay</option>
                    </select>
                </div>

                {formData.poll_type === "creator-pay" && (
                    <div className="mb-4">
                        <label className="block font-medium">Expected Voters</label>
                        <input
                            type="number"
                            name="expected_voters"
                            value={formData.expected_voters}
                            onChange={handleInputChange}
                            required
                            className="w-full border rounded p-2"
                        />
                    </div>
                )}

                {formData.poll_type === "voters-pay" && (
                    <div className="mb-4">
                        <label className="block font-medium">Voting Fee</label>
                        <input
                            type="number"
                            name="voting_fee"
                            value={formData.voting_fee}
                            onChange={handleInputChange}
                            required
                            className="w-full border rounded p-2"
                        />
                    </div>
                )}

                <div className="mb-4">
                    <label className="block font-medium">Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full border rounded p-2"
                    />
                </div>

                <div className="mb-4">
                    <h3 className="font-medium">Contestants</h3>
                    {contestants.map((contestant, index) => (
                        <div key={index} className="p-4 border rounded mb-4">
                            <input
                                type="text"
                                placeholder="Category"
                                value={contestant.category}
                                onChange={(e) =>
                                    handleContestantChange(index, "category", e.target.value)
                                }
                                required
                                className="w-full mb-2 border rounded p-2"
                            />
                            <input
                                type="text"
                                placeholder="Name"
                                value={contestant.name}
                                onChange={(e) =>
                                    handleContestantChange(index, "name", e.target.value)
                                }
                                required
                                className="w-full mb-2 border rounded p-2"
                            />
                            <input
                                type="text"
                                placeholder="Award"
                                value={contestant.award}
                                onChange={(e) =>
                                    handleContestantChange(index, "award", e.target.value)
                                }
                                required
                                className="w-full mb-2 border rounded p-2"
                            />
                            <input
                                type="file"
                                onChange={(e) => handleContestantChange(index, "image", e)}
                                required
                                className="w-full mb-2 border rounded p-2"
                            />

                            <button
                                type="button"
                                onClick={() => handleRemoveContestant(index)}
                                className="text-red-500"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddContestant}
                        className="bg-blue-500 text-white p-2 rounded"
                    >
                        Add Contestant
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 text-white w-full py-2 rounded"
                >
                    {loading ? "Submitting..." : "Submit"}
                </button>
            </form>
            {error && <p className="text-red-500 mt-4">{error}</p>}
            {response && (
                <p className="text-green-500 mt-4">Poll created successfully!</p>
            )}
        </div>
    );
};

export default PollCreationForm;

PollCreationForm.propTypes = {
    authTokens: PropTypes.string.isRequired,
};
