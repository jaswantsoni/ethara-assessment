import Modal from './Modal';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({ message, onConfirm, onCancel, loading }: Props) {
  return (
    <Modal title="Confirm Action" onClose={onCancel}>
      <p style={{ marginBottom: '1.5rem' }}>{message}</p>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}
