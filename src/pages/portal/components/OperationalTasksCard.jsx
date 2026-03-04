export default function OperationalTasksCard({ tasks }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">Task Operasional</h2>
        <button className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
          Upcoming
        </button>
      </div>

      <div className="p-4 space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
          >
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-slate-800">
                {task.title}
              </h4>
              <p className="text-xs text-slate-500">{task.status}</p>
              <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">{task.date}</p>
              <p className="text-sm font-bold text-blue-600">
                {task.progress}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}