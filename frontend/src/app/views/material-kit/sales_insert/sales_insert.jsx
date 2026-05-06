import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import SalePrint from "../SalePrint";

export default function SaleForm() {
  const { api } = useAuth();
  const printRef = useRef(null);
  const [salesId, setSalesId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "sale-bill",
    pageStyle: `
      @page { size: A4; margin: 20mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `,
  });

  const [saleDate, setSaleDate] = useState("");
  const [categories, setCategories] = useState([]);
  const [medications, setMedications] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesList, setSalesList] = useState([]);

  const [discount, setDiscount] = useState(0);
  const [totalSale, setTotalSale] = useState(0);
  const [netSales, setNetSales] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("پرداخت نشده");
  const [printSale, setPrintSale] = useState(null);

  const [formItem, setFormItem] = useState({
    cust_id: "",
    category_id: "",
    med_id: "",
    supplier_id: "",
    type: "",
    quantity: "",
    unit_sales: "",
    total_sales: 0,
  });

  const [saleItems, setSaleItems] = useState([]);
  const [customerNID, setCustomerNID] = useState(""); // شماره تذکره مشتری

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentSales = salesList.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(salesList.length / itemsPerPage);

  // ==================== بارگذاری اولیه ====================
  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const res = await api.get("/sales");
      setSalesList(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("خطا در دریافت لیست فروش");
    }
  };

  useEffect(() => {
    const sum = saleItems.reduce((t, i) => t + Number(i.total_sales || 0), 0);
    setTotalSale(sum);
  }, [saleItems]);

  useEffect(() => {
    const net = Number(totalSale) - Number(discount || 0);
    setNetSales(net >= 0 ? net : 0);
  }, [totalSale, discount]);

  useEffect(() => {
    const rem = Number(netSales) - Number(totalPaid || 0);
    setRemaining(rem >= 0 ? rem : 0);
    if (Number(totalPaid) === 0) setPaymentStatus("پرداخت نشده");
    else if (Number(totalPaid) < Number(netSales)) setPaymentStatus("پرداخت جزئی");
    else setPaymentStatus("پرداخت کامل شده");
  }, [netSales, totalPaid]);

  // دریافت لیست کتگوری‌ها، داروها، ثبت‌نام‌ها (تامین‌کنندگان و مشتریان)
  useEffect(() => {
    api.get("/categories").then(res => setCategories(res.data.data ?? res.data));
    api.get("/medications").then(res => setMedications(res.data.data ?? res.data));
    api.get("/registrations").then(res => {
      const data = res.data.data ?? res.data ?? [];
      setSuppliers(data.filter(r => r.reg_type === "supplier"));
      setCustomers(data.filter(r => r.reg_type === "customer"));
    });
  }, [api]);

  // هرگاه مشتری تغییر کند، شماره تذکره آن را از لیست مشتریان پیدا کرده و در state ذخیره می‌کنیم
  useEffect(() => {
    if (!formItem.cust_id) {
      setCustomerNID("");
      return;
    }
    const cust = customers.find(c => Number(c.reg_id) === Number(formItem.cust_id));
    if (cust && cust.tazkira_number) {
      setCustomerNID(cust.tazkira_number);
    } else {
      setCustomerNID("");
      if (cust) toast.warning("این مشتری شماره تذکره ثبت‌شده ندارد");
    }
  }, [formItem.cust_id, customers]);

  const filteredMedications = medications.filter(
    m => Number(m.category_id) === Number(formItem.category_id)
  );

  const selectedMedication = medications.find(
    m => Number(m.med_id) === Number(formItem.med_id)
  );

  const filteredSuppliers = selectedMedication
    ? suppliers.filter(s => {
        const supList = selectedMedication.supplier_id;
        if (Array.isArray(supList)) return supList.includes(s.reg_id);
        return Number(supList) === Number(s.reg_id);
      })
    : [];

  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };
    if (field === "category_id") {
      updated.med_id = "";
      updated.supplier_id = "";
      updated.type = "";
    }
    if (field === "med_id") {
      const med = medications.find(m => Number(m.med_id) === Number(value));
      updated.type = med?.type ?? "";
      updated.unit_sales = med?.unit_sales ?? "";
      updated.supplier_id = "";
    }
    const qty = Number(field === "quantity" ? value : updated.quantity || 0);
    const price = Number(field === "unit_sales" ? value : updated.unit_sales || 0);
    updated.total_sales = qty * price;
    setFormItem(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (
      !formItem.cust_id ||
      !formItem.category_id ||
      !formItem.med_id ||
      !formItem.supplier_id ||
      !formItem.quantity ||
      !formItem.unit_sales
    ) {
      toast.error("❌ لطفاً تمام فیلدها را درست پر کنید");
      return;
    }
    const med = medications.find(m => Number(m.med_id) === Number(formItem.med_id));
    const cat = categories.find(c => Number(c.category_id) === Number(formItem.category_id));
    const sup = suppliers.find(s => Number(s.reg_id) === Number(formItem.supplier_id));
    setSaleItems([
      ...saleItems,
      {
        ...formItem,
        id: Date.now(),
        gen_name: med?.gen_name ?? "-",
        category_name: cat?.category_name ?? "-",
        supplier_name: sup?.full_name ?? sup?.name ?? "-",
      }
    ]);
    setFormItem({
      cust_id: formItem.cust_id, // حفظ مشتری انتخاب شده
      category_id: "",
      med_id: "",
      supplier_id: "",
      type: "",
      quantity: "",
      unit_sales: "",
      total_sales: 0,
    });
  };

  const handleRemoveItem = (id) => {
    setSaleItems(saleItems.filter(item => item.id !== id));
  };

  // ==================== ریست کامل فرم ====================
  const resetForm = () => {
    setEditingId(null);
    setSaleItems([]);
    setFormItem({
      cust_id: "",
      category_id: "",
      med_id: "",
      supplier_id: "",
      type: "",
      quantity: "",
      unit_sales: "",
      total_sales: 0,
    });
    setSaleDate("");
    setDiscount(0);
    setTotalPaid(0);
    setCustomerNID("");
    setTotalSale(0);
    setNetSales(0);
    setRemaining(0);
    setPaymentStatus("پرداخت نشده");
  };

  const handleCancelEdit = () => {
    resetForm();
    toast.info("✏️ ویرایش لغو شد");
  };

  // ==================== ثبت فروش جدید ====================
  const handleSaveSale = async () => {
    if (saleItems.length === 0) {
      toast.error("❌ حداقل یک آیتم اضافه کنید");
      return;
    }
    if (!formItem.cust_id) {
      toast.error("❌ مشتری را انتخاب کنید");
      return;
    }
    // شماره تذکره الزامی نیست، اما اگر وجود داشته باشد ارسال می‌شود
    const payload = {
      sales_date: saleDate || new Date().toISOString().split("T")[0],
      cust_id: formItem.cust_id,
      tazkira_number: customerNID, // شماره تذکره مشتری
      discount,
      total_paid: totalPaid,
      items: saleItems.map(item => ({
        category_id: item.category_id,
        med_id: item.med_id,
        supplier_id: item.supplier_id,
        type: item.type,
        quantity: Number(item.quantity),
        unit_sales: Number(item.unit_sales),
        total_sales: Number(item.total_sales),
      })),
    };
    try {
      const res = await api.post("/sales", payload);
      setSalesId(res.data.sale_id);
      toast.success("✅ فروش با موفقیت ثبت شد");
      resetForm();
      loadSales();
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در ثبت فروش");
    }
  };

  // ==================== ویرایش فروش ====================
  const handleEditSale = (sale) => {
    resetForm(); // پاک کردن حالت قبلی
    setEditingId(sale.id);
    setSaleDate(sale.sales_date);
    setDiscount(sale.discount);
    setTotalPaid(sale.total_paid);

    const items = (sale.items ?? []).map((i) => ({
      id: i.sales_it_id,
      med_id: i.med_id,
      category_id: i.category_id,
      supplier_id: i.supplier_id,
      type: i.type,
      quantity: i.quantity,
      unit_sales: i.unit_sales,
      total_sales: i.total_sales,
      gen_name: i.med_name,
      category_name: i.category_name,
      supplier_name: i.supplier_name,
    }));

    setSaleItems(items);
    if (items.length > 0) {
      const firstItem = items[0];
      setFormItem({
        cust_id: sale.cust_id,
        category_id: firstItem.category_id,
        med_id: firstItem.med_id,
        supplier_id: firstItem.supplier_id,
        type: firstItem.type,
        quantity: firstItem.quantity,
        unit_sales: firstItem.unit_sales,
        total_sales: firstItem.total_sales,
      });
    } else {
      setFormItem({ ...formItem, cust_id: sale.cust_id });
    }

    // تنظیم شماره تذکره مشتری: ابتدا از خود آبجکت sale (اگر موجود باشد) استفاده کنیم
    if (sale.tazkira_number) {
      setCustomerNID(sale.tazkira_number);
    } else {
      // در غیر این صورت از لیست مشتریان پیدا می‌کنیم
      const cust = customers.find(c => Number(c.reg_id) === Number(sale.cust_id));
      setCustomerNID(cust?.tazkira_number ?? "");
    }
  };

  // ==================== بروزرسانی فروش ====================
  const handleUpdateSale = async () => {
    if (!editingId) return;
    if (saleItems.length === 0) {
      toast.error("❌ حداقل یک آیتم اضافه کنید");
      return;
    }
    const payload = {
      sales_date: saleDate || new Date().toISOString().split("T")[0],
      cust_id: formItem.cust_id,
      tazkira_number: customerNID,
      discount,
      total_paid: totalPaid,
      items: saleItems.map(item => ({
        category_id: item.category_id,
        med_id: item.med_id,
        supplier_id: item.supplier_id,
        type: item.type,
        quantity: Number(item.quantity),
        unit_sales: Number(item.unit_sales),
        total_sales: Number(item.total_sales),
      })),
    };
    try {
      await api.put(`/sales/${editingId}`, payload);
      toast.success("✅ فروش با موفقیت بروزرسانی شد");
      resetForm();
      loadSales();
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در بروزرسانی فروش");
    }
  };

  const handleDeleteSale = async (id) => {
    if (!confirm("آیا فروش حذف شود؟")) return;
    try {
      await api.delete(`/sales/${id}`);
      toast.success("فروش حذف شد");
      loadSales();
      if (editingId === id) resetForm();
    } catch {
      toast.error("خطا در حذف فروش");
    }
  };

  const handlePrintSale = (sale) => {
    const salePrintData = {
      sale_number: sale.id,
      date: sale.sales_date,
      customer: sale.customer_name,
      tazkira_number: sale.tazkira_number,
      items: sale.items,
      totalSale: sale.total_sales,
      discount: sale.discount,
      netSales: sale.net_sales,
      totalPaid: sale.total_paid,
      remaining: sale.remaining,
      paymentStatus: sale.payment_status,
    };
    setPrintSale(salePrintData);
    setTimeout(() => handlePrint(), 200);
  };

  const selectedCustomer = customers.find(
    c => Number(c.reg_id) === Number(formItem.cust_id)
  );
  const saleData = {
    sale_number: salesId ?? "-",
    date: saleDate || new Date().toLocaleDateString(),
    customer: selectedCustomer?.full_name ?? "-",
    tazkira_number: customerNID,
    items: saleItems,
    totalSale,
    discount,
    netSales,
    totalPaid,
    remaining,
    paymentStatus,
  };

  // ==================== رندر ====================
  return (
    <MainLayoutjur>
      {/* اطلاعات فروش */}
      <div className="form-container">
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          {editingId ? "ویرایش فروش" : "ثبت فروشات"}
        </h2>
        <div className="form-grid">
          <div>
            <label>تاریخ فروش</label>
            <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
          </div>
          <div>
            <label>مشتری</label>
            <select value={formItem.cust_id} onChange={e => handleChange("cust_id", e.target.value)}>
              <option value="">-- انتخاب مشتری --</option>
              {customers.map((c, index) => (
                <option key={c.id ?? c.reg_id ?? `cust-${index}`} value={c.id ?? c.reg_id}>
                  {c.full_name ?? c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>شماره تذکره مشتری</label>
            <input type="text" value={customerNID} readOnly placeholder="پس از انتخاب مشتری نمایش داده می‌شود" />
          </div>
          <div>
            <label>مجموع فروش</label>
            <input type="number" value={totalSale} readOnly />
          </div>
          <div>
            <label>تخفیف</label>
            <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
          </div>
          <div>
            <label>فروش خالص</label>
            <input type="number" value={netSales} readOnly />
          </div>
          <div>
            <label>پرداخت اولیه</label>
            <input type="number" value={totalPaid} onChange={e => setTotalPaid(Number(e.target.value))} />
          </div>
          <div>
            <label>باقی‌مانده</label>
            <input type="number" value={remaining} readOnly />
          </div>
          <div>
            <label>وضعیت پرداخت</label>
            <input type="text" value={paymentStatus} readOnly />
          </div>
        </div>
      </div>

      {/* فرم آیتم‌ها */}
      <div className="form-container">
        <h3>افزودن آیتم</h3>
        <div className="form-grid" onKeyDown={handleKeyDown}>
          <div>
            <label>کتگوری</label>
            <select value={formItem.category_id} onChange={e => handleChange("category_id", e.target.value)}>
              <option value="">-- انتخاب کتگوری --</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>دوا</label>
            <select value={formItem.med_id} onChange={e => handleChange("med_id", e.target.value)}>
              <option value="">-- انتخاب دوا --</option>
              {filteredMedications.map(m => (
                <option key={m.med_id} value={m.med_id}>{m.gen_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>حمایت‌کننده</label>
            <select value={formItem.supplier_id} onChange={e => handleChange("supplier_id", e.target.value)}>
              <option value="">-- انتخاب حمایت‌کننده --</option>
              {filteredSuppliers.map((s, index) => (
                <option key={s.reg_id ?? `sup-${index}`} value={s.reg_id}>
                  {s.full_name ?? s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>نوع دوا</label>
            <input type="text" value={formItem.type} readOnly />
          </div>
          <div>
            <label>تعداد</label>
            <input type="number" value={formItem.quantity} onChange={e => handleChange("quantity", e.target.value)} />
          </div>
          <div>
            <label>قیمت واحد</label>
            <input type="number" value={formItem.unit_sales} onChange={e => handleChange("unit_sales", e.target.value)} />
          </div>
          <div>
            <label>قیمت مجموعی</label>
            <input type="number" value={formItem.total_sales} readOnly />
          </div>
        </div>
      </div>

      {/* جدول آیتم‌ها */}
      {saleItems.length > 0 && (
        <div className="table-container">
          <table className="dark-table">
            <thead>
              <tr>
                <th>شماره</th>
                <th>کتگوری</th>
                <th>نام دوا</th>
                <th>حمایت‌کننده</th>
                <th>نوع دوا</th>
                <th>تعداد</th>
                <th>قیمت واحد</th>
                <th>قیمت مجموعی</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {saleItems.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.category_name}</td>
                  <td>{item.gen_name}</td>
                  <td>{item.supplier_name}</td>
                  <td>{item.type}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit_sales?.toLocaleString()}</td>
                  <td>{item.total_sales?.toLocaleString()}</td>
                  <td>
                    <button className="delete" onClick={() => handleRemoveItem(item.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "10px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button 
          className="edit" 
          onClick={editingId ? handleUpdateSale : handleSaveSale}
          style={{ backgroundColor: editingId ? "#ffc107" : "#2563eb" }}
        >
          {editingId ? "بروزرسانی فروش" : "ثبت فروش"}
        </button>
        <button type="button" className="edit" onClick={handlePrint} style={{ backgroundColor: "#4CAF50" }}>
          چاپ بل فروش
        </button>
        {editingId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            انصراف
          </button>
        )}
      </div>

      {/* لیست فروشات */}
      {salesList.length > 0 && (
        <div className="table-container" style={{ marginTop: "20px" }}>
          <h3>فروشات ثبت شده</h3>
          <table className="dark-table">
            <thead>
              <tr>
                <th>#</th>
                <th>تاریخ</th>
                <th>مشتری</th>
                <th>مجموع</th>
                <th>تخفیف</th>
                <th>خالص</th>
                <th>پرداخت</th>
                <th>باقی</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {currentSales.map((s, i) => (
                <tr key={s.id}>
                  <td>{indexOfFirst + i + 1}</td>
                  <td>{s.sales_date}</td>
                  <td>{s.customer_name}</td>
                  <td>{s.total_sales}</td>
                  <td>{s.discount}</td>
                  <td>{s.net_sales}</td>
                  <td>{s.total_paid}</td>
                  <td>{s.remaining}</td>
                  <td>{s.payment_status}</td>
                  <td>
                    <button 
                      style={{ backgroundColor: "#dcc215", color: "#000", padding: "5px 12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold", marginLeft: "5px" }}
                      onClick={() => handleEditSale(s)}
                    >
                      تصحیح
                    </button>
                    <button 
                      style={{ backgroundColor: "#dc2626", color: "#fff", padding: "5px 12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold", marginLeft: "5px" }}
                      onClick={() => handleDeleteSale(s.id)}
                    >
                      حذف
                    </button>
                    <button  
                      style={{ backgroundColor: "#0da62f", color: "#fff", padding: "5px 12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                      onClick={() => handlePrintSale(s)}
                    >
                      چاپ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 15, textAlign: "center" }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>قبلی</button>
            <span style={{ margin: "0 10px" }}>صفحه {currentPage} از {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>بعدی</button>
          </div>
        </div>
      )}

      {/* کامپوننت مخفی پرینت */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <SalePrint ref={printRef} saleData={printSale ?? saleData} />
      </div>
    </MainLayoutjur>
  );
}