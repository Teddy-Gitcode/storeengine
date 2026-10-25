"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import HandOff from "../../HandOff";
import { confirmPaystack } from "@/lib/orders-api";

/* Where Paystack returns the shopper. Paystack's signed webhook is the
   authority, but a webhook is not guaranteed to arrive, so the return trip
   asks as well — through the same server-side check, so this cannot disagree
   with it. Then the order's pay page takes over. */
function ReturnInner() {
  const params = useSearchParams();
  // Paystack sends both; either is the reference the transaction was opened with.
  const reference = params.get("reference") || params.get("trxref") || "";
  const confirm = useCallback(async () => {
    if (!reference) throw new Error("We lost track of that payment.");
    return confirmPaystack(reference);
  }, [reference]);
  return <HandOff gateway="Paystack" confirm={confirm} />;
}

export default function PaystackReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnInner />
    </Suspense>
  );
}
