'use client';

import { createContext, useContext, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { canAccess, type AccessLevel, type Viewer } from '@/lib/admin-access';

type AccessValue = {
  viewer: Viewer;
  /** Whether the signed-in role reaches `href` at `level` (default view). */
  can: (href: string, level?: AccessLevel) => boolean;
  /** Whether they may change things on the page they are looking at — the
   *  test for showing Create, Edit, Delete and action buttons. */
  canManageHere: boolean;
};

const AccessCtx = createContext<AccessValue>({ viewer: null, can: () => true, canManageHere: true });

/* The signed-in role, for components deep in a page that need to hide what the
   role can't do. Hiding is a courtesy: the backend refuses regardless. */
export function AccessProvider({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const pathname = usePathname();
  const value = useMemo<AccessValue>(
    () => ({
      viewer,
      can: (href, level = 'view') => canAccess(viewer, href, level),
      canManageHere: canAccess(viewer, pathname, 'manage'),
    }),
    [viewer, pathname],
  );
  return <AccessCtx.Provider value={value}>{children}</AccessCtx.Provider>;
}

export function useAccess(): AccessValue {
  return useContext(AccessCtx);
}

/** Renders its children only when the role may change things on this page —
 *  for server-rendered pages, which can't call the hook themselves. */
export function ManageOnly({ children }: { children: React.ReactNode }) {
  return useAccess().canManageHere ? <>{children}</> : null;
}
