 import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const AuthGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/session/signin" replace />;
  }

  return children;
};

export default AuthGuard;
