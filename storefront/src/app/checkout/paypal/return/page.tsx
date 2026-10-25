"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import HandOff from "../../HandOff";
import { capturePayPal } from "@/lib/orders-api";

/* Where PayPal returns the shopper. Nothing in this URL proves a payment —
   it says the shopper reached PayPal and came back. The capture is what moves
   the money, done by the backend against the order number. Then the order's
   pay page takes over. */
function ReturnInner() {
  const params = useSearchParams();
  const order = params.get("order") || "";
  const confirm = useCallback(async () => {
    if (!order) throw new Error("We lost track of that order.");
    const res = await capturePayPal(order);
    return { order, status: res.status };
  }, [order]);
  return <HandOff gateway="PayPal" order={order || undefined} confirm={confirm} />;
}

export default function PayPalReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnInner />
    </Suspense>
  );
}
