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
