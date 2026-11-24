import { tokenizeMarkdown } from "@/lib/format";
import { extractMedia, tokenizeMentions } from "@/lib/chat-features";

/**
 * Renders a safe subset of inline markdown plus @mentions and inline media.
 * React escapes all text.
 */
export function MessageContent({
  content,
  selfId,
  onOpenProfile,
}: {
  content: string;
  selfId?: string;
  onOpenProfile?: (userId: string) => void;
}) {
  // ![alt](url) previews and bare image URLs become inline images.
  const media = extractMedia(content);

  return (
    <div className="text-[14.5px] leading-[1.55] break-words whitespace-pre-wrap text-[#d7dbe4]">
      {media.text && (
        <p className="whitespace-pre-wrap">
          <InlineBody content={media.text} selfId={selfId} onOpenProfile={onOpenProfile} />
        </p>
      )}
      {media.images.map((image) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image}
          src={image}
          alt="Attachment preview"
          loading="lazy"
          className="mt-1.5 max-h-[300px] max-w-[420px] rounded-lg border border-line/70 object-cover"
        />
      ))}
    </div>
  );
}

function InlineBody({
  content,
  selfId,
  onOpenProfile,
}: {
  content: string;
  selfId?: string;
  onOpenProfile?: (userId: string) => void;
}) {
  const tokens = tokenizeMentions(content);

  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "mention") {
          const mine = selfId && token.id === selfId;
          const builtin = token.id === "game" || token.id === "time";
          return (
            <span
              key={index}
              role={builtin ? undefined : "link"}
              tabIndex={builtin ? undefined : 0}
              onClick={() => {
                if (!builtin && token.id && onOpenProfile) onOpenProfile(token.id);
              }}
              className={`rounded px-1 py-0.5 font-medium ${
                builtin
                  ? "bg-amber/15 text-amber"
                  : mine
                    ? "bg-blurple/25 text-white"
                    : "bg-blurple/15 text-blurple-soft hover:bg-blurple/25"
              }`}
            >
              @{token.value}
            </span>
          );
        }

        const tokensForMarkdown = tokenizeMarkdown(token.value);
        return (
          <span key={index}>
            {tokensForMarkdown.map((part, partIndex) => {
              switch (part.type) {
                case "bold":
                  return (
                    <strong key={partIndex} className="font-semibold text-bright">
                      {part.value}
                    </strong>
                  );
                case "italic":
                  return (
                    <em key={partIndex} className="italic">
                      {part.value}
                    </em>
                  );
                case "strike":
                  return (
                    <span key={partIndex} className="line-through opacity-75">
                      {part.value}
                    </span>
                  );
                case "code":
                  return (
                    <code
                      key={partIndex}
                      className="rounded border border-line bg-void/70 px-1 py-0.5 font-mono text-[12.5px] text-[#c4b5fd]"
                    >
                      {part.value}
                    </code>
                  );
                case "link":
                  return (
                    <a
                      key={partIndex}
                      href={part.value}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-[#6ba4ff] underline decoration-[#6ba4ff]/40 underline-offset-2 hover:decoration-[#6ba4ff]"
                    >
                      {part.value.replace(/^https?:\/\//, "")}
                    </a>
                  );
                default:
                  return <span key={partIndex}>{part.value}</span>;
              }
            })}
          </span>
        );
      })}
    </>
  );
}
