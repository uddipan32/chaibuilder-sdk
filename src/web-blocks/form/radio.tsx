import { RadiobuttonIcon } from "@radix-ui/react-icons";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type RadioProps = {
  label: string;
  styles: ChaiStyles;
  inputStyles: ChaiStyles;
  required: boolean;
  checked: boolean;
  showLabel: boolean;
  fieldName: string;
};

const RadioBlock = (props: ChaiBlockComponentProps<RadioProps>) => {
  const { blockProps, fieldName, label, styles, inputStyles, required, checked, showLabel = true } = props;

  if (!showLabel)
    return (
      <input
        name={fieldName}
        {...blockProps}
        {...inputStyles}
        {...styles}
        type="radio"
        required={required}
        checked={checked}
      />
    );

  return (
    <div {...styles} {...blockProps}>
      <input {...inputStyles} name={fieldName} type="radio" required={required} defaultChecked={checked} />
      {label && <label htmlFor={fieldName}>{label}</label>}
    </div>
  );
};

const Config = {
  type: "Radio",
  label: "web_blocks.radio",
  category: "core",
  icon: RadiobuttonIcon,
  group: "form",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("flex items-center gap-x-2"),
      inputStyles: stylesProp(""),
      fieldName: {
        type: "string",
        title: "Field Name",
        default: "fieldName",
      },
      label: {
        type: "string",
        title: "Label",
        default: "Label",
      },
      checked: {
        type: "boolean",
        title: "Checked",
        default: false,
      },
      required: {
        type: "boolean",
        title: "Required",
        default: false,
      },
      showLabel: {
        type: "boolean",
        title: "Show Label",
        default: true,
      },
    },
  }),
  aiProps: ["label"],
  i18nProps: ["label"],
};

export { RadioBlock as Component, Config };
