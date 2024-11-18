import axios from "axios";

let isRefreshing = false; // Flag to track ongoing refresh attempts
let refreshSubscribers = []; // Queue for requests while refreshing

const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/",
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  },
});

// Add Authorization header to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const access = localStorage.getItem("access");
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper to notify subscribers when a new token is obtained
const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

// Token refresh logic
axiosInstance.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && localStorage.getItem("refresh")) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refresh = localStorage.getItem("refresh");
          const response = await axiosInstance.post("token/refresh/", {
            refresh,
          });
          const newTokens = response.data;

          // Update tokens in localStorage
          localStorage.setItem("access", newTokens.access);
          localStorage.setItem("refresh", newTokens.refresh);

          isRefreshing = false;
          onRefreshed(newTokens.access);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          isRefreshing = false;
          localStorage.clear(); // Clear all tokens
          window.location.href = "/login"; // Redirect to login
        }
      }

      // Queue the requests while refreshing
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(axiosInstance(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
