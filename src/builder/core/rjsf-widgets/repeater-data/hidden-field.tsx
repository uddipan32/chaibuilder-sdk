/**
 * RJSF field that renders nothing. Used to reliably hide array-type props
 * (`"ui:widget": "hidden"` only works for scalars).
 */
const HiddenField = () => null;

export { HiddenField };
