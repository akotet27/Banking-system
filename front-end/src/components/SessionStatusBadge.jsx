const STATUS_STYLES = {
  pending:   "bg-yellow-100 text-yellow-800",
  approved:  "bg-green-100  text-green-800",
  completed: "bg-blue-100   text-blue-800",
  expired:   "bg-red-100    text-red-800",
};

export default function SessionStatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {status?.toUpperCase()}
    </span>
  );
}
