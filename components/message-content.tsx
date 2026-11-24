import { tokenizeMarkdown } from "@/lib/format";

/** Renders a safe subset of inline markdown. React escapes all text. */
export function MessageContent({ content }: { content: string }) {
  const tokens = tokenizeMarkdown(content);

  return (
    <p className="text-[14.5px] leading-[1.55] break-words whitespace-pre-wrap text-[#d7dbe4]">
      {tokens.map((token, index) => {
        switch (token.type) {
          case "bold":
            return (
              <strong key={index} className="font-semibold text-bright">
                {token.value}
              </strong>
            );
          case "italic":
            return (
              <em key={index} className="italic">
                {token.value}
              </em>
            );
          case "strike":
            return (
              <span key={index} className="line-through opacity-75">
                {token.value}
              </span>
            );
          case "code":
            return (
              <code
                key={index}
                className="rounded border border-line bg-void/70 px-1 py-0.5 font-mono text-[12.5px] text-[#c4b5fd]"
              >
                {token.value}
              </code>
            );
          case "link":
            return (
              <a
                key={index}
                href={token.value}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[#6ba4ff] underline decoration-[#6ba4ff]/40 underline-offset-2 hover:decoration-[#6ba4ff]"
              >
                {token.value.replace(/^https?:\/\//, "")}
              </a>
            );
          default:
            return <span key={index}>{token.value}</span>;
        }
      })}
    </p>
  );
}
