type Props = { text: string }

export default function Label({ text }: Props) {
  return (
    <label style={{ display: 'block', color: '#333', marginBottom: 6, fontSize: 14 }}>
      {text}
    </label>
  );
}