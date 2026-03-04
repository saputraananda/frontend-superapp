import { Card } from "../ui/Card";
import { Tag }  from "../ui/Tag";
import { QuickStatusButton } from "./QuickStatusButton";
import { statusOf, priorityOf } from "../../constants/pmConstants";
import { isOverdue, fmtDate, initials } from "../../utils/pmUtils";
import { STATUS_WEIGHT } from "../../constants/pmConstants";

export const TaskCard = ({ task, selected, onSelect, onUpdated }) => {
  const pr   = priorityOf(task.priority);
  const over = isOverdue(task.enddate, task.status);

  return (
    <div role="button" tabIndex={0}
      onClick={() => onSelect(task)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(task)}
      className="w-full text-left cursor-pointer">
      <Card className={["p-4 hover:shadow-md hover:border-slate-300 transition-all",
        task.id === selected ? "border-slate-900 shadow-md ring-1 ring-slate-900" : "",
      ].join(" ")}>
        <div className="flex items-start gap-3">
          <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusOf(task.status).dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-slate-900 text-sm leading-snug">{task.title}</div>
              <Tag className={`${pr.pill} shrink-0`}>{pr.label}</Tag>
            </div>
            {task.desc && <div className="text-xs text-slate-500 line-clamp-1 mb-2">{task.desc}</div>}
            {task.assignees?.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {task.assignees.slice(0, 3).map((a) => (
                  <div key={a.employee_id} className="flex items-center gap-1">
                    <div className="h-5 w-5 rounded-md bg-blue-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                      {initials(a.full_name)}
                    </div>
                    <span className="text-xs text-slate-500 truncate max-w-[80px]">{a.full_name}</span>
                  </div>
                ))}
                {task.assignees.length > 3 && <span className="text-[10px] text-slate-400 font-medium">+{task.assignees.length - 3}</span>}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <QuickStatusButton task={task} onUpdated={onUpdated} />
              <div className={["text-xs", over ? "text-rose-500 font-medium" : "text-slate-400"].join(" ")}>
                {over ? "Overdue · " : ""}{task.enddate ? fmtDate(task.enddate) : "No due date"}
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-sm bg-slate-100 border border-slate-200 overflow-hidden">
                <div className={`h-full ${statusOf(task.status).dot}`}
                  style={{ width: `${(STATUS_WEIGHT[task.status] || 0) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 font-semibold w-7 text-right">
                {Math.round((STATUS_WEIGHT[task.status] || 0) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};