import { readFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { writeFile } from "fs/promises";

const PORT = 3001;
const Datafile = path.join("data", "links.json");

const serveFile = async (res, filePath, ContentType) => {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": ContentType });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Page not found");
  }
};

const loadlinks = async () => {
  try {
    const data = await readFile(Datafile, "utf-8");
    console.log("File content:", data);
    return JSON.parse(data || "{}");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(Datafile, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const savelinks = async (links) => {
  await writeFile(Datafile, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/") {
      return serveFile(res, path.join("public", "index.html"), "text/html");
    } else if (req.url === "/style.css") {
      return serveFile(res, path.join("public", "style.css"), "text/css");
    } else if (req.url === "/links") {
      const links = await loadlinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } else {
      const links = await loadlinks();
      const shortcode = req.url.slice(1)
      console.log("link redirect",req.url);
      if(links[shortcode]){
        res.writeHead(302,{location:links[shortcode]})
        return res.end()
      }
      res.writeHead(404,{"Content-Type": "text/plain"})
      return res.end("shortend URL is not found")
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadlinks();

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      console.log(body);
      const { url, shortcode } = JSON.parse(body);
      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required");
      }

      const finalshortcode = shortcode || crypto.randomBytes(4).toString("hex");
      if (links[finalshortcode]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("short code already exist.Please choose another");
      }
      links[finalshortcode] = url;
      await savelinks(links);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, shortcode: finalshortcode }));
    });
  }
});

server.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
