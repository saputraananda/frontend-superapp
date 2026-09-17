import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function useHrisOutletRoleFilters() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    api("/waschen/outlets")
      .then((r) => setOutlets(r.data || []))
      .catch(() => setOutlets([]));
  }, []);

  const appendFilters = useCallback(
    (qs) => {
      if (outletId) qs.set("outletId", outletId);
      if (role) qs.set("role", role);
      return qs;
    },
    [outletId, role],
  );

  return {
    outlets,
    outletId,
    setOutletId,
    role,
    setRole,
    appendFilters,
    hasActiveFilters: Boolean(outletId || role),
    resetFilters: () => {
      setOutletId("");
      setRole("");
    },
  };
}
