import { FC, JSX } from "react";
import { getCldImageUrl } from "next-cloudinary";

interface UserCardProps {
  user: User;
}

export const UserCard: FC<UserCardProps> = (props): JSX.Element => {
  const url = getCldImageUrl({
    width: 960,
    height: 600,
    src: props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye",
  });
  return (
    <div className="grid justify-center overflow-hidden rounded-2xl bg-zinc-800">
      <div className="h-60 w-full">
        <img src={url} alt="Photo of User" />
      </div>
      <span className="p-4 backdrop-blur-lg">{props.user.fullName}</span>
    </div>
  );
};
