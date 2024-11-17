import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("access");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const refreshAuthToken = async () => {
  const refreshToken = localStorage.getItem("refresh");
  try {
    const response = await axios.post("token/refresh/", {
      refresh: refreshToken,
    });
    localStorage.setItem("access", response.data.access);
    return response.data.access;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const newAccessToken = await refreshAuthToken();
      if (newAccessToken) {
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      }
    }
    if (error.response && error.response.status === 401) {
      // Handle logout or token expiry error
      alert("Your session has expired. Please log in again.");
      // Optionally, clear local storage and redirect to login
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;