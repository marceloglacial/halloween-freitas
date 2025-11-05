import { getUsers } from "@/util/get-users";
import FotosPage from "@/components/pages/fotos/page";

export default async function FotosServerPage() {
  const users = await getUsers();
  return <FotosPage users={users} />;
}
