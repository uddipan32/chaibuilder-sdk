import { ButtonIcon } from "@radix-ui/react-icons";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type FormButtonProps = {
  label: string;
  styles: ChaiStyles;
  icon: string;
  iconSize: number;
  iconPos: "order-first" | "order-last";
};

const FormButtonBlock = (props: ChaiBlockComponentProps<FormButtonProps>) => {
  const { blockProps, inBuilder, label, styles, icon, iconSize, iconPos } = props;
  const iconHtml = useInnerHtml(icon);

  return (
    <button {...styles} {...(blockProps || {})} type={inBuilder ? "button" : "submit"} aria-label={label}>
      {label}
      {icon && (
        <div
          style={{ width: iconSize + "px" }}
          className={iconPos + " " + (iconPos === "order-first" ? "mr-2" : "ml-2") || ""}
          dangerouslySetInnerHTML={iconHtml}
        />
      )}
    </button>
  );
};

const Config = {
  type: "FormButton",
  label: "Submit Button",
  category: "core",
  icon: ButtonIcon,
  group: "form",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("dt#btn dt#btn-primary"),
      label: {
        type: "string",
        title: "Label",
        default: "Submit",
        ai: true,
        i18n: true,
      },
      icon: {
        type: "string",
        title: "Icon",
        default: "",
        ui: { "ui:widget": "icon" },
      },
      iconSize: {
        type: "number",
        title: "Icon size",
        default: 24,
      },
      iconPos: {
        type: "string",
        title: "Icon Position",
        default: "order-last",
        enum: ["order-first", "order-last"],
      },
    },
  }),
  i18nProps: ["label"],
  aiProps: ["label"],
};

export { FormButtonBlock as Component, Config };
