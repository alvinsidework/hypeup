import { createServerFn } from "@tanstack/react-start";

export type BrandAuthOptions = {
  email: boolean;
};

export const getBrandAuthOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readBrandAuthOptions } = await import("./brand-auth.server");
    return readBrandAuthOptions();
  },
);
