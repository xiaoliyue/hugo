const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 配置 notion-to-md 使用原生的 URL 链接
const n2m = new NotionToMarkdown({ 
  notionClient: notion,
  config: {
    parseChildPages: false, // 避免无限递归
  }
});

(async () => {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { property: "Status", select: { equals: "Published" } },
  });

  for (const page of response.results) {
    // 提取属性 (保持不变)
    const title = page.properties.Title?.title[0]?.plain_text || "Untitled";
    const date = page.properties.Date?.date?.start || new Date().toISOString();
    const slug = page.properties.Slug?.rich_text[0]?.plain_text || page.id;
    
    // 关键：转换页面为 Markdown，此时图片会以 Notion 托管的 S3 URL 形式存在
    const mdblocks = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdblocks);

    const content = `---
title: "${title}"
date: ${date}
slug: "${slug}"
lastmod: ${new Date().toISOString()}
---

${mdString.parent}`;

    // 确保目录存在
    if (!fs.existsSync("content/posts")) fs.mkdirSync("content/posts", { recursive: true });
    
    fs.writeFileSync(path.join("content/posts", `${slug}.md`), content);
    console.log(`✅ 已同步并生成 URL 引用: ${title}`);
  }
})();
