import { useCallback, useEffect, useState } from "react";
import { HiOutlineListBullet, HiOutlinePlus } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

export default function OjtCriteria() {
  const { toast, showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await api("/academy/ojt/criteria");
    setRows(res.data);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [load, showToast]);

  const send = async (path, method, body, done) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      done?.();
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const add = (e) => {
    e.preventDefault();
    send("/academy/ojt/criteria", "POST", { name }, () => setName(""));
  };

  const saveName = (e) => {
    e.preventDefault();
    send(`/academy/ojt/criteria/${editing.id}`, "PUT", { name: editing.name }, () => setEditing(null));
  };

  return (
    <PageShell
      icon={HiOutlineListBullet}
      title="Kriteria OJT"
      subtitle="Kriteria yang dipilih HR saat membuat penilaian OJT"
      toast={toast}
    >
      <form onSubmit={add} className={`${cardCls} grid gap-3 md:grid-cols-[1fr_auto]`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder="Nama kriteria, misalnya Ketelitian packing"
          aria-label="Nama kriteria"
          className={inputCls}
        />
        <button type="submit" disabled={!name.trim()} className={primaryBtnCls}>
          <HiOutlinePlus className="h-4 w-4" /> Tambah
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Kriteria</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada kriteria
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {editing?.id === row.id ? (
                        <form onSubmit={saveName} className="flex gap-2">
                          <input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            maxLength={200}
                            aria-label="Nama kriteria"
                            className={inputCls}
                          />
                          <button type="submit" disabled={!editing.name.trim()} className={primaryBtnCls}>
                            Simpan
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className={ghostBtnCls}>
                            Batal
                          </button>
                        </form>
                      ) : (
                        <span className="font-bold text-slate-800">{row.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge active={row.is_active} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => setEditing({ id: row.id, name: row.name })} className={ghostBtnCls}>
                          Ubah nama
                        </button>
                        <button
                          type="button"
                          onClick={() => send(`/academy/ojt/criteria/${row.id}`, "PUT", { is_active: !row.is_active })}
                          className={ghostBtnCls}
                        >
                          {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
