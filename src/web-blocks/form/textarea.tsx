import { InputIcon } from "@radix-ui/react-icons";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type TextAreaProps = {
  fieldName: string;
  showLabel: boolean;
  styles: ChaiStyles;
  inputStyles: ChaiStyles;
  required: boolean;
  rows: number;
  label: string;
  placeholder: string;
  defaultValue: string;
};

const TextAreaBlock = (props: ChaiBlockComponentProps<TextAreaProps>) => {
  const { blockProps, fieldName, label, placeholder, styles, inputStyles, rows, showLabel, required, defaultValue } =
    props;

  if (!showLabel) {
    return (
      <textarea
        name={fieldName}
        {...blockProps}
        {...inputStyles}
        {...styles}
        placeholder={placeholder}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
      />
    );
  }

  return (
    <div {...styles} {...blockProps}>
      {showLabel && <label htmlFor={fieldName}>{label}</label>}
      <textarea
        name={fieldName}
        {...inputStyles}
        placeholder={placeholder}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
};

const Config = {
  type: "TextArea",
  label: "web_blocks.textarea",
  category: "core",
  icon: InputIcon,
  group: "form",
  props: registerChaiBlockProps({
    properties: {
      fieldName: {
        type: "string",
        title: "Field Name",
        default: "fieldName",
      },
      styles: stylesProp(""),
      inputStyles: stylesProp("dt#textarea"),
      showLabel: {
        type: "boolean",
        title: "Show Label",
        default: true,
      },
      label: {
        type: "string",
        title: "Label",
        default: "Label",
        ui: { "ui:widget": "textarea", "ui:autosize": true, "ui:rows": 3 },
      },
      placeholder: {
        type: "string",
        title: "Placeholder",
        default: "Placeholder",
      },
      rows: {
        type: "number",
        title: "Rows",
        default: 3,
      },
      required: {
        type: "boolean",
        title: "Required",
        default: false,
      },
      defaultValue: {
        type: "string",
        title: "Default Value",
        default: "",
        ui: { "ui:widget": "textarea", "ui:autosize": true, "ui:rows": 3 },
      },
    },
  }),
  aiProps: ["label", "placeholder"],
  i18nProps: ["label", "placeholder"],
};

export { TextAreaBlock as Component, Config };
