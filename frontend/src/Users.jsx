import { useEffect, useState } from "react";
import api from "../api";
import UserForm from "./UserForm";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // فیلترها
  const [filters, setFilters] = useState({
    search: "",
    department_id: "",
    role: "",
  });

  // ================= دریافت داده‌ها =================
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.role) params.role = filters.role;

      const { data } = await api.get("/users", { params });
      setUsers(data);
    } catch (error) {
      console.error("خطا در دریافت کاربران:", error);
      alert("خطا در دریافت لیست کاربران");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get("/roles");
      setRoles(data.data || data);
    } catch (error) {
      console.error("خطا در دریافت نقش‌ها:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data.data || data);
    } catch (error) {
      console.error("خطا در دریافت بخش‌ها:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, []);

  // با تغییر فیلتر، دوباره fetch کن
  useEffect(() => {
    const timer = setTimeout(fetchUsers, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  // ================= عملیات =================
  const handleAddNew = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`آیا از حذف "${user.name}" مطمئن هستید؟`)) return;

    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
      alert("کاربر با موفقیت حذف شد");
    } catch (error) {
      console.error("خطا در حذف:", error);
      alert(error.response?.data?.error || "خطا در حذف کاربر");
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  // ================= رندر =================
  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* هدر */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">مدیریت کاربران</h2>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          + کاربر جدید
        </button>
      </div>

      {/* فیلترها */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="جستجو نام یا ایمیل..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={filters.department_id}
          onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">همه بخش‌ها</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name} {dept.code ? `(${dept.code})` : ""}
            </option>
          ))}
        </select>

        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">همه نقش‌ها</option>
          {roles.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* جدول */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">در حال بارگذاری...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">عکس</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">نام</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">ایمیل</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">نقش</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">بخش</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    کاربری یافت نشد
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {user.role_name || "بدون نقش"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.department ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {user.department.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:underline ml-3"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:underline"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال فرم */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <UserForm
              user={editingUser}
              roles={roles}
              departments={departments}
              onSaved={handleSaved}
              onCancel={() => {
                setShowForm(false);
                setEditingUser(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;