"use client";
import React, { FC, JSX, useState } from "react";
import { ResultsUser } from "./results-user";

export const ResultList: FC<Results> = ({ users, totalVotes }): JSX.Element => {
  const [showWinner, setShowWinner] = useState<boolean>(false);
  const [showList, setShowList] = useState<boolean>(false);
  const firstPlace = users[0];
  const allUsers = users.slice(1);

  return (
    <div
      className={`mx-auto grid gap-24 ${showList && "max-w-4xl lg:grid-cols-2"}`}
    >
      <div onClick={() => setShowWinner(true)}>
        <ResultsUser
          position={1}
          showImage={true}
          user={firstPlace}
          totalVotes={totalVotes}
          showWinner={showWinner}
        />
      </div>
      {showWinner && !showList && (
        <button
          className="mx-auto w-fit rounded-2xl bg-purple-600 px-6 py-4"
          onClick={() => setShowList(true)}
        >
          Mostrar lista completa
        </button>
      )}
      {showList && (
        <div className="flex flex-col gap-3">
          {allUsers.map((user, index) => (
            <React.Fragment key={user._id}>
              <ResultsUser
                position={index + 2}
                showImage={index === 0}
                user={user}
                totalVotes={totalVotes}
                showWinner={false}
              />
              {index < allUsers.length - 1 && (
                <hr className="border-t border-white/20" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
