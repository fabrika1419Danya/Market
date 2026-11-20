import { getCurrentUser } from "@/lib/auth";
import { subscribeUserChat } from "@/lib/chatBus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(false);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId: user.id })}\n\n`)
      );

      const unsubscribe = subscribeUserChat(user.id, (msg) => {
        controller.enqueue(
          encoder.encode(`event: message\ndata: ${JSON.stringify(msg)}\n\n`)
        );
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
