import React from "react";

export function LinkifiedText({ text }: { text: string }) {
  if (!text) return null;

  // URL matching regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Split text by URL, returning an array of string segments and URL strings
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="!text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()} // Prevent triggering parent click events (like accordion toggle)
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
