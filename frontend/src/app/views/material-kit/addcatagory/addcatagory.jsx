import { useState, useEffect } from "react";
import MainLayoutjur from "../../../../components/Mainlayoutjur";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../../contexts/AuthContext";

export default function CategoryForm() {
  // ✅ دریافت api, permissions, permissionsList و user از context
  const { api, permissions, permissionsList, user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = categories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get("/categories");
      const data = res.data.data ?? res.data ?? [];
      setCategories(data);
    } catch (error) {
      console.error("Load categories error:", error);
      toast.error("خطا در دریافت لیست کتگوری‌ها");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      toast.error("نام کتگوری را وارد کنید");
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, {
          category_name: categoryName
        });
        toast.success("کتگوری با موفقیت بروزرسانی شد");
        setEditingId(null);
      } else {
        await api.post("/categories", {
          category_name: categoryName
        });
        toast.success("کتگوری با موفقیت ثبت شد");
      }

      setCategoryName("");
      loadCategories();
      setCurrentPage(1);
    } catch (error) {
      console.error("Save category error:", error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (errors.category_name) {
          toast.error(errors.category_name[0]);
        } else {
          toast.error("خطا در ثبت کتگوری");
        }
      } else {
        toast.error("خطا در ثبت کتگوری");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.category_id);
    setCategoryName(category.category_name);
  };

  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این کتگوری اطمینان دارید؟")) return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success("کتگوری با موفقیت حذف شد");
      loadCategories();
      setCurrentPage(1);
    } catch (error) {
      console.error("Delete category error:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("خطا در حذف کتگوری");
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCategoryName("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("fa-IR");
    } catch {
      return "-";
    }
  };

  // ✅ شرط نمایش دکمه حذف:
  // - نقش ادمین باشد
  // - یا آرایه permissionsList شامل پرمیشن 'delete-category' باشد
  const canDelete = user?.role === 'admin' || (permissionsList && permissionsList.includes('delete-category'));

  return (
  <MainLayoutjur>
    <div className="layout-content">
      <div className="form-container">
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          {editingId ? "ویرایش کتگوری" : "ثبت کتگوری جدید"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <label>نام کتگوری</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="نام کتگوری را وارد کنید"
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
              <button 
                type="submit" 
                className="edit"
                disabled={loading}
                style={{ 
                  backgroundColor: editingId ? "#ffc107" : "#007bff",
                  opacity: loading ? 0.5 : 1,
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px"
                }}
              >
                {loading ? "در حال ثبت..." : (editingId ? "بروزرسانی" : "ثبت")}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  className="delete"
                  onClick={handleCancelEdit}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  انصراف
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {categories.length > 0 && (
        <div className="table-container" style={{ marginTop: "20px" }}>
          <h3>لیست کتگوری‌ها</h3>

          <table className="dark-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "12px", textAlign: "center" }}>شماره</th>
                <th style={{ padding: "12px", textAlign: "center" }}>نام کتگوری</th>
                <th style={{ padding: "12px", textAlign: "center" }}>تاریخ ایجاد</th>
                <th style={{ padding: "12px", textAlign: "center" }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.map((category, index) => (
                <tr key={category.category_id}>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {indexOfFirstItem + index + 1}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {category.category_name}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {formatDate(category.created_at)}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(category)}
                      style={{
                        backgroundColor: "#ffc107",
                        color: "black",
                        border: "none",
                        padding: "5px 15px",
                        borderRadius: "4px",
                        marginLeft: "5px",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      تصحیح
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(category.category_id)}
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          padding: "5px 15px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                      >
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  margin: "0 5px",
                  padding: "8px 15px",
                  backgroundColor: currentPage === 1 ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                قبلی
              </button>
              
              <span style={{ margin: "0 15px", fontSize: "14px" }}>
                صفحه {currentPage} از {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  margin: "0 5px",
                  padding: "8px 15px",
                  backgroundColor: currentPage === totalPages ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                }}
              >
                بعدی
              </button>
            </div>
          )}
        </div>
      )}

      {categories.length === 0 && !loading && (
        <div style={{ 
          textAlign: "center", 
          marginTop: "30px", 
          padding: "30px", 
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          color: "#666"
        }}>
          هیچ کتگوری یافت نشد
        </div>
      )}
    </div>
  </MainLayoutjur>
);
}