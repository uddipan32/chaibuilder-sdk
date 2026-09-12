import { WidgetProps } from "@rjsf/utils";
import { debounce } from "lodash-es";

const ColorField = ({ value, onChange, id, onBlur }: WidgetProps) => {
  const throttledChange = debounce(onChange, 200);
  const onChangeCb = (e: React.ChangeEvent<HTMLInputElement>) => throttledChange(e.target.value);
  return (
    <div className="mt-1.5 flex items-center gap-x-3">
      <div className="flex w-3/5 flex-col">
        <input
          type="color"
          className="p-0 text-xs"
          value={value}
          onBlur={({ target: { value: url } }) => onBlur(id, url)}
          onChange={onChangeCb}
        />
      </div>
    </div>
  );
};
export { ColorField };
