import { useTranslation } from "react-i18next";
import { sanitizeClasses } from "~/builder/core/functions/SanitizeClasses";

interface DesignTokenPreviewProps {
  activeToken?: {
    name: string;
    value: string;
    id?: string;
  } | null;
}

export const DesignTokenPreview = ({ activeToken }: DesignTokenPreviewProps) => {
  const { t } = useTranslation();

  // Sanitize token value to prevent XSS attacks
  const safeTokenValue = activeToken?.value ? sanitizeClasses(activeToken.value) : "";

  return (
    <div className="max-h-2/5 flex h-2/5 w-full items-start justify-center overflow-auto rounded-md border-transparent bg-background/80 p-2">
      <div className={safeTokenValue || undefined}>{t("Sample text with token styles applied")}</div>
    </div>
  );
};
