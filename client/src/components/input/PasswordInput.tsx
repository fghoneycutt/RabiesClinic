import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

import Button from 'react-bootstrap/Button';

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

      <div className="input-group">
        <input
          type={showPassword ? 'text' : 'password'}
          className="form-control"
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />

        <Button
          variant="outline-secondary"
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
        >
          <FontAwesomeIcon
            icon={showPassword ? faEyeSlash : faEye}
          />
        </Button>
      </div>
    </div>
  );
}