import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface TranslationWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  isPending?: boolean;
  title?: string;
  description?: string;
}
const TranslationWarningModal = ({
  isOpen,
  onClose,
  onContinue,
  isPending = false,
  title = "Translation Warning",
  description = "Some blocks need translations before publishing. Do you want to continue anyway?",
}: TranslationWarningModalProps) => {
  const handleCancel = () => {
    onClose();
  };

  const handleContinue = () => {
    onContinue();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button loading={isPending} onClick={handleContinue}>
              Continue Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default TranslationWarningModal;
