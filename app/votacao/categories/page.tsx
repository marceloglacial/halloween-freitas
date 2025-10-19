import Candidates from "@/components/votacao/candidates";
import { cookies } from "next/headers";

export default async function PoolHome() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  let user = { _id: "", fullName: "", email: "", imageUrl: undefined };
  if (userCookie?.value) {
    try {
      user = JSON.parse(userCookie.value);
    } catch {}
  }
  return <Candidates user={user} />;
}
