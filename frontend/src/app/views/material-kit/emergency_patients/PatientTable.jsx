// src/app/material/emergency/components/PatientTable.jsx
"use client";

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HealingIcon from "@mui/icons-material/Healing";
import TriagePriorityChip from "./TriagePriorityChip";

export default function PatientTable({ patients = [], onView, onTreat }) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>شماره پرونده</TableCell>
            <TableCell>نام مریض</TableCell>
            <TableCell>سن</TableCell>
            <TableCell>شکایت اصلی</TableCell>
            <TableCell>اولویت</TableCell>
            <TableCell>زمان پذیرش</TableCell>
            <TableCell align="center">عملیات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                مریضی یافت نشد
              </TableCell>
            </TableRow>
          ) : (
            patients.map((patient) => (
              <TableRow key={patient.id} hover>
                <TableCell>{patient.caseNumber}</TableCell>
                <TableCell>{patient.name}</TableCell>
                <TableCell>{patient.age}</TableCell>
                <TableCell>{patient.chiefComplaint}</TableCell>
                <TableCell><TriagePriorityChip priority={patient.triageLevel} /></TableCell>
                <TableCell>{patient.admissionTime}</TableCell>
                <TableCell align="center">
                  <Tooltip title="مشاهده">
                    <IconButton size="small" onClick={() => onView?.(patient)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="معالجه">
                    <IconButton size="small" color="primary" onClick={() => onTreat?.(patient)}>
                      <HealingIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}