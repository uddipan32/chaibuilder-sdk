import { Loader } from "lucide-react";
import { cn } from "~/lib/utils";

export const BlurContainer = ({
  children = null,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 top-[40px] z-[20] flex w-screen flex-col items-center justify-center bg-gradient-to-b from-background/70 to-background/40 backdrop-blur transition-all",
        className,
      )}>
      {children}
    </div>
  );
};

export const Loading = ({ className = "" }: { className?: string }) => {
  return <Loader className={cn("h-5 w-5 animate-spin text-foreground/90", className)} />;
};

export const FullscreenLoader = () => {
  return (
    <div className="bg-surface fixed inset-0 z-[20] flex w-screen flex-col items-center justify-center transition-all">
      <Loading />
    </div>
  );
};
