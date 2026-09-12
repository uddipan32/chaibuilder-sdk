import { CursorTextIcon } from "@radix-ui/react-icons";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import { addForcedClasses } from "./helper";

export type RichTextProps = {
  styles: ChaiStyles;
  content: string;
};

const RichTextBlock = (props: ChaiBlockComponentProps<RichTextProps>) => {
  const { blockProps, content, styles } = props;
  const innerHtml = useInnerHtml(content);

  const forcedStyles = addForcedClasses(styles, "rte");

  return <div {...blockProps} {...forcedStyles} dangerouslySetInnerHTML={innerHtml}></div>;
};

const Config = {
  type: "RichText",
  description: "A rich text block",
  label: "Rich Text",
  hidden: true,
  category: "core",
  icon: CursorTextIcon,
  group: "typography",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      content: {
        type: "string",
        title: "Content",
        default: "<p>This is a rich text block. You can add text, and other content here.</p>",
        ui: { "ui:widget": "richtext" },
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
};

export { RichTextBlock as Component, Config };
