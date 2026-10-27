{
  craneLib,
  lib,
  tailwindcss_4,
  esbuild,
  lightningcss,
}:
import ./stela-shelf.nix {
  inherit
    craneLib
    lib
    tailwindcss_4
    esbuild
    lightningcss
    ;
  features = [ "embedded-search" ];
}
