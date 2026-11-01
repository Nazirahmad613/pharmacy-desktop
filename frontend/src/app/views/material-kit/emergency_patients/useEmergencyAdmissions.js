// src/lib/useEmergencyAdmissions.js
"use client";
import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "../../../hooks/emergencyStore";

const serverSnapshot = [];
export function useEmergencyAdmissions() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}