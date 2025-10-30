"use client";
import React, { FC, JSX, useState } from "react";
import { ResultsUser } from "./results-user";

export const ResultList: FC<Results> = ({ users, totalVotes }): JSX.Element => {
  const [showList, setShowList] = useState<boolean>(false);

  if (!showList) {
    return (
      <button
        className="mx-auto w-fit rounded-2xl bg-orange-400 px-6 py-4"
        onClick={() => setShowList(true)}
      >
        Mostrar lista completa
      </button>
    );
  }

  return (
    <div className="grid gap-3">
      {users.map((user, index) => (
        <React.Fragment key={user._id}>
          <ResultsUser
            position={index + 2}
            showImage={index === 0}
            user={user}
            totalVotes={totalVotes}
          />
          {index < users.length - 1 && (
            <hr className="border-t border-white/20" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
