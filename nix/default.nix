{
  flake-parts,
  ...
}@inputs:
flake-parts.lib.mkFlake { inherit inputs; } {
  systems = [
    "x86_64-linux"
    "aarch64-linux"
    "aarch64-darwin"
  ];
  imports = [
    inputs.treefmt-nix.flakeModule
  ];

  perSystem =
    { pkgs, ... }:
    let
      system = pkgs.stdenv.hostPlatform.system;
      craneLib = inputs.crane.mkLib pkgs;
      sisho = inputs.sisho.packages.${system};
    in
    {
      packages = rec {
        default = stela-shelf;
        stela-shelf = pkgs.callPackage ./pkgs/stela-shelf.nix { inherit craneLib; };
        stela-shelf-embedded-search = pkgs.callPackage ./pkgs/stela-shelf-embedded-search.nix {
          inherit craneLib;
        };

        # What CI builds and sends to Cachix (.github/workflows/nix-ci.yml).
        ci = pkgs.linkFarm "ci" [
          {
            name = "stela-shelf";
            path = stela-shelf;
          }
          {
            name = "stela-shelf-embedded-search";
            path = stela-shelf-embedded-search;
          }
        ];
      };

      devShells.default = pkgs.callPackage ./dev.nix {
        inherit inputs;
        fenix = inputs.fenix.packages.${system};
        stela-shelf = pkgs.callPackage ./pkgs/stela-shelf.nix { inherit craneLib; };
        tools = inputs.sisho.legacyPackages.${system}.combine [
          sisho.sisho
          sisho.tomet
          sisho.tomet-lsp
          sisho.twrit
          sisho.catasto
        ];
      };

      treefmt = import ./formatter.nix {
        inherit (sisho) tomet;
      };
    };
}
