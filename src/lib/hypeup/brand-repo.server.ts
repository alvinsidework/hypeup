import { getSql } from "@/lib/db";
import type { getBrandIdentity } from "./brand-auth.server";
import {
  EMPTY_BRAND_CONTRACT,
  type BrandAccountSummary,
  type BrandContractDetails,
  type BrandFavorite,
  type BrandInquirySummary,
  type BrandProposalTemplate,
} from "./brand-types";
import { decryptToken, encryptToken, newId } from "./crypto.server";
import { termsToInput, trustForEmail, type Terms } from "./lens-rules";

type Identity = NonNullable<Awaited<ReturnType<typeof getBrandIdentity>>>;
type BrandAccount = BrandAccountSummary & { id: string };
type BrandRow = { id: string; contact_name: string; company: string };
type BrandPageRow = {
  username: string | null;
  display_name: string | null;
  profile_photo_key: string | null;
  profile_picture_url: string | null;
};

async function brandBySubject(subject: string): Promise<BrandRow | undefined> {
  const sql = await getSql();
  const [row] = await sql.query<BrandRow>(
    `select b.id, b.contact_name, b.company
     from hypeup_brand_account a join hypeup_brand b on b.id = a.brand_id
     where a.auth_subject = $1`,
    [subject],
  );
  return row;
}

export async function getBrandAccount(
  identity: Identity,
): Promise<BrandAccount | null> {
  const email = identity.email.trim().toLowerCase();
  let brand = await brandBySubject(identity.subject);
  if (!brand) {
    const sql = await getSql();
    await sql.query(
      `insert into hypeup_brand (id, email, contact_name, company, trust)
       values ($1, $2, $3, '', $4) on conflict (email) do nothing`,
      [newId(), email, identity.name.trim().slice(0, 40), trustForEmail(email)],
    );
    // Only a verified Supabase identity can claim inquiries started with this email.
    await sql.query(
      `insert into hypeup_brand_account (brand_id, auth_subject)
       select id, $1 from hypeup_brand where email = $2 on conflict do nothing`,
      [identity.subject, email],
    );
    brand = await brandBySubject(identity.subject);
  }
  return brand
    ? {
        id: brand.id,
        email,
        contactName: brand.contact_name,
        company: brand.company,
      }
    : null;
}

function avatar(row: BrandPageRow): string | null {
  return row.profile_photo_key
    ? `/api/lens/profile-photo?key=${encodeURIComponent(row.profile_photo_key)}`
    : row.profile_picture_url;
}

export async function listBrandInquiries(
  brandId: string,
): Promise<BrandInquirySummary[]> {
  const sql = await getSql();
  const rows = await sql.query<
    BrandPageRow & {
      id: string;
      name: string;
      last_body: string | null;
      last_message_at: Date | string;
    }
  >(
    `select t.id, case when p.is_public then p.username end as username,
       case when p.is_public then p.display_name end as display_name,
       case when p.is_public then p.profile_photo_key end as profile_photo_key,
       u.profile_picture_url,
       coalesce(case when p.is_public then nullif(p.display_name, '') end, u.name, u.username) as name,
       t.last_message_at, (select m.body from hypeup_message m where m.thread_id = t.id
         order by m.created_at desc, m.id desc limit 1) as last_body
     from hypeup_thread t
     join hypeup_user u on u.id = t.user_id
     left join hypeup_page p on p.user_id = t.user_id
     where t.brand_id = $1
     order by t.last_message_at desc, t.id`,
    [brandId],
  );
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: avatar(row),
    lastBody: row.last_body ?? "",
    lastAt: new Date(row.last_message_at).toISOString(),
  }));
}

export async function listBrandFavorites(
  brandId: string,
): Promise<BrandFavorite[]> {
  const sql = await getSql();
  const rows = await sql.query<
    BrandPageRow & { username: string; bio: string }
  >(
    `select p.username, p.display_name, p.bio, p.profile_photo_key, u.profile_picture_url
     from hypeup_brand_favorite f
     join hypeup_page p on p.user_id = f.user_id
     join hypeup_user u on u.id = p.user_id
     where f.brand_id = $1 and p.is_public and p.username is not null
     order by f.created_at desc, p.username`,
    [brandId],
  );
  return rows.map((row) => ({
    username: row.username,
    name: row.display_name || row.username,
    avatarUrl: avatar(row),
    bio: row.bio,
  }));
}

