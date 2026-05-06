import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PurchasePrint from "../PurchasePrint";

export default function ParchaseForm() {
  const { api } = useAuth();
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "purchase-bill",
    pageStyle: `
      @page { size: A4; margin: 20mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `,
  });

  const [parchaseDate, setParchaseDate] = useState("");
  const [categories, setCategories] = useState([]);
  const [medications, setMedications] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [par_paid, setParPaid] = useState(0);
  const [due_par, setDuePar] = useState(0);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  
  const [formItem, setFormItem] = useState({
    category_id: "",
    med_id: "",
    type: "",
    quantity: "",
    unit_price: "",
    total_price: 0,
    exp_date: "",
  });

  const [purchasedItems, setPurchasedItems] = useState([]);
  const [purchaseData, setPurchaseData] = useState(null);
  const [allPurchases, setAllPurchases] = useState([]);

  // ===== محاسبه مجموع =====
  useEffect(() => {
    const sum = purchasedItems.reduce(
      (t, i) => t + Number(i.total_price || 0),
      0
    );
    setTotalPurchase(sum);
  }, [purchasedItems]);

  useEffect(() => {
    const due = Number(totalPurchase) - Number(par_paid || 0);
    setDuePar(due >= 0 ? due : 0);
  }, [totalPurchase, par_paid]);

  // ===== لود دیتا =====
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          api.get("/categories").then(res =>
            setCategories(res.data.data ?? res.data)
          ),
          api.get("/medications").then(res =>
            setMedications(res.data.data ?? res.data)
          ),
          loadSuppliersAndPurchases()
        ]);
      } catch (error) {
        console.error("خطا در لود اطلاعات:", error);
      }
    };
    loadData();
  }, [api]);

  // تابع جداگانه برای لود تأمین‌کنندگان و خریدها
  const loadSuppliersAndPurchases = async () => {
    try {
      const regRes = await api.get("/registrations");
      const data = regRes.data.data ?? regRes.data ?? [];
      const suppliersList = data.filter(r => r.reg_type === "supplier");
      setSuppliers(suppliersList);
      
      // بعد از ست شدن تأمین‌کنندگان، خریدها را لود کن
      await fetchPurchases(suppliersList);
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در دریافت اطلاعات");
    }
  };

  const fetchPurchases = async (suppliersList = suppliers) => {
    try {
      const res = await api.get("/parchases");
      const data = res.data.data ?? res.data ?? [];

      // استفاده از لیست تأمین‌کنندگان موجود
      const currentSuppliers = suppliersList.length ? suppliersList : suppliers;

      // محاسبه مجموع و نام حمایت کننده
      const purchasesWithTotals = data.map(p => {
        const total = p.items?.reduce((t, i) => t + Number(i.total_price || 0), 0) || 0;
        const supplier = currentSuppliers.find(s => Number(s.reg_id) === Number(p.supplier_id));
        return {
          ...p,
          totalPurchase: total,
          supplier_name: supplier?.full_name ?? supplier?.name ?? "-",
        };
      });

      setAllPurchases(purchasesWithTotals);
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در دریافت خریدها");
    }
  };

  const filteredMedications = medications.filter(
    m => Number(m.category_id) === Number(formItem.category_id)
  );

  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };

    if (field === "category_id") {
      updated.med_id = "";
      updated.type = "";
    }

    if (field === "med_id") {
      const med = medications.find(
        m => Number(m.med_id) === Number(value)
      );
      updated.type = med?.type ?? "";
      updated.unit_price = med?.unit_price ?? "";
    }

    const qty = Number(
      field === "quantity" ? value : updated.quantity || 0
    );
    const price = Number(
      field === "unit_price" ? value : updated.unit_price || 0
    );
    updated.total_price = qty * price;

    setFormItem(updated);
  };

  const handleKeyDown = e => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (
      !formItem.category_id ||
      !formItem.med_id ||
      !formItem.quantity ||
      !formItem.unit_price ||
      !formItem.exp_date
    ) {
      toast.error("❌ لطفاً تمام فیلدها را پر کنید");
      return;
    }

    const med = medications.find(
      m => Number(m.med_id) === Number(formItem.med_id)
    );
    const cat = categories.find(
      c => Number(c.category_id) === Number(formItem.category_id)
    );

    setPurchasedItems(prev => [
      ...prev,
      {
        ...formItem,
        med_name: med?.gen_name ?? "-",
        category_name: cat?.category_name ?? "-",
        id: Date.now(),
      },
    ]);

    setFormItem({
      category_id: "",
      med_id: "",
      type: "",
      quantity: "",
      unit_price: "",
      total_price: 0,
      exp_date: "",
    });
  };

  const handleRemoveItem = id => {
    setPurchasedItems(prev =>
      prev.filter(item => item.id !== id)
    );
  };

  // ✅ تابع جدید برای انصراف از ویرایش
  const handleCancelEdit = () => {
    setEditingPurchaseId(null);
    setPurchasedItems([]);
    setSelectedSupplier("");
    setParPaid(0);
    setParchaseDate("");
    setFormItem({
      category_id: "",
      med_id: "",
      type: "",
      quantity: "",
      unit_price: "",
      total_price: 0,
      exp_date: "",
    });
    toast.info("✏️ ویرایش لغو شد");
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplier) {
      toast.error("❌ لطفاً حمایت‌کننده را انتخاب کنید");
      return;
    }

    if (purchasedItems.length === 0) {
      toast.error("❌ حداقل یک آیتم اضافه کنید");
      return;
    }

    const payload = {
      parchase_date: parchaseDate || new Date().toISOString().split("T")[0],
      par_paid,
      supplier_id: selectedSupplier,
      items: purchasedItems.map(item => ({
        med_id: item.med_id,
        category_id: item.category_id,
        type: item.type,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        exp_date: item.exp_date,
      })),
    };

    try {
      let res;

      if (editingPurchaseId) {
        res = await api.put(`/parchases/${editingPurchaseId}`, payload);
        toast.success("✅ خرید با موفقیت بروزرسانی شد");
      } else {
        res = await api.post("/parchases", payload);
        toast.success("✅ خرید با موفقیت ثبت شد");
      }

      // ⭐ مهم — ذخیره دیتا برای چاپ
      setPurchaseData(res.data);

      setPurchasedItems([]);
      setParPaid(0);
      setDuePar(0);
      setTotalPurchase(0);
      setParchaseDate("");
      setSelectedSupplier("");
      setEditingPurchaseId(null);

      // بعد از ثبت موفق، خریدها را دوباره لود کن
      await fetchPurchases();

    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در ثبت/بروزرسانی خرید");
    }
  };

  const handlePrintExisting = purchase => {
    setPurchaseData(purchase);

    setTimeout(() => {
      handlePrint();
    }, 300);
  };

  const handleDeletePurchase = async id => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید حذف شود؟")) return;
    try {
      await api.delete(`/parchases/${id}`);
      toast.success("✅ خرید حذف شد");
      await fetchPurchases();
    } catch (err) {
      console.error(err);
      toast.error("❌ خطا در حذف خرید");
    }
  };

 const handleEditPurchase = purchase => {
  // Enrich items with category_name and med_name
  const enrichedItems = (purchase.items ?? []).map(item => {
    const med = medications.find(m => Number(m.med_id) === Number(item.med_id));
    const cat = categories.find(c => Number(c.category_id) === Number(item.category_id));
    return {
      ...item,
      id: Date.now() + Math.random(), // generate unique id
      med_name: med?.gen_name ?? "-",
      category_name: cat?.category_name ?? "-",
    };
  });
  setPurchasedItems(enrichedItems);
  setSelectedSupplier(purchase.supplier_id);
  setParPaid(purchase.par_paid);
  setParchaseDate(purchase.parchase_date);
  setTotalPurchase(enrichedItems.reduce((t,i)=> t + Number(i.total_price),0));
  
  setEditingPurchaseId(purchase.parchase_id);

  // Optionally set formItem to the first item's category and med for convenience
  if (enrichedItems.length > 0) {
    const first = enrichedItems[0];
    setFormItem({
      category_id: first.category_id,
      med_id: first.med_id,
      type: first.type,
      quantity: "",
      unit_price: "",
      total_price: 0,
      exp_date: "",
    });
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

  return (
  <MainLayoutjur>
    {/* اطلاعات خرید */}
    <div className="form-container">
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        {editingPurchaseId ? "ویرایش خرید دوا" : "ثبت خرید دوا"}
      </h2>

      <div className="form-grid">
        <div>
          <label>تاریخ خرید</label>
          <input
            type="date"
            value={parchaseDate}
            onChange={e => setParchaseDate(e.target.value)}
          />
        </div>

        <div>
          <label>مجموع خرید</label>
          <input type="number" value={totalPurchase} readOnly />
        </div>

        <div>
          <label>مبلغ پرداخت شده</label>
          <input type="number" value={par_paid} onChange={e => setParPaid(Number(e.target.value))} />
        </div>

        <div>
          <label>مبلغ باقی‌مانده</label>
          <input type="number" value={due_par} readOnly />
        </div>

        <div>
          <label>حمایت‌کننده</label>
          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
            <option value="">-- انتخاب --</option>
            {suppliers.map(s => (
              <option key={s.reg_id} value={s.reg_id}>
                {s.full_name ?? s.name}
              </option>
            ))}
          </select>
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
            <option value="">-- انتخاب --</option>
            {categories.map(c => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>دوا</label>
          <select value={formItem.med_id} onChange={e => handleChange("med_id", e.target.value)}>
            <option value="">-- انتخاب --</option>
            {filteredMedications.map(m => (
              <option key={m.med_id} value={m.med_id}>{m.gen_name}</option>
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
          <input type="number" value={formItem.unit_price} onChange={e => handleChange("unit_price", e.target.value)} />
        </div>

        <div>
          <label>قیمت مجموعی</label>
          <input type="number" value={formItem.total_price} readOnly />
        </div>

        <div>
          <label>تاریخ انقضا</label>
          <input type="date" value={formItem.exp_date} onChange={e => handleChange("exp_date", e.target.value)} />
        </div>
      </div>
    </div>

    {/* جدول آیتم‌ها */}
    {purchasedItems.length > 0 && (
      <div className="table-container">
        <table className="dark-table">
          <thead>
            <tr>
              <th>شماره</th>
              <th>کتگوری</th>
              <th>دوا</th>
              <th>نوع دوا</th>
              <th>تعداد</th>
              <th>قیمت واحد</th>
              <th>قیمت مجموعی</th>
              <th>تاریخ انقضا</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {purchasedItems.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td>{item.category_name}</td>
                <td>{item.med_name}</td>
                <td>{item.type}</td>
                <td>{item.quantity}</td>
                <td>{item.unit_price?.toLocaleString()}</td>
                <td>{item.total_price?.toLocaleString()}</td>
                <td>{item.exp_date}</td>
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
        onClick={handleSavePurchase}
        style={{ backgroundColor: editingPurchaseId ? "#ffc107" : "#2563eb" }}
      >
        {editingPurchaseId ? "بروزرسانی خرید" : "ثبت خرید"}
      </button>

      <button
        onClick={() => {
          if (!purchaseData) {
            toast.error("ابتدا خرید را ثبت کنید");
            return;
          }
          handlePrint();
        }}
        style={{
          backgroundColor: "#4CAF50",
          color: "white",
          padding: "10px 20px",
          borderRadius: "5px",
          border: "none",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "bold"
        }}
      >
        چاپ خرید
      </button>

      {editingPurchaseId && (
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

    {/* نمایش خریدهای ثبت شده */}
    {allPurchases.length > 0 && (
      <div className="form-container" style={{ marginTop: "30px" }}>
        <h3>خریدهای ثبت شده</h3>
        <table className="dark-table">
          <thead>
            <tr>
              <th>شماره</th>
              <th>تاریخ</th>
              <th>حمایت‌کننده</th>
              <th>مجموع</th>
              <th>پرداخت شده</th>
              <th>باقی مانده</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {allPurchases.map((p, idx) => (
              <tr key={p.parchase_id}>
                <td>{idx + 1}</td>
                <td>{p.parchase_date}</td>
                <td>{p.supplier_name ?? "-"}</td>
                <td>{p.totalPurchase?.toLocaleString()}</td>
                <td>{p.par_paid?.toLocaleString()}</td>
                <td>{(p.totalPurchase - p.par_paid)?.toLocaleString()}</td>
                <td>
                  <button
                    style={{ 
                      backgroundColor: "#dc2626", 
                      color: "#fff",
                      padding: "5px 12px",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginLeft: "5px"
                    }}
                    onClick={() => handleDeletePurchase(p.parchase_id)}
                  >
                    حذف
                  </button>
                  <button
                    style={{ 
                      backgroundColor: "#dcc215", 
                      color: "#000",
                      padding: "5px 12px",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginLeft: "5px"
                    }}
                    onClick={() => handleEditPurchase(p)}
                  >
                    تصحیح
                  </button>
                  <button
                    style={{ 
                      backgroundColor: "#0da62f", 
                      color: "#fff",
                      padding: "5px 12px",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                    onClick={() => handlePrintExisting(p)}
                  >
                    چاپ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* کامپوننت مخفی پرینت */}
    {purchaseData && (
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <PurchasePrint ref={printRef} purchaseData={purchaseData} />
      </div>
    )}
  </MainLayoutjur>
);
}