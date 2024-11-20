import { useState, useCallback } from 'react';

interface UseDialogOptions {
  initialOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useDialog({ initialOpen = false, onOpen, onClose }: UseDialogOptions = {}) {
  const [open, setOpen] = useState(initialOpen);

  const handleOpen = useCallback(() => {
    setOpen(true);
    onOpen?.();
  }, [onOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const handleToggle = useCallback(() => {
    setOpen(prev => !prev);
    if (open) {
      onClose?.();
    } else {
      onOpen?.();
    }
  }, [open, onOpen, onClose]);

  return {
    open,
    handleOpen,
    handleClose,
    handleToggle,
  };
}
