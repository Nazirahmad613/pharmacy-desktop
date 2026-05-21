import { useContext } from "react";
import AuthContext from "../contexts/AuthContext";

const useAuth = () => {
  const context = useContext(AuthContext);
  
  // اگر context وجود نداشت، یک آبجکت پیش‌فرض برگردانید
  if (!context) {
    console.warn("useAuth called outside of AuthProvider");
    return {
      user: null,
      loading: false,
      login: () => Promise.reject("AuthProvider not found"),
      logout: () => {},
      updateUser: () => {},
      api: null
    };
  }
  
  return context;
};

export default useAuth;