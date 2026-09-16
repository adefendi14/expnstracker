import { withBase } from "@/lib/paths";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src={withBase("/logo.svg")}
      alt=""
      width={size}
      height={size}
      className={cn("rounded-[22%] bg-[#F4F3EF] ring-1 ring-foreground/10", className)}
      draggable={false}
    />
  );
}
