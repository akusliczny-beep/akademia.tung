import type { APIRoute } from "astro";
import { getPersonalInfo, getSiteInfo } from "../config";
import { categoryLabel } from "../data/post-options";
import { defaultLanguage, localizePath, translate } from "../i18n";
import { getPostId, getPosts } from "../lib/posts";

// Plain-text site summary for AI search engines (https://llmstxt.org).
export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const siteInfo = getSiteInfo(defaultLanguage);
  const personalInfo = getPersonalInfo(defaultLanguage);
  const posts = (await getPosts(defaultLanguage)).map(
    (post) =>
      `- [${post.data.title}](${url(localizePath(defaultLanguage, `/posts/${getPostId(post)}/`))}): ${categoryLabel(defaultLanguage, post.data.category)}. ${post.data.description}`,
  );
  const section = [
    `## ${translate(defaultLanguage, "nav.posts")}`,
    "",
    ...posts,
    "",
    `- [${translate(defaultLanguage, "nav.about")}](${url(localizePath(defaultLanguage, "/about/"))}): ${translate(defaultLanguage, "meta.aboutDescription")}`,
    `- [${translate(defaultLanguage, "nav.projects")}](${url(localizePath(defaultLanguage, "/projects/"))}): ${translate(defaultLanguage, "meta.projectsDescription")}`,
    `- [RSS](${url(localizePath(defaultLanguage, "/rss.xml"))})`,
  ].join("\n");

  const body = [
    `# ${siteInfo.title}`,
    "",
    `> ${siteInfo.description}`,
    "",
    `${personalInfo.name} · ${personalInfo.role} · ${personalInfo.github}`,
    "",
    section,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
