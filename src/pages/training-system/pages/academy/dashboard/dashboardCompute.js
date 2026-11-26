// Perhitungan Dashboard Academy dari baris yang dikirim endpoint /academy/dashboard/*.

// Warna desain dipetakan ke palet superapp.
export const PAL = {
  ink: "#1e293b",
  muted: "#64748b",
  ok: "#059669",
  bad: "#e11d48",
  warnBg: "#fbbf24",
  warnText: "#b45309",
  violet: "#6d28d9",
  violetSrc: "#7c3aed",
  blue: "#2563eb",
  bar: "#94a3b8",
  selected: "#fffbeb",
  white: "#fff",
};

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Rentang periode dari tanggal mulai batch pertama dan terakhir (teks YYYY-MM-DD); tanpa data memakai hari ini. */
export function periodOf(periods, today = new Date()) {
  const parse = (s, fallback) => (s ? [Number(s.slice(0, 4)), Number(s.slice(5, 7))] : fallback);
  const now = [today.getFullYear(), today.getMonth() + 1];
  const [firstYear, firstMonth] = parse(periods?.first, now);
  const [lastYear, lastMonth] = parse(periods?.last, now);
  return { firstYear, firstMonth, lastYear, lastMonth };
}

export const yearsOf = (p) => Array.from({ length: p.lastYear - p.firstYear + 1 }, (_, i) => p.firstYear + i);

/** Angka bulan yang bisa dipilih pada satu tahun: tahun pertama mulai dari bulan batch pertama, semuanya sampai Desember. */
export const monthsOf = (p, year) => {
  const from = year === p.firstYear ? p.firstMonth : 1;
  return Array.from({ length: 13 - from }, (_, i) => from + i);
};

export const fm = (x, d) => Number(x).toFixed(d).replace(".", ",");

export const INITIAL_STATE = { pos: "all", training: "all", source: "all", cab: "all", year: 2026, month: 11, sel: null, sortS: "nama", can: "all", cant: "all" };

/** Bulan terpilih dalam bentuk YYYY-MM untuk parameter ?month= endpoint dashboard. */
export const monthParam = (st) => `${st.year}-${String(st.month).padStart(2, "0")}`;

const mean = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);
const nums = (values) => values.filter((v) => v !== null && v !== undefined).map(Number);
const f1 = (v) => (v === null ? "-" : fm(v, 1));
const plus = (v) => (v > 0 ? "+" : "");
const optionsOf = (label, entries) => [{ value: "all", label: `${label} (${entries.length})` }].concat(entries.map(([value, text]) => ({ value, label: text })));
const uniquePairs = (items, idKey, nameKey) => [...new Map(items.map((i) => [String(i[idKey]), i[nameKey]])).entries()];
const satisfaction = (v) => (v >= 4 ? "Sangat puas" : v >= 3 ? "Puas" : v >= 2 ? "Cukup" : "Kurang puas");
const level = (v) => (v >= 4 ? "Bisa mengajarkan" : v >= 3 ? "Mandiri" : v >= 2 ? "Perlu bimbingan" : "Belum bisa");

const RESULT_VIEW = {
  LULUS: ["Lulus", PAL.ok, PAL.white],
  LULUS_PERBAIKAN: ["Lulus dengan perbaikan", PAL.warnBg, PAL.ink],
  TIDAK_LULUS: ["Tidak lulus", PAL.bad, PAL.white],
};

/** Angka satu kelompok peserta training (definisi sama dengan desain: pembagi hadir dan kelulusan = semua peserta ber-status). */
function trainingStats(rows) {
  const present = rows.filter((r) => r.status !== "ABSENT");
  const paired = present.filter((r) => r.pre_score !== null && r.post_score !== null);
  const count = (status) => rows.filter((r) => r.result_status === status).length;
  const lulus = count("LULUS"), perbaikan = count("LULUS_PERBAIKAN"), gagal = count("TIDAK_LULUS");
  return {
    hadir: present.length,
    total: rows.length,
    pre: mean(nums(present.map((r) => r.pre_score))),
    post: mean(nums(present.map((r) => r.post_score))),
    gain: paired.length ? mean(paired.map((r) => Number(r.post_score))) - mean(paired.map((r) => Number(r.pre_score))) : null,
    lulus, perbaikan, gagal, graded: lulus + perbaikan + gagal,
    feedback: mean(nums(rows.map((r) => r.feedback_score))),
    mentor: mean(nums(rows.map((r) => r.mentor_score))),
  };
}

