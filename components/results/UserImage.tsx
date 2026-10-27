import React from "react";

interface UserImageProps {
  imageSrc?: string | null;
  podiumPlace?: 1 | 2 | 3;
  alt: string;
  name: string;
  onClick: () => void;
}

const podiumImageSizes: Record<1 | 2 | 3, string> = {
  1: "size-20 sm:size-28 lg:size-36",
  2: "size-16 sm:size-24 lg:size-28",
  3: "size-16 sm:size-24 lg:size-28",
};

const podiumImageBorders: Record<1 | 2 | 3, string> = {
  1: "border-4 border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.45)] sm:border-[5px]",
  2: "border-4 border-slate-200 shadow-[0_0_18px_rgba(226,232,240,0.18)]",
  3: "border-4 border-orange-700 shadow-[0_0_18px_rgba(194,65,12,0.2)]",
};

const UserImage: React.FC<UserImageProps> = ({
  imageSrc,
  podiumPlace,
  alt,
  name,
  onClick,
}) => {
  const imageSize = podiumPlace
    ? podiumImageSizes[podiumPlace]
    : "size-12 sm:size-14";
  const imageBorder = podiumPlace
    ? podiumImageBorders[podiumPlace]
    : "border-2 border-orange-400";
  const image = imageSrc ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        width={900}
        height={600}
        loading="lazy"
        decoding="async"
        alt={alt}
        className={`${imageSize} ${imageBorder} rounded-full object-cover`}
      />
      <span className="sr-only">Ampliar foto de {name}</span>
    </>
  ) : (
    <span
      aria-label={`Foto indisponível para ${name}`}
      className={`${imageSize} ${imageBorder} grid place-items-center rounded-full bg-stone-950/90 px-1 text-center text-[0.6rem] leading-tight text-stone-300 sm:text-xs`}
    >
      Foto indisponível
    </span>
  );

  if (!imageSrc) return image;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ampliar foto de ${name}`}
      className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
    >
      {image}
    </button>
  );
};

export default UserImage;
