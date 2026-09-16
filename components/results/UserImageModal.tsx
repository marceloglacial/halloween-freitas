import { CldImage } from "next-cloudinary";
import React from "react";

interface UserImageModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
}

const UserImageModal: React.FC<UserImageModalProps> = ({
  open,
  onClose,
  imageSrc,
}) => {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada do participante"
      className="bg-opacity-70 fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeButtonRef}
          className="absolute -top-2 -right-2 rounded-full bg-white px-3 py-1 text-xl text-black"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
        <CldImage
          src={imageSrc}
          width={900}
          height={600}
          alt="Foto ampliada do participante"
          className="max-h-[80vh] max-w-[90vw] rounded-lg border-4 border-orange-400 object-cover object-top lg:max-h-[90vh] lg:max-w-[680px]"
        />
      </div>
    </div>
  );
};

export default UserImageModal;
