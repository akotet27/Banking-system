import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "./Icons";

export default function PageHeader({ title, subtitle, onBack }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-slate-200 sticky top-14 z-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
          aria-label="Go back"
        >
          <ChevronLeftIcon />
        </button>
        <div className="min-w-0">
          <h1 className="font-semibold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
