import { useTranslation } from "react-i18next";

export const FallbackError = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full rounded-md bg-red-200 p-4 text-red-500">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <p className="font-semibold">{t("Oops! Something went wrong.")}</p>
        <p>{t("Please try again.")}</p>
      </div>
    </div>
  );
};
