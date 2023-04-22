const {ConfigBuilder} = require("./engine/config");
let builder = new ConfigBuilder();

builder.add_module("Helix", [
    "./src/core"
]).add_loader("./src/core/helix.ts");

builder.create_build_queue("all")
    .compile_module("Helix")
    .done();

exports.default = builder.build();