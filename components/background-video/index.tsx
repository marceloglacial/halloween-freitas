import { FC, JSX } from "react";

const BackgroundVideo: FC = (): JSX.Element => {
  return (
    <video
      autoPlay
      playsInline
      loop
      muted
      className="absolute inset-0 top-0 left-0 -z-10 h-full w-full object-cover"
      src="/hero-video.mp4"
    />
  );
};

export default BackgroundVideo;
