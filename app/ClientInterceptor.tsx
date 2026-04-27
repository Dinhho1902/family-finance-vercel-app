"use client";
import { useEffect } from "react";
import { initApiInterceptor } from "@/lib/api-interceptor";

export default function ClientInterceptor() {
  useEffect(() => {
    initApiInterceptor();
  }, []);
  return null;
}
