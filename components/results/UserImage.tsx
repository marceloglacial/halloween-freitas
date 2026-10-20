import React from "react";

interface UserImageProps {
  imageSrc: string;
  position: number;
  alt: string;
  name: string;
  onClick: () => void;
}

const UserImage: React.FC<UserImageProps> = ({
  imageSrc,
  position,
  alt,
  name,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Ampliar foto de ${name}`}
    className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={imageSrc}
      width={900}
      height={600}
      loading="lazy"
      decoding="async"
      alt={alt}
      className={
        position === 1
          ? "size-48 cursor-pointer rounded-full border-8 border-orange-400 object-cover sm:size-64"
          : "size-12 cursor-pointer rounded-full border-2 border-orange-400 object-cover"
      }
    />
  </button>
);

export default UserImage;
