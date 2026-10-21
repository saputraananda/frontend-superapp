import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";
import HistoryTransaction from "../Transaction/HistoryTransaction";
import { EVENT_TRANSACTIONS_PATH, eventLabel, useEventOutlets } from "./utils/eventUtils";

/** Data Transaksi Event — Riwayat Transaksi khusus nota outlet event (is_event = 1). */
export default function EventTransaction() {
  const events = useEventOutlets();
  const [workStatuses, setWorkStatuses] = useState([]);

  useEffect(() => {
    api("/waschen/work-statuses?isFilterTab=1&isActive=1")
      .then((res) => setWorkStatuses(res.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[100rem] mx-auto overflow-x-hidden">
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Data Transaksi Event</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Nota yang dibuat di outlet event B2B. Refund & pengajuan hapus tetap di menu Riwayat Transaksi.
          </p>
        </div>
      </PageHero>

      <HistoryTransaction
        eventOnly
        title="Transaksi Event"
        allOutletsLabel="Semua Event"
        outlets={events.map((ev) => ({ id: ev.id, name: eventLabel(ev) }))}
        workStatuses={workStatuses}
        detailFrom={EVENT_TRANSACTIONS_PATH}
      />
    </div>
  );
}