/**
 * Tab Training dari baris peserta satu bulan (rows) dan katalog master/jenis (catalog = [{ id, name, jenis: [{ id, name }] }]).
 * st.training = id master (teks) atau "all"; st.pos = id jenis (teks) atau "all".
 */
export function computeTraining(st, rows, catalog = []) {
  const pickedMasters = catalog.filter((m) => st.training === "all" || String(m.id) === st.training);
  const jenisOptions = [...new Map(pickedMasters.flatMap((m) => m.jenis.map((j) => [String(j.id), j.name]))).entries()];
  const scope = rows.filter((r) => (st.training === "all" || String(r.master_id) === st.training) && (st.pos === "all" || String(r.jenis_id) === st.pos));
  const all = trainingStats(scope);

  const masterRows = uniquePairs(scope, "master_id", "master_name").map(([id, name]) => {
    const own = scope.filter((r) => String(r.master_id) === id);
    const s = trainingStats(own);
    const share = (n) => (s.graded ? (n / s.graded) * 100 : 0) + "%";
    const score = (v) => (v === null ? "-" : fm(+v.toFixed(1), v % 1 ? 1 : 0));
    return {
      name,
      pos: [...new Set(own.map((r) => r.jenis_name))],
      hadir: `${s.hadir}/${s.total}`,
      pre: score(s.pre),
      post: score(s.post),
      naik: s.gain === null ? "-" : plus(s.gain) + score(s.gain),
      naikColor: s.gain !== null && s.gain > 0 ? PAL.ok : PAL.bad,
      wL: share(s.lulus),
      wP: share(s.perbaikan),
      wT: share(s.gagal),
      lulusTxt: `Lulus ${s.lulus} · Perbaikan ${s.perbaikan} · Tidak lulus ${s.gagal}`,
      fb: f1(s.feedback),
      mentor: f1(s.mentor),
      mentorColor: s.mentor !== null && s.mentor < 2.5 ? PAL.warnText : PAL.ink,
    };
  });

  const ranked = scope
    .filter((r) => r.final_score !== null)
    .sort((a, b) => b.final_score - a.final_score || (b.post_score ?? 0) - (a.post_score ?? 0));
  const top = ranked.slice(0, 10).map((r, i) => {
    const [hasil, hBg, hFg] = RESULT_VIEW[r.result_status] ?? ["-", PAL.white, PAL.ink];
    return {
      no: i + 1,
      n: r.full_name,
      cab: r.outlet_name ?? "-",
      pos: r.jenis_name,
      training: r.master_name,
      pre: r.pre_score ?? "-",
      post: r.post_score ?? "-",
      mentor: f1(r.mentor_score === null ? null : Number(r.mentor_score)),
      akhir: r.final_score,
      hasil, hBg, hFg,
    };
  });

  return {
    trOpts: [{ value: "all", label: "Semua master (" + catalog.length + ")" }].concat(catalog.map((m) => ({ value: String(m.id), label: m.name }))),
    posOpts: optionsOf("Semua jenis", jenisOptions),
    top,
    topEmpty: top.length === 0,
    topInfo: "Menampilkan " + top.length + " dari " + ranked.length + " peserta, nilai akhir tertinggi di atas",
    rows: masterRows,
    empty: masterRows.length === 0,
    listInfo: masterRows.length + " master training ditampilkan",
    kTraining: String(masterRows.length),
    kTrainingSub: "master training bulan ini",
    kPos: String(new Set(scope.map((r) => r.jenis_id)).size),
    kPosSub: "jenis training dilatih",
    kHadir: all.total ? Math.round((all.hadir / all.total) * 100) + "%" : "-",
    kHadirSub: all.hadir + " dari " + all.total + " peserta hadir",
    kNaik: all.gain === null ? "-" : plus(all.gain) + fm(all.gain, 1),
    kNaikSub: all.gain === null ? "" : "rata-rata pre " + fm(all.pre, 1) + " · rata-rata post " + fm(all.post, 1),
    kLulus: all.graded ? Math.round((all.lulus / all.graded) * 100) + "%" : "-",
    kLulusSub: all.lulus + " dari " + all.graded + " peserta lulus",
    kFb: f1(all.feedback),
    kFbSub: all.feedback === null ? "" : satisfaction(all.feedback) + " · rata-rata skala 1–4",
    kMt: f1(all.mentor),
    kMtSub: all.mentor === null ? "" : level(all.mentor) + " · rata-rata skala 1–4",
    kMtCol: all.mentor !== null && all.mentor < 2.5 ? PAL.warnText : PAL.ink,
  };
}

