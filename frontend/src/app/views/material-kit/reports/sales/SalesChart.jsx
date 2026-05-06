import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function SalesChart() {
  const [data, setData] = useState([]);
  const [type, setType] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchChart = () => {
    axios
      .get("http://localhost:8000/api/sales/chart", {
        params: { type, date }
      })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchChart();
  }, [type, date]);

  return (
    <div style={{ maxWidth: "100%", padding: "0 10px" }}>
      <h2>گزارش فروش به شکل گراف</h2>

      {/* فیلترها با قابلیت wrap */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="daily">روزانه</option>
          <option value="monthly">ماهانه</option>
          <option value="yearly">سالانه</option>
        </select>

        {type === "daily" && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        {type === "monthly" && (
          <input
            type="month"
            value={date.slice(0, 7)}
            onChange={(e) => setDate(e.target.value + "-01")}
          />
        )}
        {type === "yearly" && (
          <input
            type="number"
            placeholder="سال"
            value={date.slice(0, 4)}
            onChange={(e) => setDate(e.target.value + "-01-01")}
          />
        )}
      </div>

      {/* نمودار در یک ظرف با اسکرول افقی و حداکثر عرض */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <div style={{ minWidth: "300px", maxWidth: "600px", margin: "0 auto" }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}