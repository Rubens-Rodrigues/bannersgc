import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:4000/api/banners',
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;