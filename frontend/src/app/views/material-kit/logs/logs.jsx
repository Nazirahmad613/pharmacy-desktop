import { useEffect, useState } from "react";
import ReportLayout from "../../../../components/ReportLayout";
import { useAuth } from "app/contexts/AuthContext";

export default function LogsPage() {
  const { api } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [filters, setFilters] = useState({
    action: "",
    user_id: "",
  });

  const [usersMap, setUsersMap] = useState({});

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      const usersArray = res.data.data || res.data;
      const map = {};
      usersArray.forEach((user) => {
        map[user.id] = user.name;
      });
      setUsersMap(map);
    } catch (error) {
      console.error("خطا در دریافت کاربران", error);
    }
  };

  // تابع کمکی برای واکشی لاگ‌ها با فیلترهای مشخص
  const fetchLogsWithFilters = async (pageNumber, filterValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pageNumber);
      if (filterValues.action) params.append("action", filterValues.action);
      if (filterValues.user_id) params.append("user_id", filterValues.user_id);

      const res = await api.get(`/logs?${params.toString()}`);
      setLogs(res.data.data);
      setPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // واکشی با فیلترهای جاری (از state)
  const fetchLogs = (pageNumber = 1) => {
    fetchLogsWithFilters(pageNumber, filters);
  };

  useEffect(() => {
    fetchLogs(1);
    fetchUsers();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const applyFilters = () => {
    fetchLogs(1); // صفحه اول با فیلترهای فعلی
  };

  const resetFilters = () => {
    // ریست state فیلترها
    setFilters({
      action: "",
      user_id: "",
    });
    // واکشی لاگ‌ها با فیلترهای خالی (بدون تکیه بر state که هنوز بروز نشده)
    fetchLogsWithFilters(1, { action: "", user_id: "" });
  };

  return (
    <ReportLayout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">📜 لاگ‌ها</h2>

        {/* فیلترها */}
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">عملیات</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="border p-2 rounded"
            >
              <option value="">همه عملیات</option>
              <option value="create">ایجاد</option>
              <option value="update">ویرایش</option>
              <option value="delete">حذف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">کاربر</label>
            <select
              name="user_id"
              value={filters.user_id}
              onChange={handleFilterChange}
              className="border p-2 rounded min-w-[150px]"
            >
              <option value="">همه کاربران</option>
              {Object.entries(usersMap).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={applyFilters}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            فیلتر
          </button>

          <button
            onClick={resetFilters}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            پاک کردن فیلترها
          </button>
        </div>

        {/* جدول */}
        <div className="overflow-x-auto bg-white shadow rounded">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border">شناسه</th>
                <th className="p-3 border">کاربر</th>
                <th className="p-3 border">عملیات</th>
                <th className="p-3 border">مدل</th>
                <th className="p-3 border">توضیحات</th>
                <th className="p-3 border">آی پی</th>
                <th className="p-3 border">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-4">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-4">
                    لاگی یافت نشد
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-center border-t">
                    <td className="p-2 border">{log.id}</td>
                    <td className="p-2 border">
                      {usersMap[log.user_id] || log.user_id}
                    </td>
                    <td className="p-2 border">{log.action}</td>
                    <td className="p-2 border">{log.model}</td>
                    <td className="p-2 border">{log.description}</td>
                    <td className="p-2 border">{log.ip}</td>
                    <td className="p-2 border">
                      {new Date(log.created_at).toLocaleString("fa-IR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* صفحه‌بندی */}
        <div className="flex justify-center mt-4 gap-2">
          <button
            disabled={page === 1}
            onClick={() => fetchLogs(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            قبلی
          </button>
          <span className="px-3 py-1">
            صفحه {page} از {lastPage}
          </span>
          <button
            disabled={page === lastPage}
            onClick={() => fetchLogs(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            بعدی
          </button>
        </div>
      </div>
    </ReportLayout>
  );
}