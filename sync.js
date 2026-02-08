const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

(async () => {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { property: "Status", select: { equals: "Published" } },
  });

  for (const page of response.results) {
    const title = page.properties.Title.title[0].plain_text;
    const date = page.properties.Date.date.start;
    const slug = page.properties.Slug.rich_text[0]?.plain_text || title;
    
    // 1. 转换正文
    const mdblocks = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdblocks);

    // 2. 准备 Hugo Front-matter
    const content = `---
title: "${title}"
date: ${date}
slug: "${slug}"
---

${mdString.parent}`;

    // 3. 保存文件
    fs.writeFileSync(path.join("content/posts", `${slug}.md`), content);
    console.log(`Synced: ${title}`);
  }
})();
