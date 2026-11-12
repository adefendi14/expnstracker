import { withBase } from "@/lib/paths";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 32,
  framed = true,
}: {
  className?: string;
  size?: number;
  /** App-icon tile (rounded + fill). Off = bare piggy for hero/auth. */
  framed?: boolean;
}) {
  return (
    <img
      src={withBase(framed ? "/logo.svg" : "/logo-plain.svg")}
      alt=""
      width={size}
      height={size}
      className={cn(
        framed && "rounded-[22%] bg-background ring-1 ring-foreground/10",
        className
      )}
      draggable={false}
    />
  );
}
