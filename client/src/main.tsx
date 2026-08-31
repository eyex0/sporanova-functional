import { createRoot } from "react-dom/client";
import { TRPCProvider } from "./lib/trpc-provider";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <TRPCProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </TRPCProvider>
);
