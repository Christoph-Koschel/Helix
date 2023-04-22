const {ConfigBuilder, PLUGINS} = require("./engine/config");
let builder = new ConfigBuilder();

builder.add_module("Helix", [
    "./src/core",
    "./src/lang",
])
    .add_loader("./src/core/helix.ts")
    .use(PLUGINS.UTILS.SHEBANG)
    .use(PLUGINS.UTILS.MINIFIER);

builder.create_build_queue("all")
    .compile_module("Helix")
    .copy("./package.json", "./out/")
    .done();

exports.default = builder.build();