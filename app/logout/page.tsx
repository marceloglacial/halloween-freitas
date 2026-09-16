import LogoutButton from "@/components/logout-button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logout - Halloween dos Freitas",
};

export const dynamic = "force-dynamic";

const LogoutPage = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 p-8">
      <h2>Usuário não autorizado.</h2>
      <LogoutButton className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60" />
    </div>
  );
};
export default LogoutPage;
