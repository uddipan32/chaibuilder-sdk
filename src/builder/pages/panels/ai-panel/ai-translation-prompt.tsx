"use client";

import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "~/builder/pages/constants/LANGUAGES";
import { Button } from "~/components/ui/button";

const TranslationPrompts = ({
  selectedLang,
  isLoading,
  selectedBlock,
  onClick,
}: {
  selectedLang: string;
  isLoading?: boolean;
  selectedBlock?: any;
  onClick: (prompt: string, content?: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-col gap-2 ${isLoading ? "pointer-events-none opacity-50" : ""}`}>
        {selectedBlock ? (
          <Button
            variant="outline"
            className="h-auto justify-start px-3 py-2"
            size="sm"
            onClick={() => onClick("TRANSLATE")}>
            <div className="flex flex-col">
              <p className="text-left text-xs font-thin italic">{t("Quick Action:")}</p>
              <span className="flex items-center gap-x-2 text-xs font-light">
                {t("Translate Content")} {t("to")} {LANGUAGES[selectedLang]} <ArrowRight className="!h-3 !w-3" />
              </span>
            </div>
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default TranslationPrompts;