/** "12–22 Nov" atau "28 Nov–8 Des" dari dua tanggal YYYY-MM-DD. */
function spanLabel(start, end) {
  const [a, b] = [start, end].map((d) => [Number(d.slice(8, 10)), MONTH_LABELS[Number(d.slice(5, 7)) - 1]]);
  return a[1] === b[1] ? `${a[0]}–${b[0]} ${b[1]}` : `${a[0]} ${a[1]}–${b[0]} ${b[1]}`;
}

const ojtRange = (start, days) => spanLabel(start, new Date(Date.parse(start + "T00:00:00Z") + (days - 1) * 86400000).toISOString().slice(0, 10));

/** Tab OJT dari baris peserta OJT satu bulan. st.pos = bagian (role) atau "all"; st.training = id kriteria (teks) atau "all". */
export function computeOjt(st, rows) {
  const byRole = rows.filter((r) => st.pos === "all" || r.role === st.pos);
  const jenis = uniquePairs(byRole, "criterion_id", "criterion_name");
  const picked = jenis.some(([id]) => id === st.training) ? st.training : "all";
  const E = byRole.filter((r) => picked === "all" || String(r.criterion_id) === picked);
  const roles = [...new Set(rows.map((r) => r.role).filter(Boolean))].sort();

  const gain = (r) => (r.awal !== null && r.akhir !== null ? r.akhir - r.awal : null);
  const gainView = (d) => (d === null ? "belum ada" : plus(d) + fm(d, 1));
  const gainColor = (d) => (d === null ? PAL.muted : d >= 1 ? PAL.ok : PAL.bad);
  const awal = nums(E.map((r) => r.awal));
  const akhir = nums(E.map((r) => r.akhir));
  const paired = E.filter((r) => gain(r) !== null);
  const pairedGain = mean(paired.map(gain));

  const emps = E.slice()
    .sort((a, b) => (a.akhir === null) - (b.akhir === null) || (b.akhir ?? 0) - (a.akhir ?? 0) || (gain(b) ?? 0) - (gain(a) ?? 0))
    .map((r, i) => ({ no: i + 1, n: r.full_name, cab: r.outlet_name ?? "-", tg: ojtRange(r.start_date, r.days), pos: r.role ?? "-", awal: f1(r.awal), akhir: f1(r.akhir), naik: gainView(gain(r)), col: gainColor(gain(r)) }));

  const cabRows = uniquePairs(E.map((r) => ({ ...r, cab: r.outlet_name ?? "-" })), "cab", "cab").map(([cab]) => {
    const own = E.filter((r) => (r.outlet_name ?? "-") === cab);
    const done = own.filter((r) => r.akhir !== null && r.awal !== null);
    const d = done.length ? mean(done.map((r) => r.akhir)) - mean(done.map((r) => r.awal)) : null;
    const a = mean(nums(own.map((r) => r.awal)));
    const k = mean(nums(own.map((r) => r.akhir)));
    return { cab, n: own.length, awal: f1(a), akhir: f1(k), naik: d === null ? "-" : plus(d) + fm(d, 1), col: d !== null && d >= 1 ? PAL.ok : PAL.bad };
  });

  return {
    posOpts: optionsOf("Semua bagian", roles.map((r) => [r, r])),
    training: picked,
    ojtOpts: optionsOf("Semua jenis", jenis),
    emps,
    cabRows,
    empty: E.length === 0,
    kN: String(E.length),
    kNSub: "karyawan OJT",
    kAwalDone: awal.length + "/" + E.length,
    kAwalSub: "dinilai di hari pertama OJT",
    kAkhirDone: akhir.length + "/" + E.length,
    kAkhirSub: "dinilai di hari terakhir OJT",
    kAwal: awal.length ? fm(mean(awal), 1) : "-",
    kAkhir: akhir.length ? fm(mean(akhir), 1) : "-",
    kAwalLvl: awal.length ? level(mean(awal)) + " · skala 1–4" : "",
    kAkhirLvl: akhir.length ? level(mean(akhir)) + " · skala 1–4" : "",
    kNaik: pairedGain === null ? "-" : plus(pairedGain) + fm(pairedGain, 1),
    kNaikSub: "target usulan +1,0",
  };
}

