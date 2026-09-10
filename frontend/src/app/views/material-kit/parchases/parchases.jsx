
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

  // ============================================================
  // چاپ خرید
  // ============================================================

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "purchase-bill",
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    `,
  });

  // ============================================================
  // State ها
  // ============================================================

  const [parchaseDate, setParchaseDate] = useState("");

  const [categories, setCategories] = useState([]);
  const [medications, setMedications] = useState([]);

  // تأمین‌کنندگان اکنون از جدول accounts می‌آیند
  const [suppliers, setSuppliers] = useState([]);

  const [totalPurchase, setTotalPurchase] = useState(0);
  const [par_paid, setParPaid] = useState(0);
  const [due_par, setDuePar] = useState(0);

  // این مقدار اکنون accounts.id است
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

  // ============================================================
  // محاسبه مجموع خرید
  // ============================================================

  useEffect(() => {
    const sum = purchasedItems.reduce(
      (total, item) =>
        total + Number(item.total_price || 0),
      0
    );

    setTotalPurchase(sum);
  }, [purchasedItems]);

  // ============================================================
  // محاسبه باقی‌مانده
  // ============================================================

  useEffect(() => {
    const due =
      Number(totalPurchase || 0) -
      Number(par_paid || 0);

    setDuePar(due >= 0 ? due : 0);
  }, [totalPurchase, par_paid]);

  // ============================================================
  // لود اولیه اطلاعات
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          // دسته‌بندی‌ها
          api.get("/categories").then((res) => {
            setCategories(
              res.data.data ?? res.data ?? []
            );
          }),

          // دواها
          api.get("/medications").then((res) => {
            setMedications(
              res.data.data ?? res.data ?? []
            );
          }),

          // تأمین‌کنندگان و خریدها
          loadSuppliersAndPurchases(),
        ]);
      } catch (error) {
        console.error(
          "خطا در لود اطلاعات:",
          error
        );

        toast.error(
          "❌ خطا در دریافت اطلاعات اولیه"
        );
      }
    };

    loadData();
  }, [api]);

  // ============================================================
  // دریافت تأمین‌کنندگان از جدول accounts
  // ============================================================

  const loadSuppliersAndPurchases = async () => {
    try {
      /*
       * قبلاً:
       *
       * /registrations
       *
       * استفاده می‌شد.
       *
       * اکنون تأمین‌کننده یک Account است.
       */

      const accountRes = await api.get("/accounts");

      let accountsData =
        accountRes.data.data ??
        accountRes.data ??
        [];

      /*
       * اگر API حساب‌ها را به صورت pagination برگرداند
       * مثلاً:
       *
       * {
       *   data: {
       *      data: [...]
       *   }
       * }
       *
       * این حالت نیز مدیریت می‌شود.
       */

      if (
        accountsData &&
        !Array.isArray(accountsData) &&
        Array.isArray(accountsData.data)
      ) {
        accountsData = accountsData.data;
      }

      /*
       * فقط حساب‌های تأمین‌کننده دوا
       *
       * account_type = payable
       * account_category = medicine_suppliers
       *
       * و حساب فعال
       */

      const suppliersList = accountsData.filter(
        (account) =>
          account.account_type === "payable" &&
          account.account_category ===
            "medicine_suppliers" &&
          (
            account.is_active === true ||
            account.is_active === 1 ||
            account.is_active === "1"
          )
      );

      setSuppliers(suppliersList);

      /*
       * بعد از دریافت حساب‌ها،
       * خریدها را دریافت می‌کنیم.
       */

      await fetchPurchases(suppliersList);

    } catch (err) {
      console.error(
        "خطا در دریافت حساب‌های تأمین‌کننده:",
        err
      );

      toast.error(
        "❌ خطا در دریافت تأمین‌کنندگان"
      );
    }
  };

  // ============================================================
  // دریافت خریدهای ثبت شده
  // ============================================================

  const fetchPurchases = async (
    suppliersList = suppliers
  ) => {
    try {
      const res = await api.get("/parchases");

      const data =
        res.data.data ??
        res.data ??
        [];

      /*
       * اگر API خریدها pagination داشته باشد
       */

      const purchasesData =
        Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : [];

      const currentSuppliers =
        suppliersList.length
          ? suppliersList
          : suppliers;

      /*
       * اضافه کردن نام تأمین‌کننده به هر خرید
       *
       * مهم:
       *
       * supplier_id اکنون accounts.id است
       *
       * نه registrations.reg_id
       */

      const purchasesWithTotals =
        purchasesData.map((purchase) => {

          const total =
            purchase.items?.reduce(
              (total, item) =>
                total +
                Number(item.total_price || 0),
              0
            ) || 0;

          /*
           * پیدا کردن Account تأمین‌کننده
           */

          const supplier =
            currentSuppliers.find(
              (account) =>
                Number(account.id) ===
                Number(purchase.supplier_id)
            );

          return {
            ...purchase,

            totalPurchase: total,

            supplier_name:
              supplier?.account_name ??
              purchase.supplier?.account_name ??
              "-",
          };
        });

      setAllPurchases(
        purchasesWithTotals
      );

    } catch (err) {
      console.error(
        "خطا در دریافت خریدها:",
        err
      );

      toast.error(
        "❌ خطا در دریافت خریدها"
      );
    }
  };

  // ============================================================
  // دواهای مربوط به Category انتخاب شده
  // ============================================================

  const filteredMedications =
    medications.filter(
      (medication) =>
        Number(medication.category_id) ===
        Number(formItem.category_id)
    );

  // ============================================================
  // تغییر فیلدهای آیتم
  // ============================================================

  const handleChange = (
    field,
    value
  ) => {

    let updated = {
      ...formItem,
      [field]: value,
    };

    // ----------------------------------------------------------
    // تغییر Category
    // ----------------------------------------------------------

    if (field === "category_id") {
      updated.med_id = "";
      updated.type = "";
      updated.unit_price = "";
    }

    // ----------------------------------------------------------
    // تغییر دوا
    // ----------------------------------------------------------

    if (field === "med_id") {

      const med =
        medications.find(
          (item) =>
            Number(item.med_id) ===
            Number(value)
        );

      updated.type =
        med?.type ?? "";

      updated.unit_price =
        med?.unit_price ?? "";
    }

    // ----------------------------------------------------------
    // محاسبه قیمت مجموعی
    // ----------------------------------------------------------

    const qty = Number(
      field === "quantity"
        ? value
        : updated.quantity || 0
    );

    const price = Number(
      field === "unit_price"
        ? value
        : updated.unit_price || 0
    );

    updated.total_price =
      qty * price;

    setFormItem(updated);
  };

  // ============================================================
  // افزودن آیتم با Enter
  // ============================================================

  const handleKeyDown = (e) => {

    if (e.key !== "Enter") {
      return;
    }

    e.preventDefault();

    if (
      !formItem.category_id ||
      !formItem.med_id ||
      !formItem.quantity ||
      !formItem.unit_price ||
      !formItem.exp_date
    ) {
      toast.error(
        "❌ لطفاً تمام فیلدهای آیتم را پر کنید"
      );

      return;
    }

    const med =
      medications.find(
        (item) =>
          Number(item.med_id) ===
          Number(formItem.med_id)
      );

    const cat =
      categories.find(
        (item) =>
          Number(item.category_id) ===
          Number(formItem.category_id)
      );

    setPurchasedItems(
      (previous) => [
        ...previous,
        {
          ...formItem,

          med_name:
            med?.gen_name ?? "-",

          category_name:
            cat?.category_name ?? "-",

          id:
            Date.now() +
            Math.random(),
        },
      ]
    );

    // پاک کردن فرم آیتم
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

  // ============================================================
  // حذف آیتم
  // ============================================================

  const handleRemoveItem = (id) => {

    setPurchasedItems(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== id
        )
    );
  };

  // ============================================================
  // لغو ویرایش
  // ============================================================

  const handleCancelEdit = () => {

    setEditingPurchaseId(null);

    setPurchasedItems([]);

    setSelectedSupplier("");

    setParPaid(0);

    setDuePar(0);

    setTotalPurchase(0);

    setParchaseDate("");

    setPurchaseData(null);

    setFormItem({
      category_id: "",
      med_id: "",
      type: "",
      quantity: "",
      unit_price: "",
      total_price: 0,
      exp_date: "",
    });

    toast.info(
      "✏️ ویرایش لغو شد"
    );
  };

  // ============================================================
  // ثبت / بروزرسانی خرید
  // ============================================================

  const handleSavePurchase = async () => {

    // ----------------------------------------------------------
    // بررسی تأمین‌کننده
    // ----------------------------------------------------------

    if (!selectedSupplier) {

      toast.error(
        "❌ لطفاً تأمین‌کننده را انتخاب کنید"
      );

      return;
    }

    // ----------------------------------------------------------
    // بررسی آیتم‌ها
    // ----------------------------------------------------------

    if (
      purchasedItems.length === 0
    ) {

      toast.error(
        "❌ حداقل یک آیتم به خرید اضافه کنید"
      );

      return;
    }

    // ----------------------------------------------------------
    // بررسی مبلغ پرداختی
    // ----------------------------------------------------------

    if (
      Number(par_paid) >
      Number(totalPurchase)
    ) {

      toast.error(
        "❌ مبلغ پرداخت‌شده نمی‌تواند بیشتر از مجموع خرید باشد"
      );

      return;
    }

    // ----------------------------------------------------------
    // Payload
    // ----------------------------------------------------------

    const payload = {

      parchase_date:
        parchaseDate ||
        new Date()
          .toISOString()
          .split("T")[0],

      par_paid:
        Number(par_paid || 0),

      /*
       * بسیار مهم:
       *
       * selectedSupplier اکنون accounts.id است.
       */

      supplier_id:
        Number(selectedSupplier),

      items:
        purchasedItems.map(
          (item) => ({
            med_id:
              Number(item.med_id),

            category_id:
              Number(item.category_id),

            type:
              item.type ?? null,

            quantity:
              Number(item.quantity),

            unit_price:
              Number(item.unit_price),

            total_price:
              Number(item.total_price),

            exp_date:
              item.exp_date,
          })
        ),
    };

    try {

      let res;

      // --------------------------------------------------------
      // بروزرسانی
      // --------------------------------------------------------

      if (editingPurchaseId) {

        res =
          await api.put(
            `/parchases/${editingPurchaseId}`,
            payload
          );

        toast.success(
          "✅ خرید با موفقیت بروزرسانی شد"
        );

      }

      // --------------------------------------------------------
      // ثبت خرید جدید
      // --------------------------------------------------------

      else {

        res =
          await api.post(
            "/parchases",
            payload
          );

        toast.success(
          "✅ خرید با موفقیت ثبت شد"
        );
      }

      // --------------------------------------------------------
      // ذخیره دیتا برای چاپ
      // --------------------------------------------------------

      setPurchaseData(
        res.data?.data ??
        res.data
      );

      // --------------------------------------------------------
      // پاک کردن فرم
      // --------------------------------------------------------

      setPurchasedItems([]);

      setParPaid(0);

      setDuePar(0);

      setTotalPurchase(0);

      setParchaseDate("");

      setSelectedSupplier("");

      setEditingPurchaseId(null);

      // --------------------------------------------------------
      // لود مجدد خریدها
      // --------------------------------------------------------

      await fetchPurchases();

    } catch (err) {

      console.error(
        "خطای ثبت/بروزرسانی خرید:",
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        "خطا در ثبت/بروزرسانی خرید";

      toast.error(
        `❌ ${message}`
      );
    }
  };

  // ============================================================
  // چاپ خرید موجود
  // ============================================================

  const handlePrintExisting = (
    purchase
  ) => {

    setPurchaseData(
      purchase
    );

    setTimeout(() => {
      handlePrint();
    }, 300);
  };

  // ============================================================
  // حذف خرید
  // ============================================================

  const handleDeletePurchase = async (
    id
  ) => {

    if (
      !window.confirm(
        "آیا مطمئن هستید که می‌خواهید این خرید حذف شود؟"
      )
    ) {
      return;
    }

    try {

      await api.delete(
        `/parchases/${id}`
      );

      toast.success(
        "✅ خرید با موفقیت حذف شد"
      );

      await fetchPurchases();

    } catch (err) {

      console.error(
        "خطا در حذف خرید:",
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        "خطا در حذف خرید";

      toast.error(
        `❌ ${message}`
      );
    }
  };

  // ============================================================
  // ویرایش خرید
  // ============================================================

  const handleEditPurchase = (
    purchase
  ) => {

    /*
     * غنی‌سازی آیتم‌ها برای نمایش نام دوا
     * و نام Category
     */

    const enrichedItems =
      (purchase.items ?? [])
        .map((item) => {

          const med =
            medications.find(
              (m) =>
                Number(m.med_id) ===
                Number(item.med_id)
            );

          const cat =
            categories.find(
              (c) =>
                Number(c.category_id) ===
                Number(item.category_id)
            );

          return {
            ...item,

            id:
              Date.now() +
              Math.random(),

            med_name:
              item.medication?.gen_name ??
              med?.gen_name ??
              "-",

            category_name:
              item.category?.category_name ??
              cat?.category_name ??
              "-",

            type:
              item.type ??
              "",

            quantity:
              item.quantity ?? "",

            unit_price:
              item.unit_price ?? "",

            total_price:
              Number(item.total_price || 0),

            exp_date:
              item.exp_date ?? "",
          };
        });

    // ----------------------------------------------------------
    // قرار دادن آیتم‌ها در فرم
    // ----------------------------------------------------------

    setPurchasedItems(
      enrichedItems
    );

    // ----------------------------------------------------------
    // supplier_id اکنون accounts.id است
    // ----------------------------------------------------------

    setSelectedSupplier(
      purchase.supplier_id
        ? String(purchase.supplier_id)
        : ""
    );

    // ----------------------------------------------------------
    // سایر اطلاعات خرید
    // ----------------------------------------------------------

    setParPaid(
      Number(purchase.par_paid || 0)
    );

    setParchaseDate(
      purchase.parchase_date ?? ""
    );

    setTotalPurchase(
      enrichedItems.reduce(
        (total, item) =>
          total +
          Number(
            item.total_price || 0
          ),
        0
      )
    );

    setDuePar(
      Math.max(
        0,
        enrichedItems.reduce(
          (total, item) =>
            total +
            Number(
              item.total_price || 0
            ),
          0
        ) -
          Number(
            purchase.par_paid || 0
          )
      )
    );

    setEditingPurchaseId(
      purchase.parchase_id
    );

    // ----------------------------------------------------------
    // قرار دادن اولین آیتم در فرم
    // ----------------------------------------------------------

    if (
      enrichedItems.length > 0
    ) {

      const first =
        enrichedItems[0];

      setFormItem({
        category_id:
          first.category_id ?? "",

        med_id:
          first.med_id ?? "",

        type:
          first.type ?? "",

        quantity: "",

        unit_price: "",

        total_price: 0,

        exp_date: "",
      });
    }

    // رفتن به ابتدای صفحه
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================================
  // JSX
  // ============================================================

  return (
    <MainLayoutjur>

      {/* ======================================================
          اطلاعات خرید
      ======================================================= */}

      <div className="form-container">

        <h2
          style={{
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          {editingPurchaseId
            ? "ویرایش خرید دوا"
            : "ثبت خرید دوا"}
        </h2>

        <div className="form-grid">

          {/* تاریخ خرید */}

          <div>

            <label>
              تاریخ خرید
            </label>

            <input
              type="date"
              value={parchaseDate}
              onChange={(e) =>
                setParchaseDate(
                  e.target.value
                )
              }
            />

          </div>


          {/* مجموع */}

          <div>

            <label>
              مجموع خرید
            </label>

            <input
              type="number"
              value={totalPurchase}
              readOnly
            />

          </div>


          {/* پرداخت */}

          <div>

            <label>
              مبلغ پرداخت شده
            </label>

            <input
              type="number"
              min="0"
              value={par_paid}
              onChange={(e) =>
                setParPaid(
                  Number(
                    e.target.value || 0
                  )
                )
              }
            />

          </div>


          {/* باقی‌مانده */}

          <div>

            <label>
              مبلغ باقی‌مانده
            </label>

            <input
              type="number"
              value={due_par}
              readOnly
            />

          </div>


          {/* ==================================================
              تأمین‌کننده
              اکنون از Accounts گرفته می‌شود
          =================================================== */}

          <div>

            <label>
              تأمین‌کننده / شرکت فروشنده دوا
            </label>

            <select
              value={selectedSupplier}
              onChange={(e) =>
                setSelectedSupplier(
                  e.target.value
                )
              }
            >

              <option value="">
                -- انتخاب تأمین‌کننده --
              </option>

              {suppliers.map(
                (supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.account_code
                      ? `${supplier.account_code} - `
                      : ""}
                    {supplier.account_name}
                  </option>
                )
              )}

            </select>

          </div>

        </div>
      </div>


      {/* ======================================================
          فرم آیتم‌ها
      ======================================================= */}

      <div className="form-container">

        <h3>
          افزودن آیتم
        </h3>

        <div
          className="form-grid"
          onKeyDown={handleKeyDown}
        >

          {/* Category */}

          <div>

            <label>
              کتگوری
            </label>

            <select
              value={
                formItem.category_id
              }
              onChange={(e) =>
                handleChange(
                  "category_id",
                  e.target.value
                )
              }
            >

              <option value="">
                -- انتخاب --
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.category_id
                    }
                    value={
                      category.category_id
                    }
                  >
                    {
                      category.category_name
                    }
                  </option>
                )
              )}

            </select>

          </div>


          {/* دوا */}

          <div>

            <label>
              دوا
            </label>

            <select
              value={
                formItem.med_id
              }
              onChange={(e) =>
                handleChange(
                  "med_id",
                  e.target.value
                )
              }
            >

              <option value="">
                -- انتخاب --
              </option>

              {filteredMedications.map(
                (medication) => (
                  <option
                    key={
                      medication.med_id
                    }
                    value={
                      medication.med_id
                    }
                  >
                    {
                      medication.gen_name
                    }
                  </option>
                )
              )}

            </select>

          </div>


          {/* نوع دوا */}

          <div>

            <label>
              نوع دوا
            </label>

            <input
              type="text"
              value={
                formItem.type
              }
              readOnly
            />

          </div>


          {/* تعداد */}

          <div>

            <label>
              تعداد
            </label>

            <input
              type="number"
              min="1"
              value={
                formItem.quantity
              }
              onChange={(e) =>
                handleChange(
                  "quantity",
                  e.target.value
                )
              }
            />

          </div>


          {/* قیمت واحد */}

          <div>

            <label>
              قیمت واحد
            </label>

            <input
              type="number"
              min="0"
              value={
                formItem.unit_price
              }
              onChange={(e) =>
                handleChange(
                  "unit_price",
                  e.target.value
                )
              }
            />

          </div>


          {/* قیمت مجموعی */}

          <div>

            <label>
              قیمت مجموعی
            </label>

            <input
              type="number"
              value={
                formItem.total_price
              }
              readOnly
            />

          </div>


          {/* تاریخ انقضا */}

          <div>

            <label>
              تاریخ انقضا
            </label>

            <input
              type="date"
              value={
                formItem.exp_date
              }
              onChange={(e) =>
                handleChange(
                  "exp_date",
                  e.target.value
                )
              }
            />

          </div>

        </div>
      </div>


      {/* ======================================================
          جدول آیتم‌های خرید
      ======================================================= */}

      {purchasedItems.length > 0 && (

        <div className="table-container">

          <table className="dark-table">

            <thead>

              <tr>

                <th>
                  شماره
                </th>

                <th>
                  کتگوری
                </th>

                <th>
                  دوا
                </th>

                <th>
                  نوع دوا
                </th>

                <th>
                  تعداد
                </th>

                <th>
                  قیمت واحد
                </th>

                <th>
                  قیمت مجموعی
                </th>

                <th>
                  تاریخ انقضا
                </th>

                <th>
                  عملیات
                </th>

              </tr>

            </thead>


            <tbody>

              {purchasedItems.map(
                (item, index) => (

                  <tr
                    key={item.id}
                  >

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {
                        item.category_name
                      }
                    </td>

                    <td>
                      {item.med_name}
                    </td>

                    <td>
                      {item.type}
                    </td>

                    <td>
                      {item.quantity}
                    </td>

                    <td>
                      {Number(
                        item.unit_price || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {Number(
                        item.total_price || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {item.exp_date}
                    </td>

                    <td>

                      <button
                        className="delete"
                        onClick={() =>
                          handleRemoveItem(
                            item.id
                          )
                        }
                      >
                        حذف
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}


      {/* ======================================================
          دکمه‌های عملیات
      ======================================================= */}

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          gap: "10px",
          justifyContent: "center",
        }}
      >

        {/* ثبت / بروزرسانی */}

        <button
          className="edit"
          onClick={
            handleSavePurchase
          }
          style={{
            backgroundColor:
              editingPurchaseId
                ? "#ffc107"
                : "#2563eb",
          }}
        >
          {editingPurchaseId
            ? "بروزرسانی خرید"
            : "ثبت خرید"}
        </button>


        {/* چاپ */}

        <button
          onClick={() => {

            if (!purchaseData) {

              toast.error(
                "ابتدا خرید را ثبت کنید"
              );

              return;
            }

            handlePrint();
          }}
          style={{
            backgroundColor:
              "#4CAF50",

            color: "white",

            padding:
              "10px 20px",

            borderRadius:
              "5px",

            border: "none",

            cursor: "pointer",

            fontSize: "14px",

            fontWeight: "bold",
          }}
        >
          چاپ خرید
        </button>


        {/* لغو ویرایش */}

        {editingPurchaseId && (

          <button
            type="button"
            onClick={
              handleCancelEdit
            }
            style={{
              backgroundColor:
                "#6c757d",

              color: "white",

              padding:
                "10px 20px",

              borderRadius:
                "5px",

              border: "none",

              cursor: "pointer",

              fontSize: "14px",

              fontWeight: "bold",
            }}
          >
            انصراف
          </button>

        )}

      </div>


      {/* ======================================================
          خریدهای ثبت‌شده
      ======================================================= */}

      {allPurchases.length > 0 && (

        <div
          className="form-container"
          style={{
            marginTop: "30px",
          }}
        >

          <h3>
            خریدهای ثبت شده
          </h3>


          <table className="dark-table">

            <thead>

              <tr>

                <th>
                  شماره
                </th>

                <th>
                  تاریخ
                </th>

                <th>
                  تأمین‌کننده
                </th>

                <th>
                  مجموع
                </th>

                <th>
                  پرداخت شده
                </th>

                <th>
                  باقی مانده
                </th>

                <th>
                  عملیات
                </th>

              </tr>

            </thead>


            <tbody>

              {allPurchases.map(
                (purchase, index) => (

                  <tr
                    key={
                      purchase.parchase_id
                    }
                  >

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {
                        purchase.parchase_date
                      }
                    </td>

                    <td>
                      {
                        purchase.supplier_name ??
                        purchase.supplier
                          ?.account_name ??
                        "-"
                      }
                    </td>

                    <td>
                      {Number(
                        purchase.totalPurchase ??
                        purchase.total_parchase ??
                        0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {Number(
                        purchase.par_paid ??
                        0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {Number(
                        purchase.due_par ??
                        (
                          Number(
                            purchase.totalPurchase ??
                            purchase.total_parchase ??
                            0
                          ) -
                          Number(
                            purchase.par_paid ??
                            0
                          )
                        )
                      ).toLocaleString()}
                    </td>

                    <td>

                      {/* حذف */}

                      <button
                        style={{
                          backgroundColor:
                            "#dc2626",

                          color: "#fff",

                          padding:
                            "5px 12px",

                          borderRadius:
                            "5px",

                          border: "none",

                          cursor:
                            "pointer",

                          fontSize:
                            "12px",

                          fontWeight:
                            "bold",

                          marginLeft:
                            "5px",
                        }}
                        onClick={() =>
                          handleDeletePurchase(
                            purchase.parchase_id
                          )
                        }
                      >
                        حذف
                      </button>


                      {/* تصحیح */}

                      <button
                        style={{
                          backgroundColor:
                            "#dcc215",

                          color: "#000",

                          padding:
                            "5px 12px",

                          borderRadius:
                            "5px",

                          border: "none",

                          cursor:
                            "pointer",

                          fontSize:
                            "12px",

                          fontWeight:
                            "bold",

                          marginLeft:
                            "5px",
                        }}
                        onClick={() =>
                          handleEditPurchase(
                            purchase
                          )
                        }
                      >
                        تصحیح
                      </button>


                      {/* چاپ */}

                      <button
                        style={{
                          backgroundColor:
                            "#0da62f",

                          color: "#fff",

                          padding:
                            "5px 12px",

                          borderRadius:
                            "5px",

                          border: "none",

                          cursor:
                            "pointer",

                          fontSize:
                            "12px",

                          fontWeight:
                            "bold",
                        }}
                        onClick={() =>
                          handlePrintExisting(
                            purchase
                          )
                        }
                      >
                        چاپ
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}


      {/* ======================================================
          Toast
      ======================================================= */}

      <ToastContainer
        position="top-right"
        autoClose={3000}
      />


      {/* ======================================================
          کامپوننت مخفی چاپ
      ======================================================= */}

      {purchaseData && (

        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
          }}
        >

          <PurchasePrint
            ref={printRef}
            purchaseData={
              purchaseData
            }
          />

        </div>

      )}

    </MainLayoutjur>
  );
};