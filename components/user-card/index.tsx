import { FC, JSX } from "react";
import Image from "next/image";

interface UserCardProps {
  user: VotingCandidate;
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
        <Image
          width={960}
          height={600}
          sizes="(max-width: 640px) 50vw, 25vw"
          src={user.imageUrl}
          alt={`Foto de ${user.fullName}`}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
      <span className="p-4 backdrop-blur-lg">{user.fullName}</span>
    </div>
  );
};

export default UserCard;
