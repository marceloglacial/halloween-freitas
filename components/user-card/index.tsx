import { FC, JSX } from "react";
import { getCldImageUrl } from "next-cloudinary";

interface UserCardProps {
  user: User;
  selected?: boolean;
}

const UserCard: FC<UserCardProps> = ({
  user,
  selected = false,
}): JSX.Element => {
  const url = getCldImageUrl({
    width: 960,
    height: 600,
    src: user.imageUrl || "halloween-freitas/apple-icon_fqkaye",
  });
  return (
    <div
      className={
        "grid justify-center overflow-hidden rounded-2xl bg-zinc-800 transition-all " +
        (selected ? "scale-105 ring-4 ring-orange-400" : "")
      }
    >
      <div className="h-40 w-full lg:h-60">
        <img src={url} alt="Photo of User" />
      </div>
      <span className="p-4 backdrop-blur-lg">{user.fullName}</span>
    </div>
  );
};

export default UserCard;
