import { useState, useEffect } from "react";
import { Box, TextField, MenuItem, Button } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAuth } from "app/contexts/AuthContext";
import Mainlayoutg from "../../../../components/Mainlayoutg";

export default function HospitalReportPage() {
  const { api } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    source: "",
    from_date: "",
    to_date: "",
    search: "",
  });

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 15,
  });

  const [rowCount, setRowCount] = useState(0);
  const [sortModel, setSortModel] = useState([]);

  // دریافت داده‌ها
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
      };

      if (sortModel.length > 0) {
        params.sort_by = sortModel[0].field;
        params.sort_dir = sortModel[0].sort;
      }

      const response = await api.get("/hospital-reports", { params });

      // مطمئن شدن از داشتن id
      const dataWithId = response.data.data.map((row, index) => ({
        id: row.id || index,
        ...row,
      }));

      setRows(dataWithId);
      setRowCount(response.data.total);
    } catch (error) {
      console.error("خطا در دریافت گزارش‌ها:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paginationModel, sortModel]);

  const columns = [
    { field: "source", headerName: "نوع", width: 100 },
    { field: "date", headerName: "تاریخ", width: 100 },
    { field: "patient_name", headerName: "بیمار", width: 120 },
    { field: "doctor_name", headerName: "داکتر", width: 120 },
    { field: "medication_name", headerName: "دوا", width: 120 },
    { field: "quantity", headerName: "تعداد", width: 70 },
    { field: "unit_price", headerName: "قیمت واحد", width: 90 },
    { field: "total_price", headerName: "قیمت کل", width: 100 },
    { field: "customer_name", headerName: "مشتری", width: 120 },
    { field: "supplier_name", headerName: "عرضه‌کننده", width: 120 },
    { field: "amount", headerName: "مبلغ", width: 100 },
    { field: "paid_amount", headerName: "پرداخت شده", width: 100 },
    { field: "due_amount", headerName: "باقی", width: 100 },
    { field: "notes", headerName: "یادداشت", width: 180 },
  ];

  return (
    <Mainlayoutg>
      <Box className="hospital-report-container">
        {/* فرم فیلتر */}
        <Box className="hospital-report-filters">
          <TextField
            select
            label="نوع"
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          >
            <MenuItem value="">همه</MenuItem>
            <MenuItem value="transaction">تراکنش</MenuItem>
            <MenuItem value="sales">فروش</MenuItem>
            <MenuItem value="parchases">خرید</MenuItem>
          </TextField>

          <TextField
            type="date"
            label="از تاریخ"
            InputLabelProps={{ shrink: true }}
            value={filters.from_date}
            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
          />

          <TextField
            type="date"
            label="تا تاریخ"
            InputLabelProps={{ shrink: true }}
            value={filters.to_date}
            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
          />

          <TextField
            label="جستجو"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <Button
            variant="contained"
            onClick={() => {
              setPaginationModel({ ...paginationModel, page: 0 });
              fetchData();
            }}
          >
            فیلتر
          </Button>
        </Box>

        {/* جدول */}
        <Box className="hospital-report-datagrid">
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[15]}
            pagination
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortingMode="server"
            onSortModelChange={setSortModel}
            getRowId={(row) => row.id}
          />
        </Box>
      </Box>
    </Mainlayoutg>
  );
}