export async function hasBrandFavorite(
  brandId: string,
  username: string,
): Promise<boolean> {
  const sql = await getSql();
  const [row] = await sql.query(
    `select 1 from hypeup_brand_favorite f join hypeup_page p on p.user_id = f.user_id
     where f.brand_id = $1 and p.username = $2 and p.is_public`,
    [brandId, username],
  );
  return Boolean(row);
}

export async function replaceBrandFavorite(
  brandId: string,
  username: string,
  saved: boolean,
): Promise<boolean> {
  const sql = await getSql();
  if (saved) {
    const [row] = await sql.query(
      `insert into hypeup_brand_favorite (brand_id, user_id)
       select $1, user_id from hypeup_page where username = $2 and is_public
       on conflict (brand_id, user_id) do nothing returning user_id`,
      [brandId, username],
    );
    return Boolean(row) || hasBrandFavorite(brandId, username);
  }
  await sql.query(
    `delete from hypeup_brand_favorite f using hypeup_page p
     where f.user_id = p.user_id and f.brand_id = $1 and p.username = $2`,
    [brandId, username],
  );
  return true;
}

type TemplateRow = { id: string; name: string; terms: Terms };

function brandTemplate(row: TemplateRow): BrandProposalTemplate {
  return { id: row.id, name: row.name, terms: termsToInput(row.terms) };
}

export async function listBrandTemplates(
  brandId: string,
): Promise<BrandProposalTemplate[]> {
  const sql = await getSql();
  const rows = await sql.query<TemplateRow>(
    `select id, name, terms from hypeup_brand_template where brand_id = $1
     order by updated_at desc, id`,
    [brandId],
  );
  return rows.map(brandTemplate);
}

export async function putBrandTemplate(
  brandId: string,
  input: { id?: string; name: string; terms: Terms },
): Promise<BrandProposalTemplate | null> {
  const sql = await getSql();
  const payload = JSON.stringify(input.terms);
  const [row] = input.id
    ? await sql.query<TemplateRow>(
        `update hypeup_brand_template set name = $3, terms = $4::jsonb, updated_at = now()
         where id = $1 and brand_id = $2 returning id, name, terms`,
        [input.id, brandId, input.name, payload],
      )
    : await sql.query<TemplateRow>(
        `insert into hypeup_brand_template (id, brand_id, name, terms)
         values ($1, $2, $3, $4::jsonb) returning id, name, terms`,
        [newId(), brandId, input.name, payload],
      );
  return row ? brandTemplate(row) : null;
}

export async function removeBrandTemplate(
  brandId: string,
  id: string,
): Promise<boolean> {
  const sql = await getSql();
  const [row] = await sql.query(
    "delete from hypeup_brand_template where brand_id = $1 and id = $2 returning id",
    [brandId, id],
  );
  return Boolean(row);
}

export function unpackBrandContract(cipher: string): BrandContractDetails {
  return JSON.parse(decryptToken(cipher)) as BrandContractDetails;
}

export async function getBrandContract(
  brandId: string,
): Promise<BrandContractDetails> {
  const sql = await getSql();
  const [row] = await sql.query<{ contract_cipher: string | null }>(
    "select contract_cipher from hypeup_brand_account where brand_id = $1",
    [brandId],
  );
  return row?.contract_cipher
    ? unpackBrandContract(row.contract_cipher)
    : { ...EMPTY_BRAND_CONTRACT };
}

export async function putBrandContract(
  brandId: string,
  details: BrandContractDetails,
): Promise<void> {
  const sql = await getSql();
  const hasDetails =
    details.legalName ||
    details.birthDate ||
    details.registrationNumber ||
    details.phone ||
    details.address ||
    details.signature;
  await sql.query(
    "update hypeup_brand_account set contract_cipher = $2 where brand_id = $1",
    [brandId, hasDetails ? encryptToken(JSON.stringify(details)) : null],
  );
}
