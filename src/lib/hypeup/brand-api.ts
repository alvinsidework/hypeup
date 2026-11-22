import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { getBrandIdentity } from "./brand-auth.server";
import {
  getBrandAccount,
  getBrandContract,
  hasBrandFavorite,
  listBrandFavorites,
  listBrandInquiries,
  listBrandTemplates,
  putBrandContract,
  putBrandTemplate,
  removeBrandTemplate,
  replaceBrandFavorite,
} from "./brand-repo.server";
import {
  EMPTY_BRAND_CONTRACT,
  MAX_BRAND_SIGNATURE_LENGTH,
} from "./brand-types";
import { getBrandThreadById } from "./lens-repo";
import {
  parseTerms,
  todaySeoul,
  validateUsername,
  type TermsInput,
} from "./lens-rules";

const loginRequired = {
  ok: false as const,
  error: "브랜드 로그인이 필요합니다.",
};

async function currentBrand() {
  setResponseHeader("Cache-Control", "private, no-store");
  const identity = await getBrandIdentity();
  return identity ? getBrandAccount(identity) : null;
}

export const getBrandWorkspace = createServerFn({ method: "GET" }).handler(
  async () => {
    const brand = await currentBrand();
    if (!brand) {
      return {
        account: null,
        inquiries: [],
        favorites: [],
        templates: [],
        details: EMPTY_BRAND_CONTRACT,
      };
    }
    const { id, ...account } = brand;
    const [inquiries, favorites, templates, details] = await Promise.all([
      listBrandInquiries(id),
      listBrandFavorites(id),
      listBrandTemplates(id),
      getBrandContract(id),
    ]);
    return { account, inquiries, favorites, templates, details };
  },
);

export const getBrandConversation = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const brand = await currentBrand();
    if (!brand) return { signedIn: false as const, desk: null, templates: [] };
    const desk = await getBrandThreadById(brand.id, data.id);
    return {
      signedIn: true as const,
      desk,
      templates: desk ? await listBrandTemplates(brand.id) : [],
    };
  });

export const getBrandFavorite = createServerFn({ method: "GET" })
  .validator(z.object({ username: z.string().max(24) }))
  .handler(async ({ data }) => {
    const username = validateUsername(data.username);
    if (!username.ok) return null;
    const brand = await currentBrand();
    return brand
      ? { saved: await hasBrandFavorite(brand.id, username.username) }
      : null;
  });

export const setBrandFavorite = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().max(24), saved: z.boolean() }))
  .handler(async ({ data }) => {
    const brand = await currentBrand();
    if (!brand) return loginRequired;
    const username = validateUsername(data.username);
    if (
      !username.ok ||
      !(await replaceBrandFavorite(brand.id, username.username, data.saved))
    ) {
      return { ok: false as const, error: "공개 페이지를 찾지 못했습니다." };
    }
    return { ok: true as const, saved: data.saved };
  });

export const saveBrandTemplate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(60),
      terms: z.unknown(),
    }),
  )
  .handler(async ({ data }) => {
    const brand = await currentBrand();
    if (!brand) return loginRequired;
    const parsed = parseTerms((data.terms ?? {}) as TermsInput);
    if (!parsed.ok) return parsed;
    const template = await putBrandTemplate(brand.id, {
      id: data.id,
      name: data.name,
      terms: parsed.terms,
    });
    return template
      ? { ok: true as const, template }
      : { ok: false as const, error: "템플릿을 찾지 못했습니다." };
  });

export const deleteBrandTemplate = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const brand = await currentBrand();
    if (!brand) return loginRequired;
    return (await removeBrandTemplate(brand.id, data.id))
      ? { ok: true as const }
      : { ok: false as const, error: "템플릿을 찾지 못했습니다." };
  });

const detailsSchema = z.object({
  kind: z.enum(["individual", "company"]),
  legalName: z.string().trim().max(80),
  birthDate: z.string().max(10),
  registrationNumber: z.string().trim().max(16),
  phone: z.string().trim().max(24),
  address: z.string().trim().max(240),
  signature: z.string().max(MAX_BRAND_SIGNATURE_LENGTH).nullable(),
});

function validBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= todaySeoul()
  );
}

function validSignature(value: string): boolean {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value,
  );
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.toString("base64") !== match[2]) return false;
  if (match[1] === "jpeg") {
    return (
      bytes.length >= 10 &&
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) &&
      bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]))
    );
  }
  return (
    bytes.length >= 33 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.subarray(12, 16).toString("ascii") === "IHDR" &&
    bytes.subarray(-8, -4).toString("ascii") === "IEND"
  );
}

export const saveBrandDetails = createServerFn({ method: "POST" })
  .validator(detailsSchema)
  .handler(async ({ data }) => {
    const brand = await currentBrand();
    if (!brand) return loginRequired;
    const birthDate = data.kind === "individual" ? data.birthDate : "";
    const registrationNumber =
      data.kind === "company"
        ? data.registrationNumber.replace(/[ -]/g, "")
        : "";
    if (birthDate && !validBirthDate(birthDate)) {
      return { ok: false as const, error: "생년월일을 확인해 주세요." };
    }
    if (registrationNumber && !/^\d{10}$/.test(registrationNumber)) {
      return {
        ok: false as const,
        error: "사업자등록번호는 숫자 10자리입니다.",
      };
    }
    if (
      data.phone &&
      (!/^[+\d ()-]+$/.test(data.phone) ||
        !/^\d{9,15}$/.test(data.phone.replace(/\D/g, "")))
    ) {
      return { ok: false as const, error: "전화번호를 확인해 주세요." };
    }
    if (data.signature && !validSignature(data.signature)) {
      return {
        ok: false as const,
        error: "서명을 이미지로 다시 등록해 주세요.",
      };
    }
    const details = { ...data, birthDate, registrationNumber };
    await putBrandContract(brand.id, details);
    return { ok: true as const, details };
  });
