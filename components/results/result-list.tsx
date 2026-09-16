import React, { FC, JSX } from "react";
import { ResultsUser } from "./results-user";

export const ResultList: FC<Results> = ({ users, totalVotes }): JSX.Element => {
  const firstPlace = users[0];
  const allUsers = users.slice(1);

  return (
    <div className="mx-auto grid max-w-4xl gap-24 lg:grid-cols-2">
      <div>
        <ResultsUser position={1} user={firstPlace} totalVotes={totalVotes} />
      </div>
      <div className="flex flex-col gap-3">
        {allUsers.map((user, index) => (
          <React.Fragment key={user._id}>
            <ResultsUser
              position={index + 2}
              user={user}
              totalVotes={totalVotes}
            />
            {index < allUsers.length - 1 && (
              <hr className="border-t border-white/20" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
