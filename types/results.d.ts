interface ResultPageParams {
  id: string;
}

interface ResultPageProps {
  params: ResultPageParams;
}

type Results = {
  users: UserWithVotes[];
  totalVotes: number;
};
