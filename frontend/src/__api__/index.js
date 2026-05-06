import Mock from "./mock";
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  withCredentials: true, // برای استفاده از session
});

export default api;


import "./db/auth";
import "./db/ecommerce";
import "./db/notification";
import "i18next";


Mock.onAny().passThrough();
