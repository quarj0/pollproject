import axios from "axios";

let isRefreshing = false;
let refreshSubscribers = [];

const api_url = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  baseURL: api_url,
  timeout: 5000,
  headers: {
    "Content-Type": "multipart/form-data",
    accept: "application/json",
  },
});

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

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && localStorage.getItem("refresh")) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refresh = localStorage.getItem("refresh");
          const response = await axiosInstance.post("token/refresh/", {
            refresh,
          });
          const newTokens = response.data;

          localStorage.setItem("access", newTokens.access);
          localStorage.setItem("refresh", newTokens.refresh);

          isRefreshing = false;
          onRefreshed(newTokens.access);

          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          isRefreshing = false;
          localStorage.clear();
          window.location.href = "/login";
        }
      }

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
