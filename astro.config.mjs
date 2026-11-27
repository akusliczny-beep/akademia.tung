// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync, readFileSync } from "node:fs";
import { loadEnv } from "vite";

const { SITE_URL = "https://tung.sliczny-tcm.pl" } = loadEnv(
  process.env.NODE_ENV ?? "production",
  process.cwd(),
  "SITE_URL",
);
const site = new URL(SITE_URL);
if (
  !["http:", "https:"].includes(site.protocol) ||
  site.pathname !== "/" ||
  site.search ||
  site.hash ||
  site.username ||
  site.password
) {
  throw new Error(
    "SITE_URL must be an HTTP(S) origin, such as https://example.com, without a path, credentials, query, or fragment.",
  );
}

/** @type {Map<string, Date>} */
const lastModified = new Map();
for (const lang of ["pl"]) {
  const dir = `./src/content/posts/${lang}`;
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const frontmatter = readFileSync(`${dir}/${file}`, "utf8").split("---")[1];
    if (/^draft:\s*true/m.test(frontmatter)) continue;
    const date =
      /^updated:\s*(\S+)/m.exec(frontmatter)?.[1] ??
      /^date:\s*(\S+)/m.exec(frontmatter)?.[1];
    if (!date) continue;
    lastModified.set(
      `/posts/${file.replace(/\.md$/, "")}/`,
      new Date(date),
    );
  }
}

const newest = () =>
  [...lastModified]
    .map(([, date]) => date)
    .sort((a, b) => b.valueOf() - a.valueOf())[0];

export default defineConfig({
  site: site.href,
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  build: { inlineStylesheets: "always" },
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  experimental: { clientPrerender: true },
  integrations: [
    vue(),
    sitemap({
      i18n: { defaultLocale: "pl", locales: { pl: "pl-PL" } },
      filter: (page) =>
        !["/404/", "/404.html"].includes(new URL(page).pathname),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const listing = /^\/(posts\/)?$/.exec(path);
        const date = listing ? newest() : lastModified.get(path);
        return date ? { ...item, lastmod: date.toISOString() } : item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
