import { Card }     from "../ui/Card";
import { TaskCard } from "./TaskCard";
import { STATUS_LIST, PRIORITY_LIST } from "../../constants/pmConstants";
import { initials } from "../../utils/pmUtils";

export const TaskListPanel = ({
  filteredTasks, selectedId, onSelect, load,
  statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter,
  query, setQuery,
  meOnly, setMeOnly,
  employee, loading,
}) => (
  <div className="lg:col-span-5 space-y-3">
    <Card className="p-4">
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={() => setStatusFilter("all")}
          className={["px-3 py-1 rounded-md text-xs font-semibold border transition",
            statusFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          ].join(" ")}>All</button>
        {STATUS_LIST.map((s) => (
          <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
            className={["px-3 py-1 rounded-md text-xs font-semibold border transition",
              statusFilter === s.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            ].join(" ")}>{s.label}</button>
        ))}
        <button type="button" onClick={() => setMeOnly((v) => !v)}
          className={["inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition",
            meOnly ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          ].join(" ")}>
          <span className={["h-4 w-4 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0",
            meOnly ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
          ].join(" ")}>{initials(employee?.full_name)}</span>
          Me Only {meOnly && <span className="ml-0.5 opacity-70">✓</span>}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task..."
          className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 transition" />
        <select className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none"
          value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priority</option>
          {PRIORITY_LIST.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
    </Card>

    {loading ? (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />)}
      </div>
    ) : filteredTasks.length ? (
      <div className="space-y-2">
        {filteredTasks.map((t) => (
          <TaskCard key={t.id} task={t} selected={selectedId} onSelect={onSelect} onUpdated={load} />
        ))}
      </div>
    ) : (
      <Card className="p-10 text-center">
        <div className="text-slate-700 font-semibold">Tidak ada task</div>
        <div className="text-slate-400 text-xs mt-1">Ubah filter atau tambah task baru.</div>
      </Card>
    )}
  </div>
);