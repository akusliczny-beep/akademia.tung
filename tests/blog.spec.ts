import { test, expect } from "@playwright/test";
import { ogLocales, useTranslations } from "../src/i18n";
import settings from "../src/site.config.json" with { type: "json" };

const language = "pl";
const t = useTranslations(language);

test("Home categories and URL state after reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".post-feed")).toHaveAttribute(
    "data-ready",
    "true",
  );
  for (const category of ["guides", "notes", "stories"] as const) {
    await page
      .getByRole("button", { name: t(`category.${category}`), exact: true })
      .click();
    await expect(
      page.locator(`.post-card:not([data-category="${category}"])`),
    ).toHaveCount(0);
  }
  await expect(page).toHaveURL(/category=stories/);
  await page.reload();
  await expect(
    page.locator('.post-card[data-category="stories"]'),
  ).toHaveCount(1);
});

test("Tags, month archives, and an unknown category", async ({ page }) => {
  await page.goto("/posts/?category=missing&page=-5");
  await expect(page.getByText(t("post.emptyTitle"))).toBeVisible();
  await page.getByRole("button", { name: t("post.viewAll") }).click();
  await expect(page.locator(".post-card").first()).toBeVisible();
});

test("Search, empty results, and focus restoration", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".post-feed")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const opener = page.getByRole("button", {
    name: t("nav.search"),
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page
    .getByRole("searchbox", { name: t("search.keywords") })
    .fill("Tung");
  await expect(dialog.locator(".search-result").first()).toBeVisible();
  await page
    .getByRole("searchbox", { name: t("search.keywords") })
    .fill("no-such-post-9876");
  await expect(dialog.getByText(t("search.emptyTitle"))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page
    .getByRole("searchbox", { name: t("search.keywords") })
    .fill("Tung");
  await dialog.locator(".search-result").first().click();
  await expect(page).toHaveURL(/\/posts\//);
  await expect(page.locator("#article-body")).toBeVisible();
});

test("Theme persistence across reloads and pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".post-feed")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("button", { name: t("nav.dark") }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveCSS("filter", "none");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/about/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: t("nav.light") }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("Blocked storage: themes still switch without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value: () => {
        throw new Error("Storage blocked");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("Storage blocked");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".post-feed")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("button", { name: t("nav.dark") }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(errors).toEqual([]);
});

test("Page layouts, assets, and browser errors", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const path of [
    "/",
    "/posts/",
    "/projects/",
    "/about/",
    "/posts/wprowadzenie-do-akupunktury-tunga/",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const size = await page.evaluate(() => ({
      width: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(size.content, path).toBeLessThanOrEqual(size.width);
    await page.evaluate(async () => {
      scrollTo(0, document.body.scrollHeight);
      await Promise.all(
        [...document.images]
          .filter((image) => image.getClientRects().length > 0)
          .map((image) => image.decode().catch(() => {})),
      );
      scrollTo(0, 0);
    });
    const broken = await page.locator("img").evaluateAll((images) =>
      images
        .filter((image) => image.getClientRects().length > 0)
        .filter((image) => {
          try {
            return (
              new URL((image as HTMLImageElement).src, location.href).origin ===
              location.origin
            );
          } catch {
            return false;
          }
        })
        .filter(
          (image) =>
            !(image as HTMLImageElement).complete ||
            (image as HTMLImageElement).naturalWidth === 0,
        )
        .map((image) => image.getAttribute("src")),
    );
    expect(broken).toEqual([]);
  }
  if (isMobile) {
    await page.getByRole("button", { name: t("nav.openMenu") }).click();
    await expect(
      page.getByRole("navigation", { name: t("nav.main") }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: t("nav.main") })
      .getByRole("link", { name: t("nav.projects") })
      .click();
    await expect(page).toHaveURL(/projects/);
  }
  expect(errors).toEqual([]);
});

test("Sitemap, RSS, and 404", async ({ page, request }) => {
  const feed = await request.get("/rss.xml");
  expect(feed.status()).toBe(200);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
  const response = await page.goto("/a-page-that-does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.getByText(t("error.heading"))).toBeVisible();
});

test("Configured language, localized search, metadata, and local fonts", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator(".post-feed")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(page).toHaveTitle(
    `${settings.site.name}${t("site.titleSuffix")}`,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    ogLocales[language],
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    t("site.description"),
  );
  await expect(page.locator("h1")).toHaveText(t("hero.title"));

  const rss = await (await request.get("/rss.xml")).text();
  const feedInfo = await page.evaluate((source) => {
    const xml = new DOMParser().parseFromString(source, "application/xml");
    return {
      language: xml.querySelector("channel > language")?.textContent,
      title: xml.querySelector("item > title")?.textContent,
    };
  }, rss);
  expect(feedInfo.language).toBe(language);
});

test("Profile page and unique descriptions", async ({ page }) => {
  await page.goto("/about/");
  const descriptions = new Set<string | null>();
  for (const path of ["/", "/posts/", "/about/", "/projects/"]) {
    await page.goto(path);
    descriptions.add(
      await page.locator('meta[name="description"]').getAttribute("content"),
    );
  }
  expect(descriptions.size).toBe(4);
});
