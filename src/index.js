import { registerServiceWorker } from "./app/service-worker.js";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./app/app.css";
import logo from "./assets/image/favicon.svg";
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = logo;
document.head.append(favicon);
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

registerServiceWorker();
