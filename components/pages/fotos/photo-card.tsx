"use client";
import { CldImage } from "next-cloudinary";
import { useUserImageModal } from "./user-image-modal-provider";

interface PhotoCardProps {
  user: PublicUser;
  images: PublicUser[];
  initialIndex: number;
}

export function PhotoCard({ user, images, initialIndex }: PhotoCardProps) {
  const { openModal } = useUserImageModal();

  const handleOpenModal = () => {
    openModal(images, initialIndex);
  };

  return (
    <button
      type="button"
      key={user._id}
      className="cursor-pointer overflow-hidden rounded-lg bg-purple-600 shadow-md"
      onClick={handleOpenModal}
      aria-label={`Abrir foto de ${user.fullName}`}
    >
      <div className="relative h-60 w-full lg:h-80">
        <CldImage
          src={user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
          width={300}
          height={400}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          alt={`Foto de ${user.fullName}`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex min-h-16 items-center justify-center p-3 lg:p-4">
        <span className="text-center text-sm font-semibold text-white">
          {user.fullName}
        </span>
      </div>
    </button>
  );
}
