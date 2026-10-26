{
  craneLib,
  lib,
  tailwindcss,
  esbuild,
  features ? [ ],
}:
let
  root = ../..;

  src = lib.fileset.toSource {
    inherit root;
    fileset = lib.fileset.unions [
      (craneLib.fileset.commonCargoSources root)
      (root + "/crates/stela-shelf-assets/frontend")
      (root + "/crates/stela-shelf-assets/templates")
      (root + "/crates/stela-shelf-webcomponents/frontend")
      (root + "/crates/stela-shelf-webcomponents/templates")
      (root + "/crates/stela-shelf-htmx/assets")
      (root + "/crates/stela-shelf-htmx/templates")
      (root + "/crates/stela-shelf-svelte/assets")
      (root + "/crates/stela-shelf-svelte/templates")
      (root + "/crates/stela-shelf-solid/assets")
      (root + "/crates/stela-shelf-solid/templates")
    ];
  };

  commonArgs = {
    inherit src;
    pname = "stela-shelf";
    version = "0.1.0";
    nativeBuildInputs = [
      tailwindcss
      esbuild
    ];
    cargoExtraArgs =
      "-p stela-shelf-cli"
      + lib.optionalString (features != [ ]) " --features ${lib.concatStringsSep "," features}";
  };

  cargoArtifacts = craneLib.buildDepsOnly commonArgs;
in
craneLib.buildPackage (
  commonArgs
  // {
    inherit cargoArtifacts;

    doCheck = false;
  }
)
