"use client";

import { Suspense } from "react";
import CheckoutContent from "./CheckoutContent";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Yükleniyor...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}