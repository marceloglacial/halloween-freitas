"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { UserImageModal } from "./user-image-modal";

interface UserImageModalContextType {
  openModal: (images: PublicUser[], initialIndex: number) => void;
}

const UserImageModalContext = createContext<
  UserImageModalContextType | undefined
>(undefined);

export function UserImageModalProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<PublicUser[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  const openModal = (images: PublicUser[], initialIndex: number) => {
    setModalImages(images);
    setModalInitialIndex(initialIndex);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <UserImageModalContext.Provider value={{ openModal }}>
      {children}
      <UserImageModal
        isOpen={isModalOpen}
        onClose={closeModal}
        images={modalImages}
        initialIndex={modalInitialIndex}
      />
    </UserImageModalContext.Provider>
  );
}

export function useUserImageModal() {
  const context = useContext(UserImageModalContext);
  if (context === undefined) {
    throw new Error(
      "useUserImageModal must be used within a UserImageModalProvider",
    );
  }
  return context;
}
