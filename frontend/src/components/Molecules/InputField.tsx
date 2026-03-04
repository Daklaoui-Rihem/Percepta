import Label from '../Atoms/Label';
import Input from '../Atoms/Input';

type Props = {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function InputField({ label, type, placeholder, value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label text={label} />
      <Input type={type} placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}