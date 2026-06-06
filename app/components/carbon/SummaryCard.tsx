interface Props {
  title: string;
  value: string;
  color?: string;
}

export default function SummaryCard({
  title,
  value,
  color,
}: Props) {
  return (
    <div
      className="
      bg-white
      rounded-2xl
      border
      border-gray-100
      shadow-sm
      p-5
      "
      style={{
        borderLeft: color
          ? `4px solid ${color}`
          : undefined,
      }}
    >
      <p
        className="
        text-xs
        uppercase
        font-semibold
        tracking-wide
        text-gray-400
        "
      >
        {title}
      </p>

      <h3 className="mt-2 text-xl font-bold">
        {value}
      </h3>
    </div>
  );
}