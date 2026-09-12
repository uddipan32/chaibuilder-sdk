import { get } from "lodash-es";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useCurrentClassByProperty } from "~/builder/core/components/settings/choices/block-style";
import { DropDown } from "~/builder/core/components/settings/choices/dropdown-choices";
import { StyleContext } from "~/builder/core/components/settings/choices/style-context";
import { useTailwindClassList } from "~/constants/CLASSES_LIST";

export const COLOR_PROP = {
  backgroundColor: "bg",
  textColor: "text",
  borderColor: "border",
  boxShadowColor: "shadow",
  outlineColor: "outline",
  divideColor: "divide",
  fromColor: "from",
  viaColor: "via",
  toColor: "to",
  ringColor: "ring",
  ringOffsetColor: "ring-offset",
};

export const ColorChoice = ({ property, onChange }: any) => {
  const currentClass = useCurrentClassByProperty(property);
  const pureClsName = useMemo(() => get(currentClass, "cls", ""), [currentClass]);

  const { canChange } = useContext(StyleContext);
  const colors = pureClsName.split("-");
  const color = get(colors, "1", "");
  const shade = get(colors, "2", "");

  const [newColor, setNewColor] = useState<{ color: string; shade?: string }>({
    color: "",
    shade: "",
  });

  const shades = useMemo(() => {
    const activeColor = newColor.color || color;
    if (["current", "inherit", "transparent", "black", "white"].includes(activeColor)) {
      return [];
    }
    return ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
  }, [newColor.color, color]);

  const onColorChange = useCallback((color: string) => {
    if (["current", "inherit", "transparent", "black", "white"].includes(color)) {
      setNewColor({ color });
    } else {
      setNewColor((oldColor) => ({
        ...oldColor,
        ...{ color, shade: oldColor.shade ? oldColor.shade : "500" },
      }));
    }
  }, []);

  const onChangeShade = useCallback(
    (shade: string) => {
      setNewColor({ color, ...{ shade } });
    },
    [color],
  );

  const { match } = useTailwindClassList();

  useEffect(() => {
    const prop = get(COLOR_PROP, property, "");
    const cls = `${prop}-${newColor.color}${newColor.shade ? `-${newColor.shade}` : ""}`;
    if (match(property, cls)) {
      onChange(cls, property);
    }
  }, [match, newColor, onChange, property]);

  return (
    <div className="flex flex-row divide-x divide-solid divide-border rounded-lg border border-transparent text-xs">
      <div className="grow text-center">
        <DropDown
          disabled={!canChange}
          rounded
          selected={color}
          onChange={onColorChange}
          options={[
            "current",
            "transparent",
            "primary",
            "secondary",
            "black",
            "white",
            "slate",
            "gray",
            "zinc",
            "neutral",
            "stone",
            "red",
            "orange",
            "amber",
            "yellow",
            "lime",
            "green",
            "emerald",
            "teal",
            "cyan",
            "sky",
            "blue",
            "indigo",
            "violet",
            "purple",
            "fuchsia",
            "pink",
            "rose",
          ]}
        />
      </div>
      <button type="button" className="grow text-center">
        <DropDown rounded selected={shade} disabled={!color || !canChange} onChange={onChangeShade} options={shades} />
      </button>
    </div>
  );
};