const GAP_SOURCE_COLOR = { Training: [PAL.ok, PAL.white], OJT: [PAL.violetSrc, PAL.white], "Skill Matrix": [PAL.blue, PAL.white] };
// Prioritas pada skala 1–4: di bawah 2 tinggi, 2 sampai di bawah 3 sedang, 3 ke atas rendah.
const gapPriority = (v) => (v < 2 ? ["Tinggi", PAL.bad, PAL.white] : v < 3 ? ["Sedang", PAL.warnBg, PAL.ink] : ["Rendah", PAL.ok, PAL.white]);

/** Tab Skill Gap dari items [{ source, name, group, average, count }]. st.source = sumber atau "all"; st.pos = jenis/posisi atau "all". */
export function computeSkillGap(st, items) {
  const bySource = items.filter((i) => st.source === "all" || i.source === st.source);
  const groups = [...new Set(bySource.map((i) => i.group))].sort();
  const G = bySource.filter((i) => st.pos === "all" || i.group === st.pos).sort((a, b) => a.average - b.average || a.name.localeCompare(b.name));
  const gaps = (source) => G.filter((i) => (source ? i.source === source : true) && i.average < 3);

  const rows = G.slice(0, 12).map((i, k) => {
    const [pri, priBg, priFg] = gapPriority(i.average);
    const [srcBg, srcFg] = GAP_SOURCE_COLOR[i.source];
    return { no: k + 1, topic: i.name, src: i.source, srcBg, srcFg, pos: i.group, v: fm(i.average, 1), w: (i.average / 4) * 100 + "%", col: i.average < 2 ? PAL.bad : i.average < 3 ? PAL.warnBg : PAL.ok, pri, priBg, priFg };
  });

  return {
    posOpts: optionsOf("Semua jenis / posisi", groups.map((g) => [g, g])),
    srcOpts: [{ value: "all", label: "Semua sumber" }, ...["Training", "OJT", "Skill Matrix"].map((s) => ({ value: s, label: s }))],
    rows,
    empty: rows.length === 0,
    listInfo: "Menampilkan " + rows.length + " nilai terendah dari " + G.length + " indikator",
    kHigh: String(G.filter((i) => i.average < 2).length),
    kHighSub: "nilai di bawah 2",
    kTr: String(gaps("Training").length),
    kOj: String(gaps("OJT").length),
    kSm: String(gaps("Skill Matrix").length),
    kSub: "di bawah 3",
    kPos: String(new Set(gaps().map((i) => i.group)).size),
    kPosSub: "jenis/posisi punya gap",
  };
}

/** Tab Feedback dari { participants, scale, open } satu bulan. st.training = id jenis training (teks) atau "all". */
export function computeFeedback(st, data) {
  const jenis = uniquePairs(data.participants, "jenis_id", "jenis_name");
  const inScope = (r) => st.training === "all" || String(r.jenis_id) === st.training;
  const people = data.participants.filter(inScope);
  const responden = people.filter((p) => p.status === "FEEDBACK_DONE");
  const scale = data.scale.filter(inScope);
  const fb = mean(nums(people.map((p) => p.feedback_score)));
  const status = (v) => (v < 3 ? ["Perlu perbaikan", PAL.bad, PAL.white] : ["Baik", PAL.ok, PAL.white]);

  const aspectAverages = (rows) => {
    const byQuestion = new Map();
    rows.forEach((r) => byQuestion.set(r.question, [...(byQuestion.get(r.question) ?? []), Number(r.score)]));
    return [...byQuestion].map(([name, scores]) => ({ name, n: mean(scores) })).sort((a, b) => a.n - b.n);
  };

  const aspRows = aspectAverages(scale).map((a) => {
    const [s, sBg, sFg] = status(a.n);
    return { name: a.name, v: fm(a.n, 1), n: a.n, w: (a.n / 4) * 100 + "%", col: a.n < 3 ? PAL.bad : PAL.ok, status: s, sBg, sFg };
  });

  const trRows = uniquePairs(responden, "jenis_id", "jenis_name")
    .map(([id, name]) => {
      const own = responden.filter((p) => String(p.jenis_id) === id);
      const v = mean(nums(own.map((p) => p.feedback_score)));
      const weakest = aspectAverages(scale.filter((r) => String(r.jenis_id) === id))[0];
      const [, sBg, sFg] = status(v ?? 4);
      return {
        name,
        n: own.length,
        v: f1(v),
        nv: v ?? 4,
        col: v !== null && v < 3 ? PAL.bad : PAL.ok,
        weak: weakest ? `${weakest.name} (${fm(weakest.n, 1)})` : "-",
        saran: String(data.open.filter((o) => String(o.jenis_id) === id).length),
        status: v !== null && v < 3 ? "Perlu dibenahi" : "Baik",
        sBg, sFg,
      };
    })
    .sort((a, b) => a.nv - b.nv);

  const saranRows = data.open.filter(inScope).slice(0, 20).map((o) => ({ jenis: o.jenis_name, text: o.text }));

  return {
    trOpts: optionsOf("Semua jenis", jenis),
    aspRows,
    trRows,
    saranRows,
    noSaran: saranRows.length === 0,
    empty: responden.length === 0,
    kResp: String(responden.length),
    kRespSub: "dari " + people.length + " peserta terdaftar",
    kFb: f1(fb),
    kFbSub: fb === null ? "" : satisfaction(fb) + " · rata-rata skala 1–4",
  };
}

