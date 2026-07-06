async function operator(proxies = [], targetPlatform, context) {
  function str(v) {
    return v == null ? "" : String(v);
  }

  function getArgs() {
    const args = typeof $arguments === "object" && $arguments ? $arguments : {};
    return args;
  }

  function getPrefix() {
    const args = getArgs();

    // 推荐写法: key=prefix, value=备mjj
    let prefix =
      args.prefix ??
      args.pre ??
      args.value ??
      "";

    prefix = str(prefix).trim();

    return prefix;
  }

  const prefix = getPrefix();

  return proxies.map((proxy) => {
    const rawName = str(proxy.name).trim();
    if (!rawName) return proxy;

    // 防止重复添加
    if (prefix && !rawName.startsWith(prefix)) {
      proxy.name = `${prefix}${rawName}`;
    }

    return proxy;
  });
}
