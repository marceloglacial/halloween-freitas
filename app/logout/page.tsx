import { SignOutButton } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logout - Halloween dos Freitas",
};

const LogoutPage = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 p-8">
      <h2>Usuário não autorizado.</h2>
      <SignOutButton redirectUrl="/">
        <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
          Logout
        </button>
      </SignOutButton>
    </div>
  );
};
export default LogoutPage;
