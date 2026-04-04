interface UsdcAmountProps {
  amount: string;
  size?: "sm" | "md" | "lg";
}

export function UsdcAmount({ amount, size = "md" }: UsdcAmountProps) {
  const num = parseFloat(amount);
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sizeClass = {
    sm: "text-sm",
    md: "text-lg font-semibold",
    lg: "text-3xl font-bold",
  }[size];

  return (
    <span className={`${sizeClass} inline-flex items-center gap-1.5`}>
      <span className="text-green-400">$</span>
      {formatted}
      <span className="text-xs text-fd-muted-foreground font-normal">USDC</span>
    </span>
  );
}
