interface Props {
  maxValue: number;
  onSubmit: (value: number) => void;
  disabled: boolean;
}

export function NumberPad({ maxValue, onSubmit, disabled }: Props) {
  const numbers = Array.from({ length: maxValue }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-6 gap-1.5 px-2 max-w-sm mx-auto">
      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onSubmit(n)}
          disabled={disabled}
          className="py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 font-bold text-sm transition-colors"
        >
          {n}
        </button>
      ))}
    </div>
  );
}
