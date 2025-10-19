import Candidates from "@/components/votacao/candidates";

export default function PoolHome() {
  return (
    <Candidates
      user={{
        _id: "",
        fullName: "",
        email: "",
        imageUrl: undefined,
      }}
    />
  );
}
