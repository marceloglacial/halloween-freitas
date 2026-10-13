import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BackgroundVideo from "./index";

describe("background video motion preference", () => {
  it("hides the decorative video when reduced motion is requested", () => {
    const html = renderToStaticMarkup(createElement(BackgroundVideo));

    expect(html).toContain("motion-reduce:hidden");
    expect(html).toContain('src="/hero-video.mp4"');
  });
});
