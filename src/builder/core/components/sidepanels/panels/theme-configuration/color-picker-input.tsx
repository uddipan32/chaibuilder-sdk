import { debounce } from "lodash-es";

const ColorPickerInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const handleColorChange = debounce((value: string) => onChange(value), 200);

  return (
    <div
      className="relative flex h-5 w-5 cursor-pointer rounded-md border border-border"
      style={{ backgroundColor: value }}>
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => {
          const hexValue = e.target.value;
          if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
            handleColorChange(hexValue);
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer rounded-lg border-0 opacity-0"
      />
    </div>
  );
};

export default ColorPickerInput;
