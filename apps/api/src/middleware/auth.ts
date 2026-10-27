import type { FastifyRequest, FastifyReply } from "fastify";

/** preHandler: rejects the request with 401 unless it carries a valid JWT. */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}
