import { Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/StateViews';

export function NotFoundPage({ message = "The page you're looking for doesn't exist." }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="Not found"
      description={message}
      action={<Button variant="light" onClick={() => navigate('/')}>Go to dashboard</Button>}
    />
  );
}
