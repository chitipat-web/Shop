const colors: Record<number, string> = {
  1: "bg-teal-600",
  2: "bg-amber-500",
};

export default function Avatar({
  name,
  personId,
  size = "h-7 w-7 text-xs",
}: {
  name: string;
  personId: number;
  size?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${size} ${colors[personId] ?? "bg-neutral-400"}`}
    >
      {[...name][0]?.toUpperCase() ?? "?"}
    </span>
  );
}
