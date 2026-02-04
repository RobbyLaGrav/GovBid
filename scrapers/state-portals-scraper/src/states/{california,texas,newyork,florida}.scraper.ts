import { CheerioAPI } from "cheerio";
import { BaseStateScraper, StatePortalOpportunity } from "../base.scraper.js";

const parseTableRows = ($: CheerioAPI, selector: string, mapper: (row: CheerioAPI, index: number) => StatePortalOpportunity | null) => {
  const rows = $(selector);
  const results: StatePortalOpportunity[] = [];
  rows.each((index, element) => {
    const row = $(element);
    const mapped = mapper(row, index);
    if (mapped) {
      results.push(mapped);
    }
  });
  return results;
};

export class CaliforniaScraper extends BaseStateScraper {
  constructor() {
    super({
      baseUrl: "https://caleprocure.ca.gov",
      listPath: "/eventsearch",
      detailPath: "/event/:id",
      stateCode: "CA"
    });
  }

  protected parseList($: CheerioAPI): StatePortalOpportunity[] {
    return parseTableRows($, "table tbody tr", (row) => {
      const link = row.find("a").first();
      const externalId = link.attr("href")?.split("/").pop() ?? "";
      if (!externalId) return null;

      return {
        source: "CA",
        externalId,
        title: link.text().trim(),
        agency: row.find("td").eq(1).text().trim(),
        status: row.find("td").eq(2).text().trim(),
        postedAt: row.find("td").eq(3).text().trim(),
        dueAt: row.find("td").eq(4).text().trim(),
        url: `${this.options.baseUrl}${link.attr("href") ?? ""}`
      };
    });
  }
}

export class TexasScraper extends BaseStateScraper {
  constructor() {
    super({
      baseUrl: "https://apps.tx.gov",
      listPath: "/cpa/opportunites",
      detailPath: "/cpa/opportunities/:id",
      stateCode: "TX"
    });
  }

  protected parseList($: CheerioAPI): StatePortalOpportunity[] {
    return parseTableRows($, ".opportunity-row", (row) => {
      const link = row.find("a").first();
      const href = link.attr("href") ?? "";
      const externalId = href.split("=").pop() ?? "";
      if (!externalId) return null;

      return {
        source: "TX",
        externalId,
        title: link.text().trim(),
        agency: row.find(".agency").text().trim(),
        status: row.find(".status").text().trim(),
        postedAt: row.find(".posted-date").text().trim(),
        dueAt: row.find(".due-date").text().trim(),
        url: `${this.options.baseUrl}${href}`
      };
    });
  }
}

export class NewYorkScraper extends BaseStateScraper {
  constructor() {
    super({
      baseUrl: "https://ogs.ny.gov",
      listPath: "/procurement-opportunities",
      detailPath: "/procurement-opportunities/:id",
      stateCode: "NY"
    });
  }

  protected parseList($: CheerioAPI): StatePortalOpportunity[] {
    return parseTableRows($, ".views-row", (row, index) => {
      const link = row.find("a").first();
      const href = link.attr("href") ?? "";
      const externalId = href.split("/").pop() ?? `${index}`;
      const title = link.text().trim();
      if (!title) return null;

      return {
        source: "NY",
        externalId,
        title,
        agency: row.find(".field--name-field-agency").text().trim(),
        status: row.find(".field--name-field-status").text().trim(),
        postedAt: row.find(".field--name-field-post-date").text().trim(),
        dueAt: row.find(".field--name-field-due-date").text().trim(),
        url: `${this.options.baseUrl}${href}`
      };
    });
  }
}

export class FloridaScraper extends BaseStateScraper {
  constructor() {
    super({
      baseUrl: "https://vendor.myflorida.com",
      listPath: "/eprocure/notice_list",
      detailPath: "/eprocure/notice/:id",
      stateCode: "FL"
    });
  }

  protected parseList($: CheerioAPI): StatePortalOpportunity[] {
    return parseTableRows($, "#notices table tbody tr", (row) => {
      const link = row.find("a").first();
      const href = link.attr("href") ?? "";
      const externalId = href.split("/").pop() ?? "";
      if (!externalId) return null;

      return {
        source: "FL",
        externalId,
        title: link.text().trim(),
        agency: row.find("td").eq(1).text().trim(),
        status: row.find("td").eq(2).text().trim(),
        postedAt: row.find("td").eq(3).text().trim(),
        dueAt: row.find("td").eq(4).text().trim(),
        url: `${this.options.baseUrl}${href}`
      };
    });
  }
}
