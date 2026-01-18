import { useParams, useNavigate } from 'react-router-dom';
import { URLImportModal } from './URLImportModal';

/**
 * Component to handle URL import route
 */
export function URLImportHandler() {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();

  const handleImport = () => {
    // Navigate to home after successful import
    navigate('/', { replace: true });
  };

  const handleClose = () => {
    // Navigate to home if user cancels
    navigate('/', { replace: true });
  };

  if (!data) {
    // If no data in URL, redirect to home
    navigate('/', { replace: true });
    return null;
  }

  return (
    <URLImportModal
      isOpen={true}
      onClose={handleClose}
      onImport={handleImport}
      encodedData={data}
    />
  );
}
