import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";

/**
 * Info member untuk cetak nota (Tipe Member, Saldo Sebelum, Saldo Terakhir, Masa Aktif).
 * null = bukan member / gagal ambil → nota tetap dicetak tanpa blok member.
 */
export async function fetchMemberNotaInfo(orderNo) {
  if (!orderNo) return null;
  try {
    const res = await api(`/waschen/transactions/${encodeURIComponent(orderNo)}/member-info`);
    return res?.data || null;
  } catch {
    return null;
  }
}

/** Hook: receipt + memberInfo (receipt asli langsung tampil, blok member menyusul). */
export function useMemberNotaReceipt(receipt) {
  const orderNo = receipt?.id || null;
  const preset = receipt?.memberInfo;
  const [info, setInfo] = useState({ orderNo: null, data: null });

  useEffect(() => {
    if (!orderNo || preset !== undefined) return undefined;
    let alive = true;
    fetchMemberNotaInfo(orderNo).then((data) => {
      if (alive) setInfo({ orderNo, data });
    });
    return () => { alive = false; };
  }, [orderNo, preset]);

  return useMemo(() => {
    if (!receipt || preset !== undefined) return receipt;
    if (info.orderNo !== orderNo || !info.data) return receipt;
    return { ...receipt, memberInfo: info.data };
  }, [receipt, preset, info, orderNo]);
}
