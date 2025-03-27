import axios from 'axios';

const api = axios.create({
    // baseURL: 'http://localhost:4000/api/banners',
    // baseURL: "https://api-bannersgc.onrender.com/api/banners", 
    baseURL: 'https://api-gc.angelim.org/api/banners',
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;
