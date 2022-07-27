{ pkgs ? import <nixpkgs> {}}:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    nodejs
    yarn
    nodePackages.npm
    nodePackages.nodemon
  ];
}