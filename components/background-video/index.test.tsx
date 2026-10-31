import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BackgroundVideo from "./index";

describe("background video motion preference", () => {
  it("hides the decorative video when reduced motion is requested", () => {
    const html = renderToStaticMarkup(createElement(BackgroundVideo));

    expect(html).toContain("motion-reduce:hidden");
    expect(html).toContain('src="/hero-video.mp4"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("autoPlay=");
    expect(html).toContain("playsInline=");
    expect(html).toContain("loop");
    expect(html).toContain("muted");
  });
});
