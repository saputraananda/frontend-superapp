import { BASE_URL } from "../../../lib/api";

// Data bersama untuk export Serah Terima Linen (Excel & PDF), mengikuti breakdown LMS:
// ringkasan global + per unit/ruangan, dengan TTD unit bila transaksi mewajibkannya.

export function signatureUrl(sig) {
  if (!sig) return null;
  const s = String(sig).trim();
  if (!s) return null;
  if (/^(data:|https?:|blob:)/i.test(s)) return s;
  const base = (BASE_URL || "").replace(/\/$/, "");
  const url = `${base}/ikm/linen-transactions/signature-proxy?name=${encodeURIComponent(s.split("/").pop())}`;
  return /^https?:/i.test(url) ? url : new URL(url, window.location.origin).href;
}

export function toTitleCase(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const qty = (v) => (v === null || v === undefined || v === "" ? null : Number(v) || 0);

function summarize(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.hospital_linen_id || item.linen_name;
    if (!map.has(key)) map.set(key, { ...item, qty_kotor: 0, qty_bersih: null, notesList: [] });
    const g = map.get(key);
    g.qty_kotor += item.qty_kotor || 0;
    if (item.qty_bersih !== null) g.qty_bersih = (g.qty_bersih || 0) + item.qty_bersih;
    if (item.notes && item.notes.trim() && item.notes !== "—") g.notesList.push(item.notes.trim());
  }
  return [...map.values()].map(({ notesList, ...g }) => ({ ...g, notes: notesList.join("; ") }));
}

/**
 * @param {{header, details, unitSign}} data respons GET /ikm/linen-transactions/:id
 * @returns {{ tx, global, rooms: [{ name, items, unit }] }}
 *   unit = null (pakai TTD transaksi) atau TTD Valet + Perawat Unit ruangan itu
 */
export function buildSerahTerimaExportData(data) {
  if (!data?.header) throw new Error("Data transaksi tidak valid untuk diekspor");
  const { header, details = [], unitSign } = data;

  const tx = {
    ...header,
    pickup_name: header.pickup_by_name && header.pickup_by_name !== "-" ? header.pickup_by_name : "",
    delivery_name: header.delivery_by_name && header.delivery_by_name !== "-" ? header.delivery_by_name : "",
    sig: {
      valetPickup: signatureUrl(header.signature_valet_pickup),
      hospPickup: signatureUrl(header.signature_hospital_pickup),
      asstPickup: signatureUrl(header.signature_assistant_pickup),
      valetDelivery: signatureUrl(header.signature_valet_delivery),
      hospDelivery: signatureUrl(header.signature_hospital_delivery),
      asstDelivery: signatureUrl(header.signature_assistant_delivery),
    },
    delivered: header.status === "SELESAI",
  };

  const items = details
    .map((d) => ({
      ...d,
      linen_name: d.linen_display_name || `Linen #${d.hospital_linen_id}`,
      ownership: d.ownership_type === "SEWA" ? "Sewa" : "Rumah Sakit",
      qty_kotor: qty(d.qty_kotor) || 0,
      qty_bersih: qty(d.qty_bersih),
      room_name: d.room_name || "Tanpa Ruangan",
    }))
    .filter((d) => d.qty_kotor > 0 || (d.qty_bersih || 0) > 0);

  const signByRoom = new Map((unitSign?.rooms || []).map((r) => [Number(r.room_id), r]));
  const roomMap = new Map();
  for (const item of items) {
    if (!roomMap.has(item.room_name)) roomMap.set(item.room_name, { name: item.room_name, items: [], roomId: item.room_id, gudang: Number(item.is_gudang_linen) === 1 });
    roomMap.get(item.room_name).items.push(item);
  }

  const rooms = [...roomMap.values()].map((room) => {
    const required = !!unitSign?.required && room.roomId && !room.gudang;
    if (!required) return { name: room.name, items: room.items, unit: null };
    const s = signByRoom.get(Number(room.roomId)) || {};
    return {
      name: room.name,
      items: room.items,
      unit: {
        pickup: {
          valet: signatureUrl(s.signature_valet_pickup),
          nurse: signatureUrl(s.signature_nurse_pickup),
          name: s.nurse_name_pickup || "",
        },
        delivery: {
          valet: signatureUrl(s.signature_valet_delivery),
          nurse: signatureUrl(s.signature_nurse_delivery),
          name: s.nurse_name_delivery || "",
          complete: !!(s.signature_valet_delivery && s.signature_nurse_delivery && s.nurse_name_delivery),
        },
      },
    };
  });

  return { tx, global: summarize(items), rooms };
}

/** Tahap TTD (Pickup / Delivery) untuk satu halaman/sheet; Perawat RS hanya bila ada nama atau TTD */
export function signatureStages(tx, unit) {
  if (unit) {
    return [
      {
        title: "Tahap 1: Pengambilan Linen Kotor (Pickup) — TTD Unit",
        kind: "pickup",
        cols: [
          { label: "Valet IKM", sig: unit.pickup.valet, name: tx.pickup_name },
          { label: "Perawat Unit", sig: unit.pickup.nurse, name: unit.pickup.name },
        ],
        pending: "",
      },
      {
        title: "Tahap 2: Pengiriman Linen Bersih (Delivery) — TTD Unit",
        kind: "delivery",
        cols: [
          { label: "Valet IKM", sig: unit.delivery.valet, name: tx.delivery_name },
          { label: "Perawat Unit", sig: unit.delivery.nurse, name: unit.delivery.name },
        ],
        pending: !unit.delivery.complete && !tx.delivered ? "Belum Ada Pengiriman" : "",
      },
    ];
  }
  const stage = (title, kind, valet, hosp, asst, valetName, hospName, asstName, pending) => {
    const cols = [
      { label: "Valet IKM", sig: valet, name: valetName },
      { label: "Petugas RS", sig: hosp, name: hospName },
    ];
    if (asst || asstName) cols.push({ label: "Perawat RS", sig: asst, name: asstName });
    return { title, kind, cols, pending };
  };
  return [
    stage("Tahap 1: Pengambilan Linen Kotor (Pickup)", "pickup",
      tx.sig.valetPickup, tx.sig.hospPickup, tx.sig.asstPickup,
      tx.pickup_name, tx.hospital_staff_pickup, tx.hospital_assistant_pickup, ""),
    stage("Tahap 2: Pengiriman Linen Bersih (Delivery)", "delivery",
      tx.sig.valetDelivery, tx.sig.hospDelivery, tx.sig.asstDelivery,
      tx.delivery_name, tx.hospital_staff_delivery, tx.hospital_assistant_delivery,
      tx.delivered ? "" : "Belum Ada Pengiriman"),
  ];
}
