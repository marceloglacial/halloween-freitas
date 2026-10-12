import React, { FC, JSX } from "react";
import { ResultsUser } from "./results-user";

export const ResultList: FC<Results> = ({ users, totalVotes }): JSX.Element => {
  const positionByVotes = new Map<number, number>();
  users.forEach((user, index) => {
    if (!positionByVotes.has(user.votes)) {
      positionByVotes.set(user.votes, index + 1);
    }
  });
  const rankedUsers = users.map((user) => ({
    user,
    position: positionByVotes.get(user.votes)!,
  }));

  return (
    <ol
      aria-label="Classificação final"
      className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2 sm:gap-6"
    >
      {rankedUsers.map(({ user, position }) => {
        return (
          <li
            key={user._id}
            className={position === 1 ? "sm:col-span-2" : undefined}
          >
            <ResultsUser
              position={position}
              user={user}
              totalVotes={totalVotes}
            />
          </li>
        );
      })}
    </ol>
  );
};
