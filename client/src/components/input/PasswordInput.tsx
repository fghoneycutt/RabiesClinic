
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

type PasswordInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
};

export default function PasswordInput({
  label,
  value,
  onChange,
  required = false,
  autoComplete = 'current-password'
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label className="form-label">
        {label}
        {required}
      </label>

      <div className="position-relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className="form-control pe-5"
          value={value}
          autoComplete={autoComplete}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />

        <button
          type="button"
          className="btn position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent text-secondary d-flex align-items-center justify-content-center"
          style={{
            width: '44px',
            height: '100%',
            zIndex: 5
          }}
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          <FontAwesomeIcon
            icon={showPassword ? faEyeSlash : faEye}
          />
        </button>
      </div>
    </div>
  );
}
