import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  compareBindingFieldNames,
  getBindingTypeLabel,
} from "~/builder/core/components/binding-popup/binding-options";
import { BindingExpressionInput } from "~/builder/core/components/binding-popup/expression-input";
import { BindingPipelineEditor } from "~/builder/core/rjsf-widgets/binding-editor/binding-pipeline-editor";
import { isVisibilityCombinatorExpression, validateVisibilityExpression } from "~/render/binding-pipes";

type UserDataBindingProps = {
  currentExpression: string;
  externalData: Record<string, any>;
  isOpen?: boolean;
  onSave: (expression: string) => void;
};

const validateExpression = (expression: string, externalData: Record<string, any>): string | null => {
  const trimmed = expression.trim();
  if (!trimmed) return null;
  // Combinator-aware and short-circuit-independent: every `&&`/`||` branch is structurally
  // validated (so an invalid operand can't hide behind a truthy sibling), while a leaf that
  // only resolves to `undefined` in the preview data is tolerated — the runtime fails closed.
  return validateVisibilityExpression(trimmed, externalData);
};

export const UserDataBinding = ({ currentExpression, externalData, isOpen, onSave }: UserDataBindingProps) => {
  const onSaveRef = useRef(onSave);
  const valueRef = useRef(currentExpression);
  const initialError = validateExpression(currentExpression, externalData);
  const errorRef = useRef<string | null>(initialError);
  const isOpenRef = useRef(isOpen);
  const [value, setValue] = useState(currentExpression);
  const [error, setError] = useState<string | null>(initialError);
  const { t } = useTranslation();

  useEffect(() => {
    setValue(currentExpression);
    setError(validateExpression(currentExpression, externalData));
  }, [currentExpression, externalData]);

  useEffect(() => {
    onSaveRef.current = onSave;
    valueRef.current = value;
    errorRef.current = error;
    isOpenRef.current = isOpen;
  }, [onSave, value, error, isOpen]);

  useEffect(() => {
    return () => {
      if (isOpenRef.current) return;

      const nextValue = valueRef.current?.trim();
      if (!errorRef.current) {
        onSaveRef.current(nextValue);
      }
    };
  }, []);

  const topLevelKeys = useMemo(
    () =>
      Object.entries(externalData ?? {})
        .filter(([key]) => !key.includes("/"))
        .map(([key, val]) => ({
          key,
          type: getBindingTypeLabel(val),
        }))
        .sort((left, right) => compareBindingFieldNames(left.key, right.key)),
    [externalData],
  );

  return (
    <div className="grid gap-2">
      <div>
        <p className="text-muted-foreground mb-1 text-[10px] font-medium">{t("Available databindings:")}</p>
        <div className="flex flex-wrap gap-1">
          {topLevelKeys.map((entry) => (
            <span key={entry.key} className="bg-muted inline-flex items-center rounded px-1.5 py-0.5 text-[10px]">
              <span className="font-medium">{entry.key}</span>
              <span className="text-muted-foreground ml-0.5">: {entry.type}</span>
            </span>
          ))}
        </div>
      </div>

      <BindingExpressionInput
        id="expression"
        value={value}
        externalData={externalData}
        className={`h-8 text-xs ${error ? "border-red-500" : ""}`}
        placeholder="listing.price | gt 0"
        onValueChange={(nextValue) => {
          setValue(nextValue);
          setError(validateExpression(nextValue, externalData));
        }}
        onEnter={() => {
          const validationError = validateExpression(value, externalData);
          setError(validationError);
          if (!validationError) {
            onSave(value.trim());
          }
        }}
      />

      {error && <p className="text-[10px] text-red-500">{error}</p>}
      {/* The pipeline editor only models `path + pipes`; a boolean combination (`a && b`) has no
          such representation, so rendering it there would show the destructive "invalid binding"
          panel over a working condition. Combinators are edited through the raw input above. */}
      {value.trim() && !isVisibilityCombinatorExpression(value) && (
        <BindingPipelineEditor
          expression={value}
          externalData={externalData}
          usage="visibility"
          onChange={(nextValue) => {
            setValue(nextValue);
            setError(validateExpression(nextValue, externalData));
          }}
        />
      )}
    </div>
  );
};
