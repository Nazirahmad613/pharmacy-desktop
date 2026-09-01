// src/app/pages/laboratory/LabResults.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScienceIcon from "@mui/icons-material/Science";
import VisibilityIcon from "@mui/icons-material/Visibility";

export default function LabResults() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:8000/api/laboratory-requests/all",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("خطا در دریافت داده‌ها");

      const result = await response.json();
      let allRequests = [];

      if (result.success) {
        if (Array.isArray(result.data)) {
          allRequests = result.data;
        } else if (result.data?.all_requests && Array.isArray(result.data.all_requests)) {
          allRequests = result.data.all_requests;
        }
      }

      const paidRequests = allRequests.filter((r) => r.has_fee === true);
      setRequests(paidRequests);
      setError(null);
    } catch (err) {
      console.error("❌ خطا:", err);
      setError("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate("/material/lab-hematology")}
          sx={{ color: "#60a5fa" }}
        >
          <ArrowBackIcon />
        </IconButton>
        <ScienceIcon sx={{ fontSize: 40, color: "#06b6d4" }} />
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "white" }}>
          📄 ثبت نتایج آزمایش
        </Typography>
        <Chip
          label={`${requests.filter(r => r.status !== "completed").length} در انتظار`}
          color="warning"
          size="small"
          sx={{ ml: 2 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {requests.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", bgcolor: "#1a2a3a", borderRadius: "12px" }}>
          <Typography variant="h6" sx={{ color: "#9ca3af" }}>هیچ درخواستی یافت نشد</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: "#1a2a3a", borderRadius: "12px" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#0d1b2a" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>#</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>نام بیمار</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>نوع تست</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>وضعیت</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req, index) => (
                <TableRow key={req.id} sx={{ "&:hover": { bgcolor: "#243647" } }}>
                  <TableCell sx={{ color: "#9ca3af" }}>{index + 1}</TableCell>
                  <TableCell sx={{ color: "white" }}>{req.patient_name || "نامشخص"}</TableCell>
                  <TableCell sx={{ color: "#9ca3af" }}>{req.test_name || req.test_type}</TableCell>
                  <TableCell>
                    <Chip
                      label={req.status === "completed" ? "تکمیل شده" : "در انتظار"}
                      color={req.status === "completed" ? "success" : "warning"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(`/material/lab-request-detail/${req.id}`)}
                      sx={{ bgcolor: "#3b82f6" }}
                    >
                      مشاهده و ثبت
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}