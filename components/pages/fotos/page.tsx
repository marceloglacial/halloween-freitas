"use client";

import { useState } from "react";
import { PhotoCard } from "@/components/pages/fotos/photo-card";

export default function FotosPage({ users: initialUsers }: { users: User[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const images = initialUsers.filter((user) => user.imageUrl);
  images.sort((a, b) => a.fullName.localeCompare(b.fullName));

  const filteredImages = images.filter((image) =>
    image.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center justify-center gap-8 pb-8">
        <h1 className="text-center text-7xl">Galeria de Fotos</h1>
        <input
          type="text"
          placeholder="Buscar por nome..."
          className="mb-4 w-full max-w-xl rounded-xl border-2 border-orange-400 px-4 py-2 focus:border-blue-500 focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
