import React, { FC, JSX } from "react";
import { ResultsUser } from "./results-user";

export const ResultList: FC<Results> = ({ users, totalVotes }): JSX.Element => {
  const firstPlaceVotes = users[0]?.votes;
  const firstPlaces = users.filter((user) => user.votes === firstPlaceVotes);
  const remainingUsers = users.slice(firstPlaces.length);

  return (
    <div className="mx-auto grid max-w-4xl gap-24 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        {firstPlaces.map((user) => (
          <ResultsUser
            key={user._id}
            position={1}
            user={user}
            totalVotes={totalVotes}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {remainingUsers.map((user, index) => (
          <React.Fragment key={user._id}>
            <ResultsUser
              position={firstPlaces.length + index + 1}
              user={user}
              totalVotes={totalVotes}
            />
            {index < remainingUsers.length - 1 && (
              <hr className="border-t border-white/20" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
