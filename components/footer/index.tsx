import { FC, JSX } from "react";

const Footer: FC = (): JSX.Element => {
  return (
    <footer className="grid justify-center bg-orange-400 p-5 lg:p-10">
      <nav className="flex flex-wrap justify-center gap-2 text-black underline lg:gap-4 lg:text-xl">
        <a
          href="https://github.com/marceloglacial"
          role="link"
          aria-label="link to Marcelo Glacial`s github"
          target="_blank"
        >
          developed by marcelo glacial
        </a>
        <span className="hidden md:inline">|</span>
        <a
          href="https://www.vecteezy.com/video/1625536-mystery-and-spooky-dark-forest-with-lightning-and-moving-clouds"
          role="link"
          aria-label="video by diizlerza"
          target="_blank"
        >
          video by diizlerza
        </a>
      </nav>
    </footer>
  );
};
export default Footer;
