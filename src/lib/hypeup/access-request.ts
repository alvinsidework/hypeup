import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const accessRequestSchema = z.object({
  instagram: z.string().max(40),
  email: z.string().max(200),
  consent: z.boolean(),
  companyWebsite: z.string().max(200).optional(),
});

export const submitAccessRequest = createServerFn({ method: "POST" })
  .validator(accessRequestSchema)
  .handler(async ({ data }) => {
    const { deliverAccessRequest } = await import("./access-request.server");
    return deliverAccessRequest(data);
  });
