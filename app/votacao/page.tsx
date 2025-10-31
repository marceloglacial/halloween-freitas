import BackgroundVideo from "@/components/background-video";

export default function PoolHome() {
  return (
    <div className="min-h-screen w-full">
      <BackgroundVideo />
      <section className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-7xl lg:text-8xl">
          Halloween <br />
          Dos Freitas
        </h1>
        <p> Ainda não ...</p>
      </section>
    </div>
  );
}
