export async function fetchData(path: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/${path}`,
    { cache: "force-cache" },
  );
  if (res.ok) return res.json();
  return null;
}
