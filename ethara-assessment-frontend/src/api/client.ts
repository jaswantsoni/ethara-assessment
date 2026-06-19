import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Normalize error messages from FastAPI
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') {
      error.message = detail;
    } else if (Array.isArray(detail)) {
      error.message = detail.map((e: { msg: string }) => e.msg).join(', ');
    }
    return Promise.reject(error);
  }
);

export default client;
