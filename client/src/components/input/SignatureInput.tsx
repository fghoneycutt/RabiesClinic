import { useRef, useState, type PointerEvent } from 'react';
import { Button, Form } from 'react-bootstrap';

export type SignatureValue =
  | { method: 'typed'; value: string }
  | { method: 'drawn'; file: File };

interface SignatureInputProps {
  value: SignatureValue | null;
  onChange: (value: SignatureValue | null) => void;
  disabled?: boolean;
  label?: string;
}

type SignatureMethod = 'typed' | 'drawn' ;

function SignatureInput({
  value,
  onChange,
  disabled = false,
  label = 'Applicant Signature',
}: SignatureInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawingRef = useRef(false);

  const [method, setMethod] = useState<SignatureMethod>(
    value?.method ?? 'drawn'
  );

  const [typedName, setTypedName] = useState(
    value?.method === 'typed' ? value.value : ''
  );

  const changeMethod = (nextMethod: SignatureMethod) => {
    setMethod(nextMethod);
    onChange(null);

    if (nextMethod === 'typed') {
      setTypedName('');
    }

    if (nextMethod === 'drawn') {
      hasDrawingRef.current = false;

      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleTypedChange = (name: string) => {
    setTypedName(name);

    onChange(
      name.trim()
        ? {
            method: 'typed',
            value: name,
          }
        : null
    );
  };

  const getCanvasCoordinates = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const { x, y } = getCanvasCoordinates(event);

    drawingRef.current = true;
    hasDrawingRef.current = true;

    context.beginPath();
    context.moveTo(x, y);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111111';
    context.lineWidth = 3;
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) return;

    event.preventDefault();

    const { x, y } = getCanvasCoordinates(event);

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (!canvas || !hasDrawingRef.current) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File(
        [blob],
        `signature-${Date.now()}.png`,
        { type: 'image/png' }
      );

      onChange({
        method: 'drawn',
        file,
      });
    }, 'image/png');
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    drawingRef.current = false;
    hasDrawingRef.current = false;

    onChange(null);
  };


  return (
    <div className="signature-input">
      <Form.Label>
        <strong>{label}</strong>
      </Form.Label>

      <div
        className="d-flex gap-2 p-1 rounded bg-light mb-3"
        style={{ maxWidth: '380px' }}
        >
        <Button
            type="button"
            variant={method === 'typed' ? 'primary' : 'light'}
            className="flex-fill border-0"
            onClick={() => changeMethod('typed')}
            disabled={disabled}
        >
            <i className="bi bi-type me-2" />
            Type your name
        </Button>

        <Button
            type="button"
            variant={method === 'drawn' ? 'primary' : 'light'}
            className="flex-fill border-0"
            onClick={() => changeMethod('drawn')}
            disabled={disabled}
        >
            <i className="bi bi-pen me-2" />
            Draw signature
        </Button>
        </div>

      {method === 'typed' && (
        <div>
          <Form.Control
            type="text"
            value={typedName}
            onChange={(event) => handleTypedChange(event.target.value)}
            placeholder="Enter your full name"
            disabled={disabled}
          />

          {typedName.trim() && (
            <div className="border rounded bg-white mt-3 p-3 text-center">
              <div
                style={{
                  fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                  fontSize: '2.5rem',
                  color: '#111',
                  overflowWrap: 'anywhere',
                }}
              >
                {typedName}
              </div>
            </div>
          )}
        </div>
      )}

      {method === 'drawn' && (
        <div>
          <div className="border rounded bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={900}
              height={220}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              style={{
                display: 'block',
                width: '100%',
                height: '180px',
                touchAction: 'none',
                cursor: disabled ? 'default' : 'crosshair',
              }}
            />
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">
              Sign above using your mouse, finger, or stylus.
            </small>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={clearDrawing}
              disabled={disabled}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignatureInput;