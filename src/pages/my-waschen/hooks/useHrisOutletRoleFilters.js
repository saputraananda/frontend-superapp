import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";

/**
 * Filter outlet + posisi HRIS.
 * multiple: true → outletIds/roles berupa array, dikirim ke API sebagai "1,2" / "Frontliner,Produksi".
 * outletId / role tetap tersedia (string, dipisah koma) untuk label export.
 */
export default function useHrisOutletRoleFilters({ multiple = false } = {}) {
  const [outlets, setOutlets] = useState([]);
  const [outletIds, setOutletIds] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    api("/waschen/outlets")
      .then((r) => setOutlets(r.data || []))
      .catch(() => setOutlets([]));
  }, []);

  const outletId = outletIds.join(",");
  const role = roles.join(",");

  const appendFilters = useCallback(
    (qs) => {
      if (outletId) qs.set("outletId", outletId);
      if (role) qs.set("role", role);
      return qs;
    },
    [outletId, role],
  );

  // Mode satu pilihan: setter menerima string ("" = semua)
  const setOutletId = useCallback((v) => setOutletIds(v ? [String(v)] : []), []);
  const setRole = useCallback((v) => setRoles(v ? [String(v)] : []), []);

  return {
    multiple,
    outlets,
    outletId,
    setOutletId,
    role,
    setRole,
    outletIds,
    setOutletIds,
    roles,
    setRoles,
    appendFilters,
    hasActiveFilters: Boolean(outletId || role),
    resetFilters: () => {
      setOutletIds([]);
      setRoles([]);
    },
  };
}
