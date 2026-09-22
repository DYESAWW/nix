{
  nixConfig = {
    extra-substituters = [
      "https://noctalia.cachix.org"
      "https://ezkea.cachix.org"
    ];
    extra-trusted-public-keys = [
      "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4="
      "ezkea.cachix.org-1:ioBmUbJTZIKsHmWWXPe1FSFbeVe+afhfgqgTSNd34eI="
    ];
  };

  inputs = {
    nixpkgs-python310.url = "github:NixOS/nixpkgs/b122cf0";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    spicetify-nix = {
      url = "github:Gerg-L/spicetify-nix";
    };

    zen-browser = {
      url = "github:0xc000022070/zen-browser-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    noctalia = {
      url = "github:noctalia-dev/noctalia/cachix";
    };

    noctalia-greeter = {
      url = "github:noctalia-dev/noctalia-greeter";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    aagl = {
      url = "github:ezKEa/aagl-gtk-on-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ self, nixpkgs, home-manager, ... }: {
    nixosConfigurations.DYESAW-PC = nixpkgs.lib.nixosSystem {
      specialArgs = { inherit inputs; };
      modules = [
        { nixpkgs.hostPlatform = "x86_64-linux"; }
        ./configuration.nix
        ./noctalia.nix
        inputs.noctalia-greeter.nixosModules.default
        inputs.aagl.nixosModules.default
        home-manager.nixosModules.home-manager
        {
          # aagl: Cachix + launcher(s)
          nix.settings = inputs.aagl.nixConfig;
          # programs.anime-game-launcher.enable = true;
          # programs.anime-games-launcher.enable = true;
          programs.honkers-railway-launcher.enable = true;
          # programs.honkers-launcher.enable = true;
          # programs.wavey-launcher.enable = true;
          # programs.sleepy-launcher.enable = true;
        }
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.extraSpecialArgs = { inherit inputs; };
          home-manager.users.DYESAW = {
            imports = [
              inputs.spicetify-nix.homeManagerModules.spicetify
              ./home.nix
            ];
          };
        }
      ];
    };
  };
}