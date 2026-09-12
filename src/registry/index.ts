import { each, get, intersection, isEmpty, keys, omit } from "lodash-es";
import { STYLES_KEY } from "~/constants/STRINGS";
import { ChaiBlockPropsSchema, ChaiBlockRJSFSchemas, ChaiBlockUiSchema } from "~/types/common";

export const registerChaiBlockProps = (blockSchema: ChaiBlockPropsSchema): ChaiBlockRJSFSchemas => {
  const reservedProps = ["_type", "_id", "_parent", "_bindings", "_name", "_variant"];
  const runtimeProps = ["$loading", "blockProps", "inBuilder", "lang", "draft", "pageProps", "pageData", "children"];
  const propsKeys = keys(blockSchema.properties);

  if (intersection(propsKeys, reservedProps).length > 0) {
    throw new Error(`Reserved props are not allowed: ${intersection(propsKeys, reservedProps).join(", ")}`);
  }

  if (intersection(propsKeys, runtimeProps).length > 0) {
    throw new Error(`Runtime props are not allowed in schema: ${intersection(propsKeys, runtimeProps).join(", ")}`);
  }

  const schema = get(blockSchema, "properties", {}) as Record<string, ChaiBlockPropsSchema>;
  const uiSchema = {} as Record<string, ChaiBlockUiSchema>;
  each(schema, (prop, key) => {
    if (!isEmpty(prop.ui)) {
      uiSchema[key] = { ...prop.ui };
      delete schema[key].ui;
    }
  });
  return {
    schema: isEmpty(schema) ? {} : { ...omit(blockSchema, ["ui"]) },
    uiSchema: { ...get(blockSchema, "ui", {}), ...uiSchema },
  };
};

/**
 * Helper to get schema from block config.
 * @internal
 */
export const getBlockSchema = (config: { props?: { schema?: any } }) => {
  return config.props?.schema;
};

/**
 * Helper to get uiSchema from block config.
 * @internal
 */
export const getBlockUiSchema = (config: { props?: { uiSchema?: any } }) => {
  return config.props?.uiSchema;
};

export const stylesProp = (defaultClasses: string = ""): ChaiBlockPropsSchema => {
  return {
    type: "string",
    styles: true,
    default: `${STYLES_KEY},${defaultClasses}`,
    ui: { "ui:widget": "hidden" },
  };
};

export const builderProp = (options: ChaiBlockPropsSchema): ChaiBlockPropsSchema => {
  return {
    builderProp: true,
    ...options,
  };
};

export const defaultChaiStyles = (classes: string) => `${STYLES_KEY},${classes}`;

export * from "./v2/runtime";
export { getRegisteredChaiPipes, registerChaiPipe } from "./pipes";
