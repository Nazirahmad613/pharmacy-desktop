import { useEffect, useState } from "react";
import axios from "axios";

import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography
} from "@mui/material";

export default function SalesReport() {
  const [data, setData] = useState([]);
  const [type, setType] = useState("daily");
  const [search, setSearch] = useState("");

  // دریافت دیتا
  const fetchData = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/sales-report?type=${type}`
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  // فیلتر جستجو
  const filteredData = data.filter((item) =>
    String(item.period).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box p={3}>
      <Typography variant="h6" mb={2}>
        گزارش فروش
      </Typography>

      {/* 🔥 فیلترها */}
      <Box display="flex" gap={2} mb={3}>
        
        {/* نوع گزارش */}
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          size="small"
        >
          <MenuItem value="daily">روزانه</MenuItem>
          <MenuItem value="weekly">هفتگی</MenuItem>
          <MenuItem value="monthly">ماهانه</MenuItem>
          <MenuItem value="yearly">سالانه</MenuItem>
        </Select>

        {/* جستجو */}
        <TextField
          size="small"
          placeholder="جستجو..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      {/* 🔥 جدول */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>تاریخ</TableCell>
            <TableCell>مجموع فروش</TableCell>
            <TableCell>تعداد سفارش</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{row.total_sales}</TableCell>
              <TableCell>{row.total_orders}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}