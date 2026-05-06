import { useEffect, useState } from "react";
import api from "../api"; // مسیر فایل api.js

const Users = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/users")
      .then((response) => {
        setUsers(response.data);
      })
      .catch((error) => {
        console.error("خطا در دریافت داده‌ها:", error);
      });
  }, []);

  return (
    <div>
      <h2>لیست کاربران</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
};

export default Users;
