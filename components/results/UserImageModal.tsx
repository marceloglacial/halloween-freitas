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
  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="bg-opacity-70 fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
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
          alt="User Image Large"
          className="max-h-[80vh] max-w-[90vw] rounded-lg border-4 border-orange-400 object-cover object-top lg:max-h-[90vh] lg:max-w-[680px]"
        />
      </div>
    </div>
  );
};

export default UserImageModal;
