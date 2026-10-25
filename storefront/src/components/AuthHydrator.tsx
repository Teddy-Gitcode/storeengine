"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { useAddresses } from "@/lib/address-store";
import { useWishlist } from "@/lib/wishlist-store";

// Revalidates the persisted user against the httpOnly session cookie on every
// page load, so a revoked/expired token signs the UI out. When the session is
// valid, pulls the server copies of the address book and the wishlist — the
// wishlist otherwise only arrived at sign-in, so a returning customer on a
// second device saw an empty one.
export default function AuthHydrator() {
  const user = useAuth((s) => s.user);
  const refresh = useAuth((s) => s.refresh);

  useEffect(() => {
    if (!user) return;
    void refresh().then(() => {
      if (useAuth.getState().user) {
        void useAddresses.getState().sync();
        void useWishlist.getState().sync();
      }
    });
    // Run once on mount — `user` is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
