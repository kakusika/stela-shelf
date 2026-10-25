{
  craneLib,
  lib,
  tailwindcss,
  esbuild,
}:
import ./stela-shelf.nix {
  inherit
    craneLib
    lib
    tailwindcss
    esbuild
    ;
  features = [ "embedded-search" ];
}
