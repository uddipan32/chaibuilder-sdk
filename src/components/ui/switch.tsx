import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "~/lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  thumbClassName?: string;
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  ({ className, thumbClassName, ...props }, ref) => (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-4 w-[25px] cursor-pointer items-center rounded-full bg-muted transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary dark:data-[state=unchecked]:bg-background",
        className,
      )}
      ref={ref}
      {...props}>
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-3 w-3 rounded-full bg-secondary shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5",
          thumbClassName,
        )}
      />
    </SwitchPrimitives.Root>
  ),
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
