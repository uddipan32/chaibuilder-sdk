import { FileTextIcon } from "@radix-ui/react-icons";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import EmptySlot from "~/web-blocks/empty-slot";

export type FormProps = {
  errorMessage: string;
  successMessage: string;
  action: string;
  styles: ChaiStyles;
};

const FormBlock = (props: ChaiBlockComponentProps<FormProps>) => {
  const { children, blockProps, errorMessage, successMessage, action, styles, inBuilder } = props;
  let nestedChildren = children;

  if (!children) {
    nestedChildren = <EmptySlot inBuilder={inBuilder} />;
  }

  const alpineAttrs = {
    "x-data": "{}",
    "x-on:submit.prevent": "post",
  };

  const formResponseAttr = {
    "x-html": "",
    ":class": "{'text-red-500': formStatus === 'ERROR', 'text-green-500': formStatus === 'SUCCESS'}",
  };

  return (
    <form
      {...alpineAttrs}
      data-error={errorMessage}
      data-success={successMessage}
      method={"post"}
      action={action}
      {...blockProps}
      {...styles}>
      <div {...formResponseAttr}></div>
      {nestedChildren}
    </form>
  );
};

const Config = {
  type: "Form",
  label: "Form",
  category: "core",
  icon: FileTextIcon,
  group: "form",
  blocks: () => [
    { _type: "Form", _id: "form", styles: "#styles:p-1 space-y-2," },
    { _type: "Input", _id: "form_input", _parent: "form", styles: "#styles:," },
    {
      _type: "FormButton",
      _id: "form_submit_btn",
      _parent: "form",
      styles: "#styles:bg-black text-white rounded px-3 py-1,",
    },
  ],
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      action: {
        type: "string",
        title: "Submit URL",
        default: "/api/form",
      },
      errorMessage: {
        type: "string",
        title: "Error Message",
        default: "Something went wrong. Please try again",
        ui: { "ui:widget": "richtext" },
      },
      successMessage: {
        type: "string",
        title: "Success Message",
        default: "Thank you for your submission.",
        ui: { "ui:widget": "richtext" },
      },
    },
  }),
  i18nProps: ["errorMessage", "successMessage"],
  aiProps: ["errorMessage", "successMessage"],
  canAcceptBlock: () => true,
};

export { FormBlock as Component, Config };
