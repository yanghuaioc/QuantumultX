/*
Loon 纯资源解析器：给所有节点名前加前缀
用法：把这个 js 作为 subscription 的 resource parser
*/

const PREFIX = "备mjj-"; // 改成你想加的前缀

function done(content) {
  $done(content);
}

function addPrefixToLoonNodes(content) {
  const lines = String(content).replace(/\r/g, "").split("\n");
  const out = [];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) {
      out.push(line);
      continue;
    }

    const idx = line.indexOf("=");
    if (idx === -1) {
      out.push(line);
      continue;
    }

    const name = line.slice(0, idx).trim();
    const rest = line.slice(idx + 1);
    out.push(`${PREFIX}${name} =${rest}`);
  }

  return out.join("\n");
}

try {
  const type = typeof $resourceType !== "undefined" ? $resourceType : 1;
  const resource = typeof $resource !== "undefined" ? $resource : "";

  if (type === 1) {
    done(addPrefixToLoonNodes(resource));
  } else {
    done(String(resource));
  }
} catch (e) {
  console.log("prefix parser error: " + e);
  done(typeof $resource !== "undefined" ? $resource : "");
}
