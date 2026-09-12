import { InputIcon } from "@radix-ui/react-icons";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type InputProps = {
  fieldName: string;
  showLabel: boolean;
  styles: ChaiStyles;
  inputStyles: ChaiStyles;
  required: boolean;
  inputType: string;
  label: string;
  placeholder: string;
  defaultValue: string;
};

// Extract autocomplete value and determine input type from combined inputType value
export const getInputTypeAndAutocomplete = (inputTypeValue: string): { type: string; autoComplete: string } => {
  // Default values
  const defaults = { type: "text", autoComplete: "on" };

  // If no input type, return defaults
  if (!inputTypeValue) return defaults;

  // Handle basic HTML input types with their corresponding autocomplete values
  const basicTypes = ["text", "password", "number", "hidden", "range", "color", "date", "time"];
  if (basicTypes.includes(inputTypeValue)) {
    return { type: inputTypeValue, autoComplete: "on" };
  }

  // Special cases for email, tel, and url which should have matching autocomplete values
  if (inputTypeValue === "email") {
    return { type: "email", autoComplete: "email" };
  }
  if (inputTypeValue === "tel") {
    return { type: "tel", autoComplete: "tel" };
  }
  if (inputTypeValue === "url") {
    return { type: "url", autoComplete: "url" };
  }

  // Map combined values to input type and autocomplete
  const typeMap: Record<string, { type: string; autoComplete: string }> = {
    // Special cases
    off: { type: "text", autoComplete: "off" },
    on: { type: "text", autoComplete: "on" },

    // Name related
    name: { type: "text", autoComplete: "name" },
    "honorific-prefix": { type: "text", autoComplete: "honorific-prefix" },
    "given-name": { type: "text", autoComplete: "given-name" },
    "additional-name": { type: "text", autoComplete: "additional-name" },
    "family-name": { type: "text", autoComplete: "family-name" },
    "honorific-suffix": { type: "text", autoComplete: "honorific-suffix" },
    nickname: { type: "text", autoComplete: "nickname" },
    firstName: { type: "text", autoComplete: "given-name" },
    lastName: { type: "text", autoComplete: "family-name" },

    // Contact related
    email: { type: "email", autoComplete: "email" },
    tel: { type: "tel", autoComplete: "tel" },
    "tel-country-code": { type: "tel", autoComplete: "tel-country-code" },
    "tel-national": { type: "tel", autoComplete: "tel-national" },
    "tel-area-code": { type: "tel", autoComplete: "tel-area-code" },
    "tel-local": { type: "tel", autoComplete: "tel-local" },
    "tel-extension": { type: "tel", autoComplete: "tel-extension" },

    // Address related
    "street-address": { type: "text", autoComplete: "street-address" },
    "address-line1": { type: "text", autoComplete: "address-line1" },
    "address-line2": { type: "text", autoComplete: "address-line2" },
    "address-line3": { type: "text", autoComplete: "address-line3" },
    "address-level1": { type: "text", autoComplete: "address-level1" },
    "address-level2": { type: "text", autoComplete: "address-level2" },
    "address-level3": { type: "text", autoComplete: "address-level3" },
    "address-level4": { type: "text", autoComplete: "address-level4" },
    country: { type: "text", autoComplete: "country" },
    "country-name": { type: "text", autoComplete: "country-name" },
    "postal-code": { type: "text", autoComplete: "postal-code" },

    // Credit card related
    "cc-name": { type: "text", autoComplete: "cc-name" },
    "cc-given-name": { type: "text", autoComplete: "cc-given-name" },
    "cc-additional-name": { type: "text", autoComplete: "cc-additional-name" },
    "cc-family-name": { type: "text", autoComplete: "cc-family-name" },
    "cc-number": { type: "text", autoComplete: "cc-number" },
    "cc-exp": { type: "text", autoComplete: "cc-exp" },
    "cc-exp-month": { type: "number", autoComplete: "cc-exp-month" },
    "cc-exp-year": { type: "number", autoComplete: "cc-exp-year" },
    "cc-csc": { type: "text", autoComplete: "cc-csc" },
    "cc-type": { type: "text", autoComplete: "cc-type" },

    // Date related
    bday: { type: "date", autoComplete: "bday" },
    "bday-day": { type: "number", autoComplete: "bday-day" },
    "bday-month": { type: "number", autoComplete: "bday-month" },
    "bday-year": { type: "number", autoComplete: "bday-year" },

    // Login related
    username: { type: "text", autoComplete: "username" },
    "new-password": { type: "password", autoComplete: "new-password" },
    "current-password": { type: "password", autoComplete: "current-password" },
    "one-time-code": { type: "text", autoComplete: "one-time-code" },

    // Transaction related
    "transaction-currency": {
      type: "text",
      autoComplete: "transaction-currency",
    },
    "transaction-amount": {
      type: "number",
      autoComplete: "transaction-amount",
    },

    // Other
    url: { type: "url", autoComplete: "url" },
    photo: { type: "url", autoComplete: "photo" },
    sex: { type: "text", autoComplete: "sex" },
    "organization-title": { type: "text", autoComplete: "organization-title" },
    organization: { type: "text", autoComplete: "organization" },
    language: { type: "text", autoComplete: "language" },
  };

  return typeMap[inputTypeValue] || defaults;
};

