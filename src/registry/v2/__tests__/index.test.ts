import type { ChaiBlockPropsSchema } from "~/types/common";
import { registerChaiBlockProps } from "../..";

describe("registerChaiBlockProps", () => {
  it("should handle empty props", () => {
    const input = {
      properties: {},
    };

    const result = registerChaiBlockProps(input);

    expect(result).toEqual({
      schema: {},
      uiSchema: {},
    });
  });

  it("should extract UI schemas from props", () => {
    const input: ChaiBlockPropsSchema = {
      properties: {
        title: {
          type: "string",
          default: "This is a title",
          ui: { "ui:widget": "textarea" },
        },
        description: {
          type: "string",
          default: "This is a description",
          ui: { "ui:widget": "markdown" },
        },
      },
    };

    const result = registerChaiBlockProps(input);

    expect(result).toEqual({
      schema: {
        properties: {
          title: {
            type: "string",
            default: "This is a title",
          },
          description: {
            type: "string",
            default: "This is a description",
          },
        },
      },
      uiSchema: {
        title: {
          "ui:widget": "textarea",
        },
        description: {
          "ui:widget": "markdown",
        },
      },
    });
  });

  it("should handle mixed props with and without UI schemas", () => {
    const input: ChaiBlockPropsSchema = {
      properties: {
        title: {
          type: "string",
          default: "This is a title",
          ui: {
            "ui:widget": "textarea",
          },
        },
        enabled: {
          type: "boolean",
          default: true,
        },
      },
    };

    const result = registerChaiBlockProps(input);

    expect(result).toEqual({
      schema: {
        properties: {
          title: {
            type: "string",
            default: "This is a title",
          },
          enabled: {
            type: "boolean",
            default: true,
          },
        },
      },
      uiSchema: {
        title: {
          "ui:widget": "textarea",
        },
      },
    });
  });

  it("should handle root level UI schema", () => {
    const input: ChaiBlockPropsSchema = {
      properties: {
        title: {
          type: "string",
          default: "This is a title",
        },
      },
      ui: {
        "ui:order": ["title"],
      },
    };

    const result = registerChaiBlockProps(input);

    expect(result).toEqual({
      schema: {
        properties: {
          title: {
            type: "string",
            default: "This is a title",
          },
        },
      },
      uiSchema: {
        "ui:order": ["title"],
      },
    });
  });

  it("should merge root and prop level UI schemas", () => {
    const input: ChaiBlockPropsSchema = {
      properties: {
        title: {
          type: "string",
          default: "This is a title",
          ui: {
            "ui:widget": "textarea",
          },
        },
      },
      ui: {
        "ui:order": ["title"],
      },
    };

    const result = registerChaiBlockProps(input);

    expect(result).toEqual({
      schema: {
        properties: {
          title: {
            type: "string",
            default: "This is a title",
          },
        },
      },
      uiSchema: {
        "ui:order": ["title"],
        title: {
          "ui:widget": "textarea",
        },
      },
    });
  });

  it("throws error for reserved props", () => {
    expect(() =>
      registerChaiBlockProps({
        properties: {
          _id: { type: "string", default: "This is an id" }, // reserved prop
          normalProp: { type: "string", default: "This is a normal prop" },
        },
      }),
    ).toThrow("Reserved props are not allowed");
  });

  it("throws error for the _variant reserved prop", () => {
    // _variant is injected from the block's registered variants, so a block
    // author must never declare it in the props schema.
    expect(() =>
      registerChaiBlockProps({
        properties: {
          _variant: { type: "string", default: "minimal" },
        },
      }),
    ).toThrow("Reserved props are not allowed");
  });

  it("throws error for runtime props", () => {
    const runtimeProps = ["$loading", "blockProps", "inBuilder", "lang", "draft", "pageProps", "pageData", "children"];
    runtimeProps.forEach((prop) => {
      expect(() =>
        registerChaiBlockProps({
          properties: {
            [prop]: { type: "string", default: "test" },
          },
        }),
      ).toThrow("Runtime props are not allowed in schema");
    });
  });
});
