import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineTag } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

const BASE = "/training-management-system/academy";

// Topik satu jenis training. Hapus hanya untuk topik tanpa soal dan indikator, selain itu nonaktifkan.
export default function TopicList() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [training, setTraining] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([api(`/academy/trainings/${trainingId}`), api(`/academy/topics?training_id=${trainingId}`)])
      .then(([detail, topics]) => {
        setTraining(detail.data);
        setRows(topics.data);
      })
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [trainingId, version, showToast]);

  const send = async (path, method, body, done) => {
    try {
      await api(path, { method, body: body ? JSON.stringify(body) : undefined });
      done?.();
      setVersion((v) => v + 1);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const add = (e) => {
    e.preventDefault();
    send(`/academy/trainings/${trainingId}/topics`, "POST", { name }, () => setName(""));
  };

  const saveName = (e) => {
    e.preventDefault();
    const row = rows.find((r) => r.id === editing.id);
    send(`/academy/topics/${editing.id}`, "PUT", { name: editing.name, is_active: row.is_active }, () => setEditing(null));
  };

  const toggleActive = (row) => send(`/academy/topics/${row.id}`, "PUT", { name: row.name, is_active: !row.is_active });

  const remove = (row) => {
    const warning =
      row.participant_count > 0 ? "\n\nPilihan topik ini pada peserta di batch yang ada ikut terhapus. Nilai tidak berubah." : "";
    if (window.confirm(`Hapus topik "${row.name}"?${warning}`)) send(`/academy/topics/${row.id}`, "DELETE");
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(training ? `${BASE}/topics/master/${training.master_id}` : `${BASE}/topics`)}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
    >
      <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
    </button>
  );

  return (
    <PageShell
      icon={HiOutlineTag}
      title={training ? `${training.master_name} · ${training.name}` : "Master Topik"}
      subtitle="Topik jenis training ini. Soal dan penilaian mentor mengikuti topik"
      action={backButton}
      toast={toast}
    >
      <form onSubmit={add} className={cn(cardCls, "grid gap-3 md:grid-cols-[1fr_auto]")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={150}
          placeholder="Nama topik baru"
          aria-label="Nama topik baru"
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
                <th className="px-6 py-4">Topik</th>
                <th className="px-6 py-4 text-center">Soal</th>
                <th className="px-6 py-4 text-center">Indikator</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada topik
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
                            maxLength={150}
                            aria-label="Nama topik"
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
                    <td className="px-6 py-4 text-center">{row.question_count}</td>
                    <td className="px-6 py-4 text-center">{row.indicator_count}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge active={row.is_active} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => setEditing({ id: row.id, name: row.name })} className={ghostBtnCls}>
                          Ubah nama
                        </button>
                        <button type="button" onClick={() => toggleActive(row)} className={ghostBtnCls}>
                          {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        {row.question_count === 0 && row.indicator_count === 0 && (
                          <button type="button" onClick={() => remove(row)} className={cn(ghostBtnCls, "text-rose-600")}>
                            Hapus
                          </button>
                        )}
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
