import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineListBullet, HiOutlinePlus } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

const BASE = "/training-management-system/academy/kriteria-ojt";

export default function OjtSubskills() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  // undefined = sedang dimuat, null = kriteria tidak ditemukan.
  const [criterion, setCriterion] = useState(undefined);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await api("/academy/ojt/criteria");
    setCriterion(res.data.find((c) => String(c.id) === id) ?? null);
  }, [id]);

  useEffect(() => {
    load().catch((err) => {
      showToast(err.message, "error");
      setCriterion(null);
    });
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
    send(`/academy/ojt/criteria/${id}/subskills`, "POST", { name }, () => setName(""));
  };

  const saveName = (e) => {
    e.preventDefault();
    send(`/academy/ojt/subskills/${editing.id}`, "PUT", { name: editing.name }, () => setEditing(null));
  };

  const backButton = (
    <button type="button" onClick={() => navigate(BASE)} className={ghostBtnCls}>
      Kembali
    </button>
  );

  if (criterion === undefined) {
    return (
      <PageShell icon={HiOutlineListBullet} title="Sub-skill" subtitle="Memuat data" action={backButton} toast={toast}>
        <Spinner />
      </PageShell>
    );
  }

  if (criterion === null) {
    return (
      <PageShell icon={HiOutlineListBullet} title="Sub-skill" subtitle="Kriteria OJT" action={backButton} toast={toast}>
        <p className={`${cardCls} text-center text-sm text-slate-500`}>Kriteria tidak ditemukan</p>
      </PageShell>
    );
  }

  const activeCount = criterion.subskills.filter((s) => s.is_active).length;
  const shown = criterion.subskills.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <PageShell
      icon={HiOutlineListBullet}
      title={`Sub-skill ${criterion.name}`}
      subtitle={`Kriteria OJT · ${activeCount} sub-skill aktif`}
      action={backButton}
      toast={toast}
    >
      <form onSubmit={add} className={`${cardCls} grid gap-3 md:grid-cols-[1fr_auto]`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder="Nama sub-skill, misalnya Melipat"
          aria-label="Nama sub-skill"
          className={inputCls}
        />
        <button type="submit" disabled={!name.trim()} className={primaryBtnCls}>
          <HiOutlinePlus className="h-4 w-4" /> Tambah sub-skill
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="space-y-1 border-b border-slate-200 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari sub-skill"
            aria-label="Cari sub-skill"
            className={inputCls}
          />
          <p className="text-xs text-slate-400">
            Sub-skill yang ditambah atau diganti di sini hanya berlaku untuk OJT yang dibuat sesudahnya.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Sub-skill</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-xs text-slate-400">
                    {criterion.subskills.length === 0 ? "Belum ada sub-skill" : "Tidak ada hasil"}
                  </td>
                </tr>
              ) : (
                shown.map((sub) => (
                  <tr key={sub.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {editing?.id === sub.id ? (
                        <form onSubmit={saveName} className="flex gap-2">
                          <input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            maxLength={200}
                            aria-label="Nama sub-skill"
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
                        <span className="font-bold text-slate-800">{sub.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge active={sub.is_active} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => setEditing({ id: sub.id, name: sub.name })} className={ghostBtnCls}>
                          Ubah nama
                        </button>
                        <button
                          type="button"
                          onClick={() => send(`/academy/ojt/subskills/${sub.id}`, "PUT", { is_active: !sub.is_active })}
                          className={ghostBtnCls}
                        >
                          {sub.is_active ? "Nonaktifkan" : "Aktifkan"}
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
