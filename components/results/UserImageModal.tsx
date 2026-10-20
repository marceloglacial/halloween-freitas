import React from "react";

interface UserImageModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
}

const UserImageModal: React.FC<UserImageModalProps> = ({
  open,
  onClose,
  imageSrc,
  imageAlt,
}) => {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={imageAlt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative flex max-h-[92vh] max-w-[92vw] items-center justify-center"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="absolute -top-2 -right-2 rounded-full bg-white px-3 py-1 text-xl text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          width={900}
          height={600}
          decoding="async"
          alt={imageAlt}
          className="max-h-[84vh] max-w-[90vw] rounded-lg border-4 border-orange-400 object-contain"
        />
      </div>
    </div>
  );
};

export default UserImageModal;
