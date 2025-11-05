"use client";

import { useState } from "react";
import { PhotoCard } from "@/components/pages/fotos/photo-card";
import BackButton from "@/components/back-button";

export default function FotosPage({ users: initialUsers }: { users: User[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const images = initialUsers.filter((user) => user.imageUrl);
  images.sort((a, b) => a.fullName.localeCompare(b.fullName));

  const filteredImages = images.filter((image) =>
    image.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto p-8">
      <BackButton href={"/"} />
      <div className="flex flex-col items-center justify-center gap-8 pt-16 pb-8">
        <h1 className="text-center text-5xl lg:text-7xl">Galeria de Fotos</h1>
        <input
          type="text"
          placeholder="Buscar por nome..."
          className="mb-4 w-full max-w-xl rounded-xl border-2 border-orange-400 px-4 py-2 focus:border-blue-500 focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {filteredImages.length === 0 && (
        <div className="text-center">Nenhuma foto encontrada</div>
      )}

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 2xl:grid-cols-6">
        {filteredImages.map((image, index: number) => (
          <PhotoCard
            key={image.imageUrl}
            user={image}
            images={filteredImages}
            initialIndex={index}
          />
        ))}
      </div>
    </div>
  );
}
