import Form from 'react-bootstrap/Form';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  isInvalid?: boolean;
  name?: string;
};

export default function PhoneNumberInput({
  value,
  onChange,
  onBlur,
  isInvalid = false,
  name = 'phone_number'
}: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Strip all non-digits
    input = input.replace(/\D/g, '');

    // Remove leading country code if present
    if (input.startsWith('1') && input.length > 10) {
      input = input.substring(1);
    }

    // Limit to 10 digits
    input = input.substring(0, 10);

    let formatted = '';

    if (input.length === 0) {
      formatted = '';
    } else if (input.length <= 3) {
      formatted = `(${input}`;
    } else if (input.length <= 6) {
      formatted = `(${input.slice(0, 3)}) ${input.slice(3)}`;
    } else {
      formatted = `(${input.slice(0, 3)}) ${input.slice(
        3,
        6
      )}-${input.slice(6)}`;
    }

    onChange(formatted);
  };

  return (
    <Form.Control
      type="tel"
      name={name}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      isInvalid={isInvalid}
      maxLength={14}
      autoComplete="tel"
      inputMode="tel"
    />
  );
}