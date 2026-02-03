import { load } from "cheerio";

export interface CommercialOpportunity {
  source: string;
  externalId: string;
  title: string;
  buyer?: string;
  category?: string;
  postedAt?: string | null;
  dueAt?: string | null;
  url: string;
  location?: string;
  summary?: string;
  raw?: Record<string, unknown>;
}

const normalizeText = (value?: string): string | undefined => {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
};

const toIsoDate = (value?: string): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export interface CommercialParserOptions {
  source: string;
  itemSelector: string;
  titleSelector: string;
  linkSelector: string;
  buyerSelector?: string;
  categorySelector?: string;
  postedSelector?: string;
  dueSelector?: string;
  locationSelector?: string;
  summarySelector?: string;
  idAttribute?: string;
  baseUrl?: string;
}

export const parseCommercialHtml = (html: string, options: CommercialParserOptions): CommercialOpportunity[] => {
  const $ = load(html);
  const items = $(options.itemSelector);
  const results: CommercialOpportunity[] = [];

  items.each((index, element) => {
    const item = $(element);
    const title = normalizeText(item.find(options.titleSelector).text());
    const linkElement = item.find(options.linkSelector).first();
    const rawHref = linkElement.attr("href") ?? "";
    const href = options.baseUrl ? new URL(rawHref, options.baseUrl).toString() : rawHref;
    const externalId =
      linkElement.attr(options.idAttribute ?? "data-id") ??
      rawHref.split("/").pop() ??
      `${options.source}-${index}`;

    if (!title || !href) {
      return;
    }

    results.push({
      source: options.source,
      externalId,
      title,
      buyer: normalizeText(item.find(options.buyerSelector ?? "").text()),
      category: normalizeText(item.find(options.categorySelector ?? "").text()),
      postedAt: toIsoDate(normalizeText(item.find(options.postedSelector ?? "").text())),
      dueAt: toIsoDate(normalizeText(item.find(options.dueSelector ?? "").text())),
      url: href,
      location: normalizeText(item.find(options.locationSelector ?? "").text()),
      summary: normalizeText(item.find(options.summarySelector ?? "").text()),
      raw: {
        index,
        href: rawHref
      }
    });
  });

  return results;
};

export const sampleUsage = (): void => {
  const mockHtml = `
    <ul class="opportunities">
      <li class="item">
        <a class="title" href="/opp/123">IT Support Services</a>
        <span class="buyer">Acme Corp</span>
        <span class="category">IT</span>
        <span class="posted">2024-05-01</span>
        <span class="due">2024-06-01</span>
        <span class="location">Remote</span>
        <p class="summary">Provide help desk and infrastructure support.</p>
      </li>
    </ul>
  `;

  const results = parseCommercialHtml(mockHtml, {
    source: "acme-marketplace",
    itemSelector: ".item",
    titleSelector: ".title",
    linkSelector: ".title",
    buyerSelector: ".buyer",
    categorySelector: ".category",
    postedSelector: ".posted",
    dueSelector: ".due",
    locationSelector: ".location",
    summarySelector: ".summary",
    baseUrl: "https://example.com"
  });

  console.info("[commercial] parsed opportunities", results);
};

if (process.env.NODE_ENV !== "production") {
  sampleUsage();
}
