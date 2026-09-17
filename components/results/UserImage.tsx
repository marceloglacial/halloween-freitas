import { CldImage } from "next-cloudinary";
import React from "react";

interface UserImageProps {
  imageSrc: string;
  position: number;
  alt: string;
  onClick: () => void;
}

const UserImage: React.FC<UserImageProps> = ({
  imageSrc,
  position,
  alt,
  onClick,
}) => (
  <button type="button" onClick={onClick} aria-label="Ampliar foto">
    <CldImage
      src={imageSrc}
      width={900}
      height={600}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      alt={alt}
      className={
        position === 1
          ? "h-68 w-68 cursor-pointer rounded-full border-8 border-orange-400 object-cover"
          : "h-12 w-12 cursor-pointer rounded-full border-orange-400 object-cover"
      }
    />
  </button>
);

export default UserImage;
