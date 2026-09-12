import { useTranslation } from "react-i18next";
import { useFeatureLabel } from "~/builder/hooks/use-feature-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { DesignTokensProvider, useDesignTokensContext } from "./manage-design-tokens-context";
import { TokenForm } from "./token-form";
import { BuiltInTokensList, CustomTokensList } from "./token-list-components";

interface ManageDesignTokensProps {
  onActiveTokenChange?: (token: { name: string; value: string; id?: string } | null) => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  setCreatePreview?: (value: any) => any;
}

const ManageDesignTokensContent: React.FC = () => {
  const { t } = useTranslation();
  const designTokensLabel = useFeatureLabel("designTokens");
  const { activeTab, setActiveTab, viewMode } = useDesignTokensContext();

  return (
    <div className="flex h-full w-full flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "builtin" | "custom")}>
        <TabsList className="mb-3 w-full">
          <TabsTrigger value="builtin" className="flex-1">
            {t("Built-in")} {designTokensLabel}
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">
            {t("Custom")} {designTokensLabel}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builtin" className="mt-0 flex-1">
          {viewMode === "view" ? <BuiltInTokensList /> : <TokenForm />}
        </TabsContent>

        <TabsContent value="custom" className="mt-0 flex-1">
          {viewMode === "view" ? <CustomTokensList /> : <TokenForm />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ManageDesignTokens: React.FC<ManageDesignTokensProps> = ({
  onActiveTokenChange,
  onDirtyStateChange,
  setCreatePreview,
}) => {
  return (
    <DesignTokensProvider
      onActiveTokenChange={onActiveTokenChange}
      onDirtyStateChange={onDirtyStateChange}
      setCreatePreview={setCreatePreview}>
      <ManageDesignTokensContent />
    </DesignTokensProvider>
  );
};

export default ManageDesignTokens;
