let
  # Rolling updates, not deterministic.
  pkgs = import (fetchTarball("channel:nixos-25.11")) {};
in
pkgs.callPackage (
  {
    mkShell,
    nodejs_22,
  }:
  mkShell {
    strictDeps = true;
    nativeBuildInputs = [
      nodejs_22
    ];
  }
) { }
