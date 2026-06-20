import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import AppRoutes from "./routes";

// Router basename mirrors the Vite `base` so the app works mounted under a
// sub-path (e.g. /sagi). BASE_URL is "/" or "/sagi/"; strip the trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export default function App() {
  return (
    <BrowserRouter
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
