/*
  Loon standalone resource parser
  Purpose: prepend a fixed prefix to node names without relying on plugin arguments.

  Usage:
  1. Change PREFIX below.
  2. Host this file at a raw .js URL.
  3. Use that raw .js URL in the subscription's Resource Parser field.
*/

const PREFIX = "主力-";

function text(v) {
  return v == null ? "" : String(v);
}

function normalize(s) {
  s = text(s);
  if (s && s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function done(content) {
  $done(content);
}

function decodeBase64Unicode(s) {
  try {
    const binary = atob(s);
    let out = "";
    for (let i = 0; i < binary.length; i++) {
      out += "%" + ("00" + binary.charCodeAt(i).toString(16)).slice(-2);
    }
    return decodeURIComponent(out);
  } catch (e) {
    return null;
  }
}

function looksLikeBase64(s) {
  const compact = text(s).replace(/\s+/g, "");
  if (!compact || compact.length < 16) return false;
  if (compact.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=]+$/.test(compact);
}

function addPrefix(name) {
  name = text(name).trim();
  if (!name) return name;
  if (name.startsWith(PREFIX)) return name;
  return PREFIX + name;
}

function processLoonNodes(raw) {
  const lines = normalize(raw).split("\n");
  const out = [];

  for (const original of lines) {
    const line = original.trim();
    if (!line || line.startsWith("#")) {
      out.push(original);
      continue;
    }

    const eq = original.indexOf("=");
    if (eq <= 0) {
      out.push(original);
      continue;
    }

    const name = original.slice(0, eq).trim();
    const rest = original.slice(eq + 1).trim();
    out.push(addPrefix(name) + " = " + rest);
  }

  return out.join("\n");
}

function processUriList(raw) {
  const compact = text(raw).replace(/\s+/g, "");
  const decoded = decodeBase64Unicode(compact);
  if (!decoded) return null;

  const lines = normalize(decoded).split("\n");
  const out = [];

  for (const item of lines) {
    const line = item.trim();
    if (!line) continue;

    const hash = line.lastIndexOf("#");
    if (hash > -1 && hash < line.length - 1) {
      const left = line.slice(0, hash + 1);
      const frag = line.slice(hash + 1);
      let name = frag;
      try {
        name = decodeURIComponent(frag);
      } catch (e) {}
      out.push(left + encodeURIComponent(addPrefix(name)));
      continue;
    }

    const m = line.match(/[?&]remark=([^&#]*)/);
    if (m) {
      let name = m[1];
      try {
        name = decodeURIComponent(name);
      } catch (e) {}
      out.push(line + "#" + encodeURIComponent(addPrefix(name)));
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function stripQuotes(v) {
  v = text(v).trim();
  if (!v) return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function processClashYaml(raw) {
  const input = normalize(raw);
  if (!/^\s*proxies\s*:/m.test(input)) return null;

  const lines = input.split("\n");
  const out = [];
  let inProxies = false;
  let baseIndent = -1;
  let currentIndent = -1;

  for (const original of lines) {
    const trimmed = original.trim();
    const indent = (original.match(/^\s*/) || [""])[0].length;

    if (!inProxies) {
      if (/^proxies\s*:\s*$/.test(trimmed)) {
        inProxies = true;
        baseIndent = indent;
      }
      out.push(original);
      continue;
    }

    if (indent <= baseIndent && /^[A-Za-z0-9_-]+\s*:/.test(trimmed) && !/^- /.test(trimmed)) {
      inProxies = false;
      out.push(original);
      continue;
    }

    if (/^\s*-\s+name\s*:/.test(original)) {
      currentIndent = indent;
      const m = original.match(/^(\s*-\s+name\s*:\s*)(.*)$/);
      if (m) {
        out.push(m[1] + addPrefix(stripQuotes(m[2])));
        continue;
      }
    }

    if (currentIndent >= 0 && indent > currentIndent) {
      const m = original.match(/^(\s*name\s*:\s*)(.*)$/);
      if (m) {
        out.push(m[1] + addPrefix(stripQuotes(m[2])));
        continue;
      }
    }

    out.push(original);
  }

  return out.join("\n");
}

try {
  const raw = typeof $resource !== "undefined" ? normalize($resource) : "";
  const trimmed = raw.trim();
  if (!trimmed) {
    done("");
  } else if (looksLikeBase64(trimmed)) {
    const result = processUriList(trimmed);
    done(result == null ? raw : result);
  } else {
    const yamlResult = processClashYaml(trimmed);
    if (yamlResult != null) done(yamlResult);
    else done(processLoonNodes(trimmed));
  }
} catch (e) {
  console.log("standalone prefix parser error: " + e);
  done(typeof $resource !== "undefined" ? $resource : "");
}
