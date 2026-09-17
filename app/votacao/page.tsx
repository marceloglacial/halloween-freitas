import BackgroundVideo from "@/components/background-video";
import FeatureUnavailable from "@/components/feature-unavailable";
import VotingLogin from "@/components/votacao/voting-login";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function VotingLoginPage() {
  const event = await getCurrentEvent();
  if (!event || !isVotingOpen(event)) {
    return (
      <FeatureUnavailable
        title="Votação encerrada"
        message="A votação não está aberta no momento."
      />
    );
  }

  return (
    <div className="min-h-screen w-full">
      <BackgroundVideo />
      <VotingLogin />
    </div>
  );
}
