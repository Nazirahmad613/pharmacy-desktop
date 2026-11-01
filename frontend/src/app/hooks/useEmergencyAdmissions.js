// src/lib/useEmergencyAdmissions.js
"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getAdmissions } from "./emergencyStore";

const getServerSnapshot = () => [];

export function useEmergencyAdmissions() {
  return useSyncExternalStore(subscribe, getAdmissions, getServerSnapshot);
}