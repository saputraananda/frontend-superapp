import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../lib/api";
import {
  HiOutlineFolderOpen,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSquares2X2,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlinePencilSquare,
} from "react-icons/hi2";
import AddWorkspaceModal from "../../components/AddWorkspaceModal";
import AddSubWorkspaceModal from "../../components/AddSubWorkspaceModal";
import EditWorkspaceModal from "../../components/EditWorkspaceModal";

function WorkspaceCard({ workspace, onDelete, onAddSub, onEdit }) {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (expanded) {
      const loadSubs = async () => {
        setLoadingSubs(true);
        try {
          const data = await api(`/api/pm2/workspaces/${workspace.id}/sub`);
          setSubs(data?.data || []);
        } catch (err) {
          console.error("Gagal memuat sub-workspace:", err);
        } finally {
          setLoadingSubs(false);
        }
      };
      loadSubs();
    }
  }, [expanded, workspace.id]);

  const toggleExpand = (e) => {
    setExpanded((v) => !v);
  };

  const handleDeleteWorkspace = (e) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Workspace Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none group"
        onClick={toggleExpand}
      >
        <div 
          onClick={(e) => { e.stopPropagation(); navigate(`/project-management-v2/workspaces/${workspace.id}`); }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow text-white hover:scale-105 transition duration-200"
        >
          <HiOutlineFolderOpen className="h-5 w-5" />
        </div>
        <div 
          onClick={(e) => { e.stopPropagation(); navigate(`/project-management-v2/workspaces/${workspace.id}`); }}
          className="flex-1 min-w-0"
        >
          <h3 className="text-sm font-bold text-slate-800 hover:text-indigo-600 transition truncate">
            {workspace.title}
          </h3>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            <span>{workspace.desc || "Tidak ada deskripsi"}</span>
            <span>&middot;</span>
            <span className="font-semibold">{workspace.sub_count || 0} sub-workspace</span>
            <span>&middot;</span>
            <span className="font-semibold text-[9px] bg-slate-100 text-slate-600 rounded px-1 py-0.5">
              {workspace.company_name || "Semua Perusahaan"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onAddSub(workspace); }}
            title="Tambah Sub-Workspace"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
          >
            <HiOutlinePlus className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(workspace); }}
            title="Edit Workspace"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
          >
            <HiOutlinePencilSquare className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteWorkspace}
            title="Hapus Workspace"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition"
          >
            <HiOutlineTrash className="h-4 w-4" />
          </button>
          <HiOutlineChevronRight
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </div>

      {/* Sub-workspace list */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60">
          {loadingSubs ? (
            <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-xs">Memuat sub-workspace...</span>
            </div>
          ) : subs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400 italic">Belum ada sub-workspace</p>
              <button
                onClick={() => onAddSub(workspace)}
                className="mt-2 inline-flex items-center gap-1 rounded-xl border border-dashed border-indigo-300 px-3 py-1.5 text-xs font-bold text-indigo-500 hover:bg-indigo-50 transition"
              >
                <HiOutlinePlus className="h-3.5 w-3.5" /> Tambah Sub-Workspace
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {subs.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() =>
                    navigate(`/project-management-v2/workspaces/${workspace.id}/sub/${sub.id}`)
                  }
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white text-left group/sub transition"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 group-hover/sub:bg-violet-600 group-hover/sub:text-white transition">
                    <HiOutlineSquares2X2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 group-hover/sub:text-indigo-600 transition truncate">
                      {sub.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {sub.task_count || 0} task &middot; {sub.completed_count || 0} selesai
                    </p>
                  </div>
                  {/* Mini progress bar */}
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    <div className="w-20 h-1 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
                        style={{
                          width: sub.task_count > 0
                            ? `${Math.round((sub.completed_count / sub.task_count) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {sub.task_count > 0
                        ? `${Math.round((sub.completed_count / sub.task_count) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <HiOutlineChevronRight className="h-4 w-4 text-slate-300 group-hover/sub:text-indigo-400 transition shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Delete Workspace Modal Overlay */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-inner">
              <HiOutlineTrash className="h-6 w-6 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Hapus Workspace?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Workspace "{workspace.title}" dan semua sub-workspace-nya akan dihapus secara permanen. Apakah Anda yakin?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(workspace.id);
                  setShowDeleteModal(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition active:scale-95 shadow-md shadow-rose-600/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [addSubTarget, setAddSubTarget] = useState(null); // workspace object
  const [editWorkspaceTarget, setEditWorkspaceTarget] = useState(null); // workspace object

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await api("/api/pm2/workspaces");
      setWorkspaces(data?.data || []);
    } catch (err) {
      console.error("Gagal memuat workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api(`/api/pm2/workspaces/${id}`, { method: "DELETE" });
      window.dispatchEvent(new Event("pm2_workspaces_updated"));
      loadWorkspaces();
    } catch (err) {
      console.error("Gagal menghapus workspace:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* Toolbar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner">
              <HiOutlineFolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Workspace &amp; Unit Bisnis</h1>
              <p className="text-xs text-slate-400">
                Kelola workspace dan sub-workspace departemen &amp; divisi
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddWorkspace(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20 shrink-0"
          >
            <HiOutlinePlus className="h-4 w-4" />
            Buat Workspace
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {[
            { label: "Total Workspace", value: workspaces.length, color: "bg-indigo-50 text-indigo-600" },
            { label: "Total Sub-Workspace", value: workspaces.reduce((acc, w) => acc + (w.sub_count || 0), 0), color: "bg-violet-50 text-violet-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${stat.color.split(" ")[1]}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Workspace List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs">Memuat workspace...</p>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
              <HiOutlineFolderOpen className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Belum Ada Workspace</h3>
            <p className="mt-1 text-xs text-slate-400">Buat workspace pertama Anda untuk mulai mengelola tugas tim</p>
            <button
              onClick={() => setShowAddWorkspace(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              <HiOutlinePlus className="h-4 w-4" /> Buat Workspace Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onDelete={handleDelete}
                onAddSub={(ws) => setAddSubTarget(ws)}
                onEdit={(ws) => setEditWorkspaceTarget(ws)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddWorkspaceModal
        open={showAddWorkspace}
        onClose={() => setShowAddWorkspace(false)}
        onSuccess={loadWorkspaces}
      />

      <AddSubWorkspaceModal
        open={!!addSubTarget}
        onClose={() => setAddSubTarget(null)}
        onSuccess={loadWorkspaces}
        workspaceId={addSubTarget?.id}
        workspaceName={addSubTarget?.title}
      />

      <EditWorkspaceModal
        open={!!editWorkspaceTarget}
        onClose={() => setEditWorkspaceTarget(null)}
        onSuccess={loadWorkspaces}
        workspace={editWorkspaceTarget}
      />
    </div>
  );
}
