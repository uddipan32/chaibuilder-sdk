import { buttonVariants } from "~/components/ui/button";

describe("buttonVariants", () => {
  it.each(["outline", "ghost"] as const)("uses the themed foreground color for %s buttons", (variant) => {
    expect(buttonVariants({ variant })).toContain("text-foreground");
  });
});
