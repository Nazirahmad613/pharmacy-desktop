// components/DebugAuth.jsx
import { useAuth } from "../contexts/AuthContext";

export const DebugAuth = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, background: '#333', color: 'white', padding: 10, fontSize: 12, zIndex: 9999 }}>
      <div>User: {user.name}</div>
      <div>Roles: {user.role_names?.join(', ') || 'none'}</div>
      <div>Permissions: {user.all_permissions?.length || 0}</div>
      <div>Is Admin: {user.isAdmin ? 'Yes' : 'No'}</div>
    </div>
  );
};