import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlinePlus, HiOutlineStar, HiOutlineTrash } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, ghostBtnCls, iconBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

export default function SkillMatrixMaster() {
  const { toast, showToast } = useToast();
  const nextKey = useRef(1);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [positionName, setPositionName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);

  const withKeys = useCallback(
    (rows) =>
      rows.map((c) => ({
        ...c,
        _key: nextKey.current++,
        weight: Number(c.weight),
        indicators: c.indicators.map((i) => ({ ...i, _key: nextKey.current++ })),
      })),
    [],
  );

  const selectPosition = useCallback(
    (position) => {
      setSelectedId(position?.id ?? null);
      setCategories(withKeys(position?.categories ?? []));
    },
    [withKeys],
  );

  const load = useCallback(async () => {
    const res = await api("/academy/skill/positions");
    setPositions(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    load()
      .then((data) => selectPosition(data[0]))
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
    api("/academy/skill/roles")
      .then((res) => setRoles(res.data))
      .catch((err) => showToast(err.message, "error"));
  }, [load, selectPosition, showToast]);

  const selected = positions.find((p) => p.id === selectedId);
  const totalWeight = categories.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const addPosition = async (e) => {
    e.preventDefault();
    try {
      const res = await api("/academy/skill/positions", {
        method: "POST",
        body: JSON.stringify({ name: positionName, role_key: roleKey }),
      });
      setPositionName("");
      setRoleKey("");
      const data = await load();
      selectPosition(data.find((p) => p.id === res.id));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const togglePosition = async () => {
    try {
      await api(`/academy/skill/positions/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: selected.name, is_active: !selected.is_active }),
      });
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const changeRole = async (role_key) => {
    try {
      await api(`/academy/skill/positions/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: selected.name, is_active: selected.is_active, role_key }),
      });
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Bagian yang sudah dipakai posisi lain tidak ditawarkan lagi.
  const usedRoles = new Set(positions.filter((p) => p.role_key && p.id !== selectedId).map((p) => p.role_key));
  const roleOptions = (current) => roles.filter((r) => r === current || !usedRoles.has(r));

  const patchCategory = (key, fields) =>
    setCategories((prev) => prev.map((c) => (c._key === key ? { ...c, ...fields } : c)));
  const patchIndicators = (key, update) =>
    setCategories((prev) => prev.map((c) => (c._key === key ? { ...c, indicators: update(c.indicators) } : c)));
  const addCategory = () =>
    setCategories((prev) => [
      ...prev,
      { _key: nextKey.current++, name: "", weight: "", indicators: [{ _key: nextKey.current++, name: "" }] },
    ]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api(`/academy/skill/positions/${selected.id}/structure`, {
        method: "PUT",
        body: JSON.stringify({ categories }),
      });
      showToast(res.message);
      const data = await load();
      selectPosition(data.find((p) => p.id === selected.id));
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      icon={HiOutlineStar}
      title="Skill Matrix"
      subtitle="Posisi, kategori penilaian, indikator, dan bobot"
      toast={toast}
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <section className={cardCls}>
            <h2 className="mb-3 text-sm font-bold text-slate-800">Posisi</h2>
            <form onSubmit={addPosition} className="mb-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={positionName}
                  onChange={(e) => setPositionName(e.target.value)}
                  placeholder="Posisi baru"
                  aria-label="Nama posisi baru"
                  className={inputCls}
                />
                <button type="submit" disabled={!positionName.trim()} aria-label="Tambah posisi" className={primaryBtnCls}>
                  <HiOutlinePlus className="h-4 w-4" />
                </button>
              </div>
              <select value={roleKey} onChange={(e) => setRoleKey(e.target.value)} aria-label="Bagian karyawan" className={inputCls}>
                <option value="">Tidak terhubung ke bagian</option>
                {roles
                  .filter((r) => !positions.some((p) => p.role_key === r))
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </select>
            </form>
            <ul className="space-y-1">
              {positions.map((position) => (
                <li key={position.id}>
                  <button
                    type="button"
                    onClick={() => selectPosition(position)}
                    aria-current={position.id === selectedId}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition",
                      position.id === selectedId ? "bg-amber-50 text-amber-800" : "text-slate-600 hover:bg-slate-50",
                      !position.is_active && "line-through opacity-60",
                    )}
                  >
                    {position.name}
                    <span className="font-medium text-slate-400">{position.categories.length} kategori</span>
                  </button>
                </li>
              ))}
              {positions.length === 0 && <li className="py-4 text-center text-xs text-slate-400">Belum ada posisi</li>}
            </ul>
          </section>

          {selected ? (
            <section className={`${cardCls} space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">{selected.name}</h2>
                  <StatusBadge active={selected.is_active} />
                </div>
                <button type="button" onClick={togglePosition} className={ghostBtnCls}>
                  {selected.is_active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>

              <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:max-w-xs">
                Terhubung ke bagian
                <select value={selected.role_key ?? ""} onChange={(e) => changeRole(e.target.value)} className={inputCls}>
                  <option value="">Tidak terhubung (LO melihat semua nama)</option>
                  {roleOptions(selected.role_key).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              {categories.map((category) => (
                <div key={category._key} className="space-y-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={category.name}
                      onChange={(e) => patchCategory(category._key, { name: e.target.value })}
                      placeholder="Nama kategori"
                      aria-label="Nama kategori"
                      className={inputCls}
                    />
                    <div className="relative w-24 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={category.weight}
                        onChange={(e) => patchCategory(category._key, { weight: e.target.value })}
                        aria-label={`Bobot ${category.name || "kategori"} dalam persen`}
                        className={cn(inputCls, "pr-7")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategories((prev) => prev.filter((c) => c._key !== category._key))}
                      aria-label={`Hapus kategori ${category.name}`}
                      className={iconBtnCls}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 pl-3">
                    {category.indicators.map((indicator) => (
                      <div key={indicator._key} className="flex items-center gap-2">
                        <input
                          value={indicator.name}
                          onChange={(e) =>
                            patchIndicators(category._key, (rows) =>
                              rows.map((r) => (r._key === indicator._key ? { ...r, name: e.target.value } : r)),
                            )
                          }
                          placeholder="Nama indikator"
                          aria-label="Nama indikator"
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            patchIndicators(category._key, (rows) => rows.filter((r) => r._key !== indicator._key))
                          }
                          aria-label={`Hapus indikator ${indicator.name}`}
                          className={iconBtnCls}
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        patchIndicators(category._key, (rows) => [...rows, { _key: nextKey.current++, name: "" }])
                      }
                      className={ghostBtnCls}
                    >
                      <HiOutlinePlus className="h-3.5 w-3.5" /> Indikator
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={addCategory} className={ghostBtnCls}>
                  <HiOutlinePlus className="h-4 w-4" /> Tambah Kategori
                </button>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-bold", totalWeight === 100 ? "text-emerald-600" : "text-rose-600")}>
                    Total bobot {totalWeight}%
                  </span>
                  <button type="button" onClick={save} disabled={saving} className={primaryBtnCls}>
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className={`${cardCls} text-center text-xs text-slate-400`}>Pilih atau tambah posisi</section>
          )}
        </div>
      )}
    </PageShell>
  );
}
