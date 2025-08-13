// main.tsx - Render app unconditionally; avoid adblocker gating
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(<App />);
