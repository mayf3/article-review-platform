import { DiffLine } from "../types";

interface DiffViewerProps {
  lines: DiffLine[];
}

const rowTone: Record<DiffLine["type"], string> = {
  added: "bg-emerald-50 text-emerald-900",
  removed: "bg-rose-50 text-rose-900",
  context: "bg-white text-slate-700"
};

const marker: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "-",
  context: " "
};

export function DiffViewer({ lines }: DiffViewerProps) {
  if (lines.length === 0) {
    return <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">没有差异。</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="max-h-[520px] overflow-auto">
        {lines.map((line, index) => (
          <div
            key={`${line.type}-${index}-${line.oldLine ?? "n"}-${line.newLine ?? "n"}`}
            className={`grid grid-cols-[3rem_3rem_2rem_minmax(0,1fr)] border-b border-slate-100 font-mono text-xs leading-6 last:border-b-0 ${rowTone[line.type]}`}
          >
            <span className="select-none border-r border-slate-100 px-2 text-right text-slate-400">
              {line.oldLine ?? ""}
            </span>
            <span className="select-none border-r border-slate-100 px-2 text-right text-slate-400">
              {line.newLine ?? ""}
            </span>
            <span className="select-none px-2 text-center font-semibold">{marker[line.type]}</span>
            <span className="min-w-0 whitespace-pre-wrap break-words px-2">{line.text || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
