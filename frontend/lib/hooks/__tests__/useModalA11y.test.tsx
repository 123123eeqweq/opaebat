import { render, screen, fireEvent } from '@testing-library/react';
import { useModalA11y } from '../useModalA11y';

function TestModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const ref = useModalA11y(isOpen, onClose, { focusFirstSelector: '[data-first]' });
  if (!isOpen) return null;
  return (
    <div ref={ref} role="dialog">
      <button data-first type="button" onClick={onClose}>
        Close
      </button>
      <button type="button">Second</button>
    </div>
  );
}

describe('useModalA11y', () => {
  it('calls onClose on Escape', () => {
    const onClose = jest.fn();
    render(<TestModal isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when closed', () => {
    const onClose = jest.fn();
    render(<TestModal isOpen={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose for other keys', () => {
    const onClose = jest.fn();
    render(<TestModal isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses first element when open', () => {
    render(<TestModal isOpen onClose={jest.fn()} />);
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(document.activeElement).toBe(closeBtn);
  });
});
