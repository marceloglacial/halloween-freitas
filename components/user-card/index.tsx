import { FC, JSX } from "react";
import { CldImage } from "next-cloudinary";

interface UserCardProps {
  user: PublicUser;
  selected?: boolean;
}

const UserCard: FC<UserCardProps> = ({
  user,
  selected = false,
}): JSX.Element => {
  return (
    <div
      className={
        "grid justify-center overflow-hidden rounded-2xl bg-zinc-800 transition-all " +
        (selected ? "scale-105 ring-4 ring-orange-400" : "")
      }
    >
      <div className="h-40 w-full sm:h-60">
        <CldImage
          width={960}
          height={600}
          sizes="(max-width: 640px) 50vw, 25vw"
          src={user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
          alt={`Foto de ${user.fullName}`}
          className="h-full w-full object-cover"
        />
      </div>
      <span className="p-4 backdrop-blur-lg">{user.fullName}</span>
    </div>
  );
};

export default UserCard;