const InputBlock = (props: ChaiBlockComponentProps<InputProps>) => {
  const {
    blockProps,
    fieldName,
    label,
    placeholder,
    styles,
    inputStyles,
    showLabel,
    required,
    inputType,
    defaultValue,
  } = props;

  // Determine the actual input type and autocomplete value
  const { type: smartInputType, autoComplete: autocomplete } = getInputTypeAndAutocomplete(inputType);

  if (!showLabel) {
    return (
      <input
        name={fieldName}
        {...blockProps}
        {...inputStyles}
        {...styles}
        type={smartInputType}
        placeholder={placeholder}
        required={required}
        autoComplete={autocomplete}
        {...(smartInputType === "hidden" ? { value: defaultValue, readOnly: true } : { defaultValue })}
      />
    );
  }

  return (
    <div {...styles} {...blockProps}>
      {showLabel && <label htmlFor={fieldName}>{label}</label>}
      <input
        id={fieldName}
        name={fieldName}
        {...inputStyles}
        type={smartInputType}
        placeholder={placeholder}
        required={required}
        autoComplete={autocomplete}
        {...(smartInputType === "hidden" ? { value: defaultValue, readOnly: true } : { defaultValue })}
      />
    </div>
  );
};

const Config = {
  type: "Input",
  label: "web_blocks.input",
  category: "core",
  icon: InputIcon,
  group: "form",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      inputStyles: stylesProp("dt#input"),
      fieldName: {
        type: "string",
        title: "Field Name",
        default: "fieldName",
      },
      inputType: {
        type: "string",
        title: "Type",
        default: "email",
        oneOf: [
          // Basic HTML input types
          { const: "text", title: "Text" },
          { const: "email", title: "Email" },
          { const: "password", title: "Password" },
          { const: "number", title: "Number" },
          { const: "tel", title: "Telephone" },
          { const: "hidden", title: "Hidden" },
          { const: "range", title: "Range" },
          { const: "color", title: "Color" },
          { const: "date", title: "Date" },
          { const: "time", title: "Time" },
          { const: "url", title: "URL" },

          // Name related
          { const: "name", title: "Name" },
          { const: "firstName", title: "First Name" },
          { const: "lastName", title: "Last Name" },

          // Contact related
          { const: "tel-country-code", title: "Telephone Country Code" },
          { const: "tel-national", title: "Telephone National" },
          { const: "tel-area-code", title: "Telephone Area Code" },
          { const: "tel-local", title: "Telephone Local" },
          { const: "tel-extension", title: "Telephone Extension" },

          // Address related
          { const: "street-address", title: "Street Address" },
          { const: "address-line1", title: "Address Line 1" },
          { const: "address-line2", title: "Address Line 2" },
          { const: "address-line3", title: "Address Line 3" },
          { const: "address-level1", title: "Address Level 1" },
          { const: "address-level2", title: "Address Level 2" },
          { const: "address-level3", title: "Address Level 3" },
          { const: "address-level4", title: "Address Level 4" },
          { const: "country", title: "Country" },
          { const: "country-name", title: "Country Name" },
          { const: "postal-code", title: "Postal Code" },

          // Credit card related
          { const: "cc-name", title: "Credit Card Name" },
          { const: "cc-number", title: "Credit Card Number" },
          { const: "cc-exp", title: "Credit Card Expiry" },
          { const: "cc-exp-month", title: "Credit Card Expiry Month" },
          { const: "cc-exp-year", title: "Credit Card Expiry Year" },
          { const: "cc-csc", title: "Credit Card CSC" },
          { const: "cc-type", title: "Credit Card Type" },

          // Date related
          { const: "bday", title: "Birthday" },
          { const: "bday-day", title: "Birthday Day" },
          { const: "bday-month", title: "Birthday Month" },
          { const: "bday-year", title: "Birthday Year" },

          // Login related
          { const: "username", title: "Username" },
          { const: "new-password", title: "New Password" },
          { const: "current-password", title: "Current Password" },
          { const: "one-time-code", title: "One Time Code" },

          // Transaction related
          { const: "transaction-currency", title: "Transaction Currency" },
          { const: "transaction-amount", title: "Transaction Amount" },

          // Other
          { const: "url", title: "URL" },
          { const: "photo", title: "Photo" },
          { const: "sex", title: "Sex" },
          { const: "organization-title", title: "Organization Title" },
          { const: "organization", title: "Organization" },
          { const: "language", title: "Language" },
        ],
      },
      showLabel: {
        type: "boolean",
        title: "Show Label",
        default: true,
      },
      label: {
        type: "string",
        title: "Label",
        default: "Label",
        ai: true,
        i18n: true,
      },
      placeholder: {
        type: "string",
        title: "Placeholder",
        default: "Placeholder",
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
      },
    },
  }),
  aiProps: ["label", "placeholder"],
  i18nProps: ["label", "placeholder"],
};

export { InputBlock as Component, Config };
