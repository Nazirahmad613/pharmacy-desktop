 import React, { forwardRef } from "react";
import "./sale-print.css";

const SalePrint = forwardRef(({ saleData }, ref) => {
  if (!saleData) return null;

  return (
    <div ref={ref} className="print-container">

      <div className="bill-header">
        <h2>بل فروش</h2>
        <div className="bill-meta">
          <span>شماره فروش: {saleData.sale_number}</span>
          <span>نام مشتری: {saleData.customer}</span>
          <span>تاریخ: {saleData.date}</span>
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>شماره</th>
            <th>نام دوا</th>
            <th>شرکت</th>
            <th>تعداد</th>
            <th>قیمت واحد</th>
            <th>قیمت مجموعی</th>
          </tr>
        </thead>
        <tbody>
          {saleData.items?.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.gen_name}</td>
              <td>{item.supplier_name}</td>
              <td>{item.quantity}</td>
              <td>{Number(item.unit_sales).toLocaleString()}</td>
              <td>{Number(item.total_sales).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* خلاصه حساب افقی */}
      <div className="bill-summary-horizontal">
        <div>
          <span>مجموع فروش</span>
          <strong>{saleData.totalSale?.toLocaleString()}</strong>
        </div>

        <div>
          <span>تخفیف</span>
          <strong>{saleData.discount?.toLocaleString()}</strong>
        </div>

        <div>
          <span>فروش خالص</span>
          <strong>{saleData.netSales?.toLocaleString()}</strong>
        </div>

        <div>
          <span>پرداخت شده</span>
          <strong>{saleData.totalPaid?.toLocaleString()}</strong>
        </div>

        <div>
          <span>باقی‌مانده</span>
          <strong>{saleData.remaining?.toLocaleString()}</strong>
        </div>

        <div>
          <span>وضعیت</span>
          <strong>{saleData.paymentStatus}</strong>
        </div>
      </div>

      <div className="bill-footer">
        تشکر از خرید شما 
      </div>

    </div>
  );
});

export default SalePrint;