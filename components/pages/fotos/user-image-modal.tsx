"use client";

import { CldImage } from "next-cloudinary";
import { useEffect, useState } from "react";
import { useGesture } from "@use-gesture/react";

interface UserImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: User[];
  initialIndex: number;
}

export function UserImageModal({
  isOpen,
  onClose,
  images,
  initialIndex,
}: UserImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const bind = useGesture(
    {
      onDrag: ({ swipe: [swipeX] }) => {
        if (swipeX === -1) {
          // Swipe left
          setCurrentIndex((prevIndex) =>
            prevIndex === images.length - 1 ? 0 : prevIndex + 1,
          );
        } else if (swipeX === 1) {
          // Swipe right
          setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? images.length - 1 : prevIndex - 1,
          );
        }
      },
    },
    { enabled: isOpen },
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        setCurrentIndex((prevIndex) =>
          prevIndex === 0 ? images.length - 1 : prevIndex - 1,
        );
      } else if (event.key === "ArrowRight") {
        setCurrentIndex((prevIndex) =>
          prevIndex === images.length - 1 ? 0 : prevIndex + 1,
        );
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, images.length]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <div
        {...bind()}
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white p-4"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <button
          className="absolute top-8 right-8 cursor-pointer rounded-full bg-orange-400 p-2 text-white hover:text-gray-800"
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <CldImage
          src={currentImage.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
          width={800}
          height={1200}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
          alt={` Foto de ${currentImage.fullName}`}
          className="h-auto max-h-[80vh] w-auto max-w-[80vw] object-contain"
        />
        <div className="mt-2 text-center text-lg font-semibold text-gray-800">
          {currentImage.fullName}
        </div>
        <button
          className="absolute top-1/2 left-2 -translate-y-1/2 transform cursor-pointer rounded-full bg-black/20 p-2 text-white hover:text-gray-300"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prevIndex) =>
              prevIndex === 0 ? images.length - 1 : prevIndex - 1,
            );
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          className="absolute top-1/2 right-2 -translate-y-1/2 transform cursor-pointer rounded-full bg-black/20 p-2 text-white hover:text-gray-300"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prevIndex) =>
              prevIndex === images.length - 1 ? 0 : prevIndex + 1,
            );
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
