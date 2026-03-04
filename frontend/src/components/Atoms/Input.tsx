type Props = {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Input({ type, placeholder, value, onChange }: Props) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: '12px 14px',
        border: '1.5px solid #d0e4f0',
        borderRadius: 8,
        fontSize: 15,
        boxSizing: 'border-box',
      }}
    />
  );
}