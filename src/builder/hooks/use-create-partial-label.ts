import { filter } from "lodash-es";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTypes } from "~/builder/pages/hooks/project/use-page-types";

export const useCreatePartialLabel = () => {
  const { t } = useTranslation();
  const { data: pageTypes } = usePageTypes();

  const partialTypes = useMemo(() => {
    return filter(pageTypes, (type) => type.hasSlug === false && type.key !== "_layout");
  }, [pageTypes]);

  return partialTypes?.length === 1 ? t("Create {{name}}", { name: partialTypes[0].name }) : t("Create Partial Block");
};

export const useSearchLabel = (category: string = "pages") => {
  const { t } = useTranslation();
  const { data: pageTypes } = usePageTypes();
  const partialTypes = useMemo(() => {
    return filter(pageTypes, (type) => type.hasSlug === false && type.key !== "_layout");
  }, [pageTypes]);
  if (category === "pages") {
    return t("Search Pages");
  }

  if (category === "layouts") {
    return t("Search Layouts");
  }

  return partialTypes?.length === 1 ? t("Search {{name}}", { name: partialTypes[0].name }) : t("Search Partials");
};

export const usePartialTabLabel = () => {
  const { t } = useTranslation();
  const { data: pageTypes } = usePageTypes();
  const partialTypes = useMemo(() => {
    return filter(pageTypes, (type) => type.hasSlug === false && type.key !== "_layout");
  }, [pageTypes]);

  return partialTypes?.length === 1 ? t("{{name}}s", { name: partialTypes[0].name }) : t("Partials");
};