const starView = (v) => {
  const n = Math.max(0, Math.min(4, Math.round(Number(v))));
  return { on: "★".repeat(n), off: "★".repeat(4 - n) };
};
const raporColor = (v) => (v !== null && Number(v) < 2.5 ? PAL.violet : PAL.ink);

/**
 * Tab Rapor. list = baris dari /dashboard/rapor, detail = data dari /dashboard/rapor/:id untuk karyawan terpilih (atau null saat memuat).
 * Daftar disaring dan diurutkan di sini; karyawan terpilih = st.sel atau baris pertama (keluaran `cur`).
 */
export function computeRapor(st, list, detail) {
  const can = (e) => e.positions.filter((p) => p.star >= 3);
  const cant = (e) => e.positions.filter((p) => p.star < 3);
  const pool = list.filter(
    (e) =>
      (st.pos === "all" || e.role === st.pos) &&
      (st.cab === "all" || e.outlet_name === st.cab) &&
      (st.can === "all" || can(e).some((p) => p.name === st.can)) &&
      (st.cant === "all" || cant(e).some((p) => p.name === st.cant)),
  );
  const byName = (a, b) => a.full_name.localeCompare(b.full_name);
  const order = {
    nama: byName,
    high: (a, b) => (b.sikap ?? -1) - (a.sikap ?? -1) || byName(a, b),
    low: (a, b) => (a.sikap ?? 5) - (b.sikap ?? 5) || byName(a, b),
  };
  const C = pool.slice().sort(order[st.sortS] ?? byName);
  const cur = C.find((e) => e.employee_id === st.sel) ?? C[0] ?? null;

  const sikapView = (v) => (v === null ? { siOn: "", siOff: "", siV: "-", siCol: PAL.ink } : { siOn: starView(v).on, siOff: starView(v).off, siV: fm(v, 1), siCol: raporColor(v) });
  const chips = (positions) => positions.map((p) => ({ name: p.additional ? `${p.name} (tambahan)` : p.name, on: "★".repeat(p.star) }));
  const rows = C.slice(0, 20).map((e) => ({
    id: e.employee_id,
    n: e.full_name,
    cab: e.outlet_name ?? "-",
    pos: e.position_name ?? "-",
    can: chips(can(e)),
    cant: chips(cant(e)),
    canNone: can(e).length === 0,
    cantNone: cant(e).length === 0,
    ...sikapView(e.sikap),
    bg: cur && cur.employee_id === e.employee_id ? PAL.selected : PAL.white,
  }));

  const skills = C.filter((e) => e.positions.length).map((e) => mean(e.positions.map((p) => p.score)));
  const sikaps = nums(C.map((e) => e.sikap));
  const out = {
    posOpts: optionsOf("Semua posisi", [...new Set(list.map((e) => e.role).filter(Boolean))].sort().map((r) => [r, r])),
    cabOpts: optionsOf("Semua cabang", [...new Set(list.map((e) => e.outlet_name).filter(Boolean))].sort().map((c) => [c, c])),
    sortOpts: [{ value: "nama", label: "Nama A–Z" }, { value: "high", label: "Sikap tertinggi" }, { value: "low", label: "Sikap terendah" }],
    canOpts: optionsOf("Semua posisi", [...new Set(list.flatMap((e) => e.positions.map((p) => p.name)))].sort().map((n) => [n, n])),
    rows,
    empty: C.length === 0,
    cur: cur ? { id: cur.employee_id } : null,
    hasSel: Boolean(cur && detail),
    listInfo: `Menampilkan ${rows.length} dari ${C.length} karyawan`,
    kEmp: String(C.length),
    kEmpSub: "karyawan dalam pilihan",
    kSkill: skills.length ? fm(mean(skills), 1) : "-",
    kSkillSub: "rata-rata skill, skala 1–4",
    kSikap: sikaps.length ? fm(mean(sikaps), 1) : "-",
    kSikapSub: "rata-rata sikap, skala 1–4",
    kMentor: String(C.filter((e) => e.is_mentor).length),
    kMentorSub: "karyawan pernah jadi mentor",
  };
  out.cantOpts = out.canOpts;
  if (!cur || !detail) return out;

  const item = (i) => ({ name: i.name, type: i.source, v: fm(i.score, 1), ...starView(i.score), col: raporColor(i.score) });
  const trRows = detail.training.map((t) => {
    const [hasil, hBg, hFg] = RESULT_VIEW[t.result_status] ?? ["-", PAL.white, PAL.ink];
    return { name: t.program, bulan: `${MONTH_LABELS[Number(t.start_at.slice(5, 7)) - 1]} ${t.start_at.slice(0, 4)}`, pre: t.pre ?? "-", post: t.post ?? "-", m: f1(t.mentor === null ? null : Number(t.mentor)), akhir: t.final, hasil, hBg, hFg };
  });
  const ojtRows = detail.ojt.map((o) => ({
    name: o.program,
    tg: spanLabel(o.start_date, o.end_date),
    awal: f1(o.awal),
    akhir: f1(o.akhir),
    naik: o.peningkatan === null ? "belum ada" : plus(o.peningkatan) + fm(o.peningkatan, 1),
    col: o.peningkatan !== null && o.peningkatan >= 1 ? PAL.ok : PAL.muted,
  }));
  const mentorRows = detail.mentor.map((m) => ({ name: m.program, peserta: m.peserta, v: f1(m.rating), ...(m.rating === null ? { on: "", off: "" } : starView(m.rating)) }));
  const blocks = detail.positions.map((p) => ({ id: p.id, pos: p.position_name, on: "★".repeat(p.star), off: "★".repeat(4 - p.star), v: fm(p.score, 1), col: raporColor(p.score), additional: p.additional }));
  const sikapGood = detail.sikap.baik.map((s) => ({ name: s.name, v: fm(s.average, 1) }));
  const sikapBad = detail.sikap.perlu.map((s) => ({ name: s.name, v: fm(s.average, 1) }));

  return Object.assign(out, {
    sel: { n: detail.profile.full_name, cab: detail.profile.outlet_name ?? "-", posAsli: detail.profile.position_name ?? "-", ...sikapView(cur.sikap) },
    gapItems: detail.gap.map(item),
    gapItemsEmpty: detail.gap.length === 0,
    gapItemsTitle: "Skill gap: 3 nilai terendah (di bawah 3 bintang)",
    bestItems: detail.best.map(item),
    bestItemsEmpty: detail.best.length === 0,
    bestItemsTitle: "Skill terbaik: 3 nilai tertinggi (3 bintang ke atas)",
    trRows, noTr: trRows.length === 0,
    ojtRows, noOjt: ojtRows.length === 0,
    mentorRows, noMentor: mentorRows.length === 0,
    blocks, noBlocks: blocks.length === 0,
    sikapGood, sikapGoodEmpty: sikapGood.length === 0,
    sikapBad, sikapBadEmpty: sikapBad.length === 0,
  });
}

// Legenda skala 1–4 yang dipakai kartu angka di beberapa tab.
export const LEVEL_LEGEND = [
  ["4", "Bisa mengajarkan"],
  ["3–3,9", "Mandiri"],
  ["2–2,9", "Perlu bimbingan"],
  ["1–1,9", "Belum bisa"],
];

export const SATISFACTION_LEGEND = [
  ["4", "Sangat puas"],
  ["3–3,9", "Puas"],
  ["2–2,9", "Cukup, training perlu dibenahi"],
  ["1–1,9", "Kurang puas, training perlu diperbaiki"],
];
