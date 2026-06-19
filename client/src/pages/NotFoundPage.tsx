import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  document.title="404 Error"

  return (
    <div className="d-flex flex-column align-items-center mt-5">
      <h1>404</h1>
      <p className="text-muted">
        Page not found
      </p>

      <Button onClick={() => navigate('/')}>
        Go Home
      </Button>
    </div>
  );
}