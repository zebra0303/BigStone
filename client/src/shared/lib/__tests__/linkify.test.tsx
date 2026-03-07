// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LinkifiedText } from "../linkify";

describe("LinkifiedText", () => {
  it("should render plain text without links", () => {
    const { container } = render(<LinkifiedText text="Hello world" />);
    expect(container.textContent).toBe("Hello world");
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("should render null for empty string", () => {
    const { container } = render(<LinkifiedText text="" />);
    expect(container.innerHTML).toBe("");
  });

  it("should convert URL to clickable link", () => {
    const { container } = render(
      <LinkifiedText text="Visit https://example.com for details" />,
    );
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("https://example.com");
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("should handle multiple URLs in text", () => {
    const { container } = render(
      <LinkifiedText text="Check https://a.com and https://b.com please" />,
    );
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("https://a.com");
    expect(links[1].getAttribute("href")).toBe("https://b.com");
  });

  it("should handle text that is only a URL", () => {
    const { container } = render(
      <LinkifiedText text="https://example.com" />,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("https://example.com");
    expect(link!.textContent).toBe("https://example.com");
  });

  it("should handle http (non-https) URLs", () => {
    const { container } = render(
      <LinkifiedText text="Visit http://example.com" />,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("http://example.com");
  });

  it("should not linkify plain email addresses", () => {
    const { container } = render(
      <LinkifiedText text="email@example.com is not a link" />,
    );
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(0);
  });
});
