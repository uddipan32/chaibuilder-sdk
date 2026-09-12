import { useCallback } from "react";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";

function entityOf(perm: string): string {
  const idx = perm.indexOf(":");
  return idx === -1 ? perm : perm.slice(0, idx);
}

export const usePermissions = () => {
  const permissions = useBuilderProp("permissions", null) as string[] | null | undefined;
  const hasPermission = useCallback(
    (permission: string) => {
      if (!permissions) return true;
      if (permissions.length === 0) return false;
      if (permissions.includes("*")) return true;
      if (permissions.includes(permission)) return true;
      return permissions.includes(`${entityOf(permission)}:*`);
    },
    [permissions],
  );

  return { hasPermission };
};
